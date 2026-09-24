import "dotenv/config";

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import authRoutes from './authRoutes';
import { setupVite, serveStatic, log } from "./vite";
import { pool } from "./db";
import { storage } from "./storage";

const app = express();
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: false, limit: '5mb' }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Ensure free_chats table exists (safe to run on every startup)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS free_chats (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id VARCHAR NOT NULL REFERENCES users(id),
      professional_id INTEGER NOT NULL REFERENCES professionals(id),
      started_at TIMESTAMP,
      expires_at TIMESTAMP,
      is_expired BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE UNIQUE INDEX IF NOT EXISTS free_chats_client_professional_idx
      ON free_chats(client_id, professional_id);
  `).catch((err) => console.warn("free_chats migration note:", err.message));

  // Ensure notifications table exists
  await pool.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id VARCHAR NOT NULL REFERENCES users(id),
      type VARCHAR NOT NULL,
      title VARCHAR NOT NULL,
      message TEXT NOT NULL,
      booking_id UUID,
      is_read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON notifications(user_id);
    CREATE INDEX IF NOT EXISTS notifications_booking_id_type_idx ON notifications(booking_id, type);
  `).catch((err) => console.warn("notifications migration note:", err.message));

  // Ensure help_messages table exists
  await pool.query(`
    CREATE TABLE IF NOT EXISTS help_messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id VARCHAR NOT NULL REFERENCES users(id),
      sender_id VARCHAR NOT NULL REFERENCES users(id),
      content TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS help_messages_user_id_idx ON help_messages(user_id);
  `).catch((err) => console.warn("help_messages migration note:", err.message));

  // Beta: set all service prices to $25 and all professional service prices to $25
  if (process.env.BETA_MODE === "true") {
    await pool.query(`UPDATE services SET base_price = '25.00'`)
      .catch((err) => console.warn("Beta price update (services) note:", err.message));
    await pool.query(`UPDATE professional_services SET price = '25.00'`)
      .catch((err) => console.warn("Beta price update (professional_services) note:", err.message));
    console.log("BETA_MODE: all service prices set to $25");
  }

  // ─── Booking reminder scheduler (runs every 10 minutes) ─────────────────────
  const sendReminders = async () => {
    try {
      const now = new Date();
      const in25h = new Date(now.getTime() + 25 * 60 * 60 * 1000);
      const in23h = new Date(now.getTime() + 23 * 60 * 60 * 1000);
      const in65m = new Date(now.getTime() + 65 * 60 * 1000);
      const in55m = new Date(now.getTime() + 55 * 60 * 1000);

      const { rows: upcoming } = await pool.query<{
        id: string; client_id: string; professional_user_id: string;
        scheduled_at: Date; client_first: string; prof_first: string;
      }>(`
        SELECT b.id, b.client_id, p.user_id AS professional_user_id,
               b.scheduled_at,
               cu.first_name AS client_first, pu.first_name AS prof_first
        FROM bookings b
        JOIN professionals p ON p.id = b.professional_id
        JOIN users cu ON cu.id = b.client_id
        JOIN users pu ON pu.id = p.user_id
        WHERE b.status = 'confirmed'
          AND b.scheduled_at BETWEEN $1 AND $2
      `, [in55m, in25h]);

      for (const row of upcoming) {
        const date = new Date(row.scheduled_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
        const diffMs = new Date(row.scheduled_at).getTime() - now.getTime();
        const is24h = diffMs >= in23h.getTime() - now.getTime() && diffMs <= in25h.getTime() - now.getTime();
        const is1h  = diffMs >= in55m.getTime() - now.getTime() && diffMs <= in65m.getTime() - now.getTime();

        if (is24h) {
          for (const { userId, name, other } of [
            { userId: row.client_id, name: row.client_first || "there", other: row.prof_first || "your professional" },
            { userId: row.professional_user_id, name: row.prof_first || "there", other: row.client_first || "your client" },
          ]) {
            if (!(await storage.notificationExists(row.id, userId, "reminder_24h"))) {
              await storage.createNotification({
                userId, type: "reminder_24h",
                title: "Session Tomorrow",
                message: `Reminder: your session with ${other} is tomorrow at ${date}.`,
                bookingId: row.id,
              });
            }
          }
        }

        if (is1h) {
          for (const { userId, other } of [
            { userId: row.client_id, other: row.prof_first || "your professional" },
            { userId: row.professional_user_id, other: row.client_first || "your client" },
          ]) {
            if (!(await storage.notificationExists(row.id, userId, "reminder_1h"))) {
              await storage.createNotification({
                userId, type: "reminder_1h",
                title: "Session in 1 Hour",
                message: `Your session with ${other} starts in about 1 hour (${date}).`,
                bookingId: row.id,
              });
            }
          }
        }
      }
    } catch (err) {
      console.error("Reminder scheduler error:", err);
    }
  };
  sendReminders(); // run once at startup
  setInterval(sendReminders, 10 * 60 * 1000); // then every 10 minutes

  const server = await registerRoutes(app);

  // Use JSON middleware for auth routes
  app.use('/api/auth', authRoutes);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  app.get('/privacy-policy', (_req: Request, res: Response) => {
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Devn Connect Privacy Policy</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;1,400&family=Inter:wght@400;500;600&display=swap">
<style>
  :root{--bg:#FDF8F2;--surface:#F5EFE6;--border:#DDD5C8;--ink:#1C2B1F;--mid:#5A6E5D;--green:#3A6B47;--blue:#5A9BB8;--accent-bg:#EAF3EC}
  @media(prefers-color-scheme:dark){:root{--bg:#0D1A10;--surface:#152018;--border:#273D2B;--ink:#E8F0E9;--mid:#8FA890;--green:#5DAA72;--blue:#7EB5D6;--accent-bg:#162A1A}}
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  body{background:var(--bg);color:var(--ink);font-family:'Inter',system-ui,sans-serif;font-size:16px;line-height:1.75;min-height:100vh}
  .page{display:grid;grid-template-columns:220px 1fr;max-width:1060px;margin:0 auto;padding:0 24px;gap:0 56px}
  @media(max-width:720px){.page{grid-template-columns:1fr;padding:0 20px}.toc{display:none}}
  header{border-bottom:1px solid var(--border);padding:48px 24px 36px;margin-bottom:48px;grid-column:1/-1}
  .logo-mark{display:inline-flex;align-items:center;gap:10px;margin-bottom:28px;text-decoration:none}
  .logo-d{width:36px;height:36px;background:var(--ink);border-radius:6px;display:flex;align-items:center;justify-content:center}
  .logo-name{font-weight:600;font-size:15px;letter-spacing:.08em;color:var(--ink);text-transform:uppercase}
  .doc-eyebrow{font-size:11px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--green);margin-bottom:12px}
  header h1{font-family:'Lora',Georgia,serif;font-size:clamp(28px,4vw,42px);font-weight:600;line-height:1.2;color:var(--ink);margin-bottom:12px}
  .doc-meta{font-size:13px;color:var(--mid)}
  .toc{padding-top:4px}
  .toc-inner{position:sticky;top:32px}
  .toc-label{font-size:10px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--mid);margin-bottom:14px}
  .toc ul{list-style:none}
  .toc li{margin-bottom:2px}
  .toc a{display:block;font-size:13px;color:var(--mid);text-decoration:none;padding:5px 10px;border-left:2px solid var(--border);transition:color .15s,border-color .15s;line-height:1.4}
  .toc a:hover{color:var(--green);border-color:var(--green)}
  main{padding-bottom:80px}
  .section{margin-bottom:52px;scroll-margin-top:32px}
  .section-num{display:inline-block;font-size:11px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--green);margin-bottom:8px}
  .section h2{font-family:'Lora',Georgia,serif;font-size:22px;font-weight:600;color:var(--ink);margin-bottom:16px;line-height:1.3}
  .section p{color:var(--ink);max-width:65ch;margin-bottom:14px}
  .section p:last-child{margin-bottom:0}
  .section ul,.section ol{max-width:65ch;padding-left:20px;margin-bottom:14px;color:var(--ink)}
  .section li{margin-bottom:6px}
  .callout{background:var(--accent-bg);border-left:3px solid var(--green);border-radius:0 8px 8px 0;padding:16px 20px;margin:20px 0;max-width:65ch;font-size:14px;color:var(--ink)}
  .divider{border:none;border-top:1px solid var(--border);margin:48px 0}
  .contact-box{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:24px 28px;max-width:65ch}
  .contact-box h3{font-family:'Lora',Georgia,serif;font-size:17px;font-weight:600;margin-bottom:8px;color:var(--ink)}
  .contact-box a{color:var(--green);font-weight:500}
  footer{border-top:1px solid var(--border);padding:28px 24px}
  .footer-inner{max-width:1060px;margin:0 auto;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;font-size:13px;color:var(--mid)}
  a{color:var(--green)}
</style>
</head>
<body>
<header>
  <a class="logo-mark" href="/">
    <div class="logo-d">
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M4 3h7c4.4 0 7 2.7 7 8s-2.6 8-7 8H4V3z" fill="#FFE6C7"/>
        <path d="M7 6h4c2.8 0 4.5 1.8 4.5 5S13.8 16 11 16H7V6z" fill="#0D1A10" opacity=".15"/>
        <path d="M11 9l3.5-3.5M14.5 5.5v3.5M14.5 5.5h-3.5" stroke="#3A6B47" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </div>
    <span class="logo-name">Devn Connect</span>
  </a>
  <p class="doc-eyebrow">Legal</p>
  <h1>Privacy Policy</h1>
  <p class="doc-meta">Effective date: May 30, 2026 &nbsp;&middot;&nbsp; Last updated: May 30, 2026</p>
</header>
<div class="page">
  <nav class="toc">
    <div class="toc-inner">
      <p class="toc-label">Contents</p>
      <ul>
        <li><a href="#overview">Overview</a></li>
        <li><a href="#information">Information We Collect</a></li>
        <li><a href="#use">How We Use It</a></li>
        <li><a href="#sharing">Sharing Your Data</a></li>
        <li><a href="#payments">Payments</a></li>
        <li><a href="#retention">Data Retention</a></li>
        <li><a href="#rights">Your Rights</a></li>
        <li><a href="#security">Security</a></li>
        <li><a href="#children">Children</a></li>
        <li><a href="#changes">Policy Changes</a></li>
        <li><a href="#contact">Contact Us</a></li>
      </ul>
    </div>
  </nav>
  <main>
    <section class="section" id="overview">
      <span class="section-num">01</span>
      <h2>Overview</h2>
      <p>Devn Connect (&ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;us&rdquo;) operates a financial services marketplace that connects clients with verified financial professionals. This Privacy Policy explains how we collect, use, and protect your personal information when you use our mobile application and related services.</p>
      <p>By creating an account or using Devn Connect, you agree to the practices described in this policy.</p>
      <div class="callout">We do not sell your personal information to third parties. Ever.</div>
    </section>
    <hr class="divider">
    <section class="section" id="information">
      <span class="section-num">02</span>
      <h2>Information We Collect</h2>
      <p><strong>Account information</strong> &mdash; When you register, we collect your first name, last name, email address, and password (stored as an encrypted hash).</p>
      <p><strong>Profile information</strong> &mdash; Professionals may provide a professional title, bio, years of experience, certifications, and the services they offer. Clients may upload a profile photo.</p>
      <p><strong>Booking information</strong> &mdash; When you book a session, we collect details about the appointment including date, time, duration, and service type.</p>
      <p><strong>Payment information</strong> &mdash; Payment card details are processed directly by Stripe. We do not store card numbers or CVVs on our servers. We receive only a transaction confirmation and amount.</p>
      <p><strong>Usage data</strong> &mdash; We may collect information about how you interact with the app, such as pages visited and features used, to improve the service.</p>
    </section>
    <hr class="divider">
    <section class="section" id="use">
      <span class="section-num">03</span>
      <h2>How We Use Your Information</h2>
      <p>We use the information we collect to:</p>
      <ul>
        <li>Create and manage your account</li>
        <li>Facilitate bookings between clients and professionals</li>
        <li>Process payments through Stripe</li>
        <li>Send booking confirmations and service-related notifications</li>
        <li>Respond to your support requests</li>
        <li>Improve and maintain the app</li>
        <li>Comply with legal obligations</li>
      </ul>
      <p>We do not use your data for advertising or sell it to data brokers.</p>
    </section>
    <hr class="divider">
    <section class="section" id="sharing">
      <span class="section-num">04</span>
      <h2>Sharing Your Data</h2>
      <p>We share your information only in the following circumstances:</p>
      <ul>
        <li><strong>Between clients and professionals</strong> &mdash; When a booking is made, relevant profile information is shared between the client and the professional to facilitate the session.</li>
        <li><strong>Stripe</strong> &mdash; Payment processing is handled by Stripe, Inc. Your payment data is subject to <a href="https://stripe.com/privacy" target="_blank" rel="noopener">Stripe&rsquo;s Privacy Policy</a>.</li>
        <li><strong>Legal requirements</strong> &mdash; We may disclose information if required by law or in response to valid legal process.</li>
        <li><strong>Business transfers</strong> &mdash; In the event of a merger or acquisition, your data may be transferred as part of that transaction.</li>
      </ul>
    </section>
    <hr class="divider">
    <section class="section" id="payments">
      <span class="section-num">05</span>
      <h2>Payments &amp; Financial Data</h2>
      <p>All payment transactions are processed through <strong>Stripe</strong>, a PCI-DSS compliant payment processor. When you enter your payment details in the app, that information goes directly to Stripe&rsquo;s secure servers &mdash; it never touches our servers.</p>
      <p>We store only the booking amount and a Stripe transaction ID for your records. We do not have access to your full card number, expiry date, or CVV.</p>
    </section>
    <hr class="divider">
    <section class="section" id="retention">
      <span class="section-num">06</span>
      <h2>Data Retention</h2>
      <p>We retain your account data for as long as your account is active. If you delete your account, your personal information is permanently removed from our systems within 30 days, except where we are required to retain it for legal or regulatory purposes.</p>
      <p>Booking records may be retained for up to 7 years for financial record-keeping compliance.</p>
    </section>
    <hr class="divider">
    <section class="section" id="rights">
      <span class="section-num">07</span>
      <h2>Your Rights</h2>
      <p>You have the right to:</p>
      <ul>
        <li><strong>Access</strong> &mdash; Request a copy of the personal data we hold about you</li>
        <li><strong>Correction</strong> &mdash; Update or correct inaccurate information via your profile settings</li>
        <li><strong>Deletion</strong> &mdash; Delete your account and all associated data directly in the app under Profile &rarr; Account Details &rarr; Delete Account</li>
        <li><strong>Portability</strong> &mdash; Request an export of your data in a machine-readable format</li>
        <li><strong>Objection</strong> &mdash; Object to certain processing of your data</li>
      </ul>
      <p>To exercise any of these rights, contact us at the address below.</p>
    </section>
    <hr class="divider">
    <section class="section" id="security">
      <span class="section-num">08</span>
      <h2>Security</h2>
      <p>We take data security seriously. All data is transmitted over HTTPS/TLS encryption. Passwords are hashed using bcrypt and never stored in plain text. Our infrastructure is hosted on Railway with SSL-secured database connections.</p>
      <p>No system is perfectly secure. If you discover a security vulnerability, please contact us immediately at <a href="mailto:brainycodesinc@gmail.com">brainycodesinc@gmail.com</a>.</p>
    </section>
    <hr class="divider">
    <section class="section" id="children">
      <span class="section-num">09</span>
      <h2>Children&rsquo;s Privacy</h2>
      <p>Devn Connect is not intended for users under the age of 18. We do not knowingly collect personal information from children. If you believe a child has provided us with their information, please contact us and we will delete it promptly.</p>
    </section>
    <hr class="divider">
    <section class="section" id="changes">
      <span class="section-num">10</span>
      <h2>Changes to This Policy</h2>
      <p>We may update this Privacy Policy from time to time. When we make material changes, we will notify you through the app or by email. The &ldquo;Last updated&rdquo; date at the top of this page reflects the most recent revision.</p>
      <p>Continued use of Devn Connect after changes are posted constitutes your acceptance of the updated policy.</p>
    </section>
    <hr class="divider">
    <section class="section" id="contact">
      <span class="section-num">11</span>
      <h2>Contact Us</h2>
      <p>If you have questions about this Privacy Policy or how we handle your data, please reach out:</p>
      <div class="contact-box">
        <h3>Devn Connect</h3>
        <p>Email: <a href="mailto:brainycodesinc@gmail.com">brainycodesinc@gmail.com</a></p>
        <p style="margin-top:8px;font-size:14px;color:var(--mid)">We aim to respond to all privacy inquiries within 5 business days.</p>
      </div>
    </section>
  </main>
</div>
<footer>
  <div class="footer-inner">
    <span>&copy; 2026 Devn Connect. All rights reserved.</span>
    <span>Effective May 30, 2026</span>
  </div>
</footer>
</body>
</html>`);
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5050;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();