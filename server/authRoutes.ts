
import { Router, Response } from 'express';
import {
  generateToken,
  hashPassword,
  comparePassword,
  authenticateToken,
  AuthRequest
} from './auth';
import { storage } from './storage';
import crypto from 'crypto';
import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const router = Router();

// Login endpoint - redirect to Replit OAuth
router.get('/login', (req, res: Response) => {
  // For now, redirect to a simple registration form
  // In production, this would redirect to Replit OAuth
  res.redirect('/?auth=login');
});

// Register endpoint
router.post('/register', async (req, res: Response) => {
  try {
    const { email, firstName, lastName, password, role, title, bio, experience, selectedServices } = req.body;

    if (!email || !firstName || !lastName || !password) {
      return res.status(400).json({ 
        message: 'Email, first name, last name, and password are required' 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        message: 'Password must be at least 6 characters long' 
      });
    }

    // Professional validation
    if (role === 'professional') {
      if (!title) {
        return res.status(400).json({ 
          message: 'Professional title is required' 
        });
      }
      if (!selectedServices || !Array.isArray(selectedServices) || selectedServices.length === 0) {
        return res.status(400).json({ 
          message: 'Please select at least one service to offer' 
        });
      }
    }

    // Check if user already exists
    const existingUser = await storage.getUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ message: 'User already exists with this email' });
    }

    // Hash password and create user
    const hashedPassword = await hashPassword(password);
    const newUser = await storage.createUser({
      email,
      firstName,
      lastName,
      password: hashedPassword,
      profileImageUrl: null,
      role: (role || "client") as "client" | "professional",
      stripeCustomerId: null,
      stripeConnectAccountId: null,
    });

    // Create professional profile if needed
    if (role === 'professional') {
      const professional = await storage.createProfessional({
        userId: newUser.id,
        title: title,
        bio: bio || '',
        experience: parseInt(experience) || 0,
      });

      // Create professional-service linkages
      // Use fixed pricing: $99 for 1 hour sessions
      for (const serviceId of selectedServices) {
        await storage.createProfessionalService({
          professionalId: professional.id,
          serviceId: parseInt(serviceId),
          specialtyDescription: '',
          price: '99', // Fixed price for 1 hour session
        });
      }
    }

    // Generate token
    const token = generateToken({
      id: newUser.id,
      email: newUser.email,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      profileImageUrl: newUser.profileImageUrl,
    });

    res.status(201).json({
      user: {
        id: newUser.id,
        email: newUser.email || '',
        firstName: newUser.firstName || '',
        lastName: newUser.lastName || '',
        profileImageUrl: newUser.profileImageUrl || undefined,
        role: newUser.role,
      },
      token,
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Login endpoint
router.post('/login', async (req, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        message: 'Email and password are required' 
      });
    }

    // Find user by email
    const user = await storage.getUserByEmail(email);
    if (!user || !user.password) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Verify password
    const isValidPassword = await comparePassword(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate token
    const token = generateToken({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      profileImageUrl: user.profileImageUrl,
    });

    res.json({
      user: {
        id: user.id,
        email: user.email || '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        profileImageUrl: user.profileImageUrl || undefined,
        role: user.role,
      },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Complete professional profile for existing user
router.post('/complete-profile', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { title, bio, experience, selectedServices } = req.body;

    // Check if user has professional role
    const user = await storage.getUserById(userId);
    if (!user || user.role !== 'professional') {
      return res.status(403).json({ 
        message: 'Only professional users can complete professional profiles' 
      });
    }

    // Check if professional profile already exists
    const existingProfile = await storage.getProfessionalByUserId(userId);
    if (existingProfile) {
      return res.status(409).json({ 
        message: 'Professional profile already exists' 
      });
    }

    // Validate required fields
    if (!title) {
      return res.status(400).json({ 
        message: 'Professional title is required' 
      });
    }
    if (!selectedServices || !Array.isArray(selectedServices) || selectedServices.length === 0) {
      return res.status(400).json({ 
        message: 'Please select at least one service to offer' 
      });
    }

    // Create professional profile
    const professional = await storage.createProfessional({
      userId: userId,
      title: title,
      bio: bio || '',
      experience: parseInt(experience) || 0,
    });

    // Create professional-service linkages
    for (const serviceId of selectedServices) {
      await storage.createProfessionalService({
        professionalId: professional.id,
        serviceId: parseInt(serviceId),
        specialtyDescription: '',
        price: '99', // Fixed price for 1 hour session
      });
    }

    res.status(201).json({
      message: 'Professional profile created successfully',
      professional
    });
  } catch (error) {
    console.error('Complete profile error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get current user endpoint
router.get('/user', authenticateToken, async (req: AuthRequest, res: Response) => {
  const user = req.user!;
  res.json({
    id: user.id,
    email: user.email || '',
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    profileImageUrl: user.profileImageUrl || undefined,
    role: user.role,
  });
});

// Logout endpoint for JWT (simple client-side logout)
router.post('/logout', (req: any, res: Response) => {
  // For JWT, logout is handled client-side by removing the token
  // This endpoint just confirms the logout action
  res.json({ message: 'Logged out successfully' });
});

// Forgot password — generate token and send reset email
router.post('/forgot-password', async (req, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    // Always return 200 so we don't expose whether an email exists
    const user = await storage.getUserByEmail(email);
    if (!user) return res.json({ message: 'If that email exists, a reset link has been sent.' });

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await storage.createPasswordResetToken(user.id, token, expiresAt);

    const appUrl = process.env.APP_URL || 'http://localhost:5050';
    const resetUrl = `${appUrl}/reset-password/${token}`;

    if (resend) {
      await resend.emails.send({
        from: process.env.EMAIL_FROM || 'noreply@devn.app',
        to: email,
        subject: 'Reset your Devn password',
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
            <h2 style="color:#1e40af">Reset your password</h2>
            <p>Hi ${user.firstName || ''},</p>
            <p>We received a request to reset your Devn account password. Click the button below to set a new password. This link expires in <strong>1 hour</strong>.</p>
            <a href="${resetUrl}" style="display:inline-block;margin:16px 0;padding:12px 24px;background:#1e40af;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">Reset Password</a>
            <p style="color:#6b7280;font-size:13px">If you didn't request this, you can safely ignore this email.</p>
          </div>
        `,
      });
    } else {
      // Dev fallback — log the link so it can be tested without email config
      console.log(`[DEV] Password reset link for ${email}: ${resetUrl}`);
    }

    res.json({ message: 'If that email exists, a reset link has been sent.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Reset password — validate token and update password
router.post('/reset-password', async (req, res: Response) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ message: 'Token and password are required' });
    if (password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });

    const resetToken = await storage.getPasswordResetToken(token);
    if (!resetToken) return res.status(400).json({ message: 'Invalid or expired reset link' });
    if (new Date() > resetToken.expiresAt) {
      await storage.deletePasswordResetToken(token);
      return res.status(400).json({ message: 'Reset link has expired. Please request a new one.' });
    }

    const hashedPassword = await hashPassword(password);
    await storage.updateUser(resetToken.userId, { password: hashedPassword });
    await storage.deletePasswordResetToken(token);

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete account endpoint
router.delete('/account', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    
    // Delete the user account (cascade will delete related data)
    await storage.deleteUser(userId);
    
    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ message: 'Failed to delete account' });
  }
});

export default router;