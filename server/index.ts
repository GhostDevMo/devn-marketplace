import "dotenv/config";

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import authRoutes from './authRoutes';
import { setupVite, serveStatic, log } from "./vite";
import { pool } from "./db";

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

  // Beta: set all service prices to $25 and all professional service prices to $25
  if (process.env.BETA_MODE === "true") {
    await pool.query(`UPDATE services SET base_price = '25.00'`)
      .catch((err) => console.warn("Beta price update (services) note:", err.message));
    await pool.query(`UPDATE professional_services SET price = '25.00'`)
      .catch((err) => console.warn("Beta price update (professional_services) note:", err.message));
    console.log("BETA_MODE: all service prices set to $25");
  }

  const server = await registerRoutes(app);

  // Use JSON middleware for auth routes
  app.use('/api/auth', authRoutes);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
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