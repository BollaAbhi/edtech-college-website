const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const User = require('../models/User');
const logEvent = require('../utils/auditLogger');

// Nodemailer setup for sending password reset emails
const sendResetEmail = async (email, resetLink) => {
  let transporter;
  if (process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
      secure: parseInt(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } else {
    console.log('--- MAIL SENDER FALLBACK ACTIVE ---');
    console.log(`Sending password reset link to: ${email}`);
    console.log(`Reset Link: ${resetLink}`);
    console.log('----------------------------------');
    return true;
  }

  const mailOptions = {
    from: process.env.SMTP_FROM || '"EdTech Support" <support@edtech.com>',
    to: email,
    subject: 'Password Reset Request',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #4f46e5; text-align: center;">Password Reset Request</h2>
        <p>You are receiving this email because a password reset request was initiated for your account.</p>
        <p>Click on the button below to reset your password. This link is valid for 15 minutes.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password</a>
        </div>
        <p>If you did not request this, please ignore this email.</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
        <p style="font-size: 12px; color: #64748b; text-align: center;">EdTech Inc. · 123 Education Way</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

// Send password change confirmation email
const sendConfirmationEmail = async (email) => {
  let transporter;
  if (process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
      secure: parseInt(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } else {
    console.log('--- MAIL SENDER FALLBACK ACTIVE ---');
    console.log(`Confirmation email: Your password was changed sent to: ${email}`);
    console.log('----------------------------------');
    return true;
  }

  const mailOptions = {
    from: process.env.SMTP_FROM || '"EdTech Support" <support@edtech.com>',
    to: email,
    subject: 'Your Password Was Changed',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #4f46e5; text-align: center;">Your Password Was Changed</h2>
        <p>This is a confirmation that the password for your account has been successfully updated.</p>
        <p>If you did this, no further action is required.</p>
        <p style="color: #ef4444; font-weight: bold;">If you did NOT change your password, please contact support immediately.</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
        <p style="font-size: 12px; color: #64748b; text-align: center;">EdTech Inc. · 123 Education Way</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

const router = express.Router();

function validatePasswordStrength(password) {
  if (!password || password.length < 8) {
    return 'Password must be at least 8 characters long.';
  }
  if (!/[A-Z]/.test(password)) {
    return 'Password must contain at least one uppercase letter.';
  }
  if (!/[a-z]/.test(password)) {
    return 'Password must contain at least one lowercase letter.';
  }
  if (!/[0-9]/.test(password)) {
    return 'Password must contain at least one number.';
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return 'Password must contain at least one special character.';
  }
  return null;
}

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      await logEvent({
        userEmail: email,
        action: 'LOGIN_FAILED',
        success: false,
        details: 'User not found',
        ipAddress: req.ip
      });
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // Check password expiry (90 days)
    const lastChange = user.lastPasswordChange || user.createdAt || new Date();
    const diffTime = new Date() - new Date(lastChange);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays >= 90) {
      await logEvent({
        userId: user._id,
        userEmail: user.email,
        userRole: user.role,
        action: 'LOGIN_FAILED',
        success: false,
        details: 'Rejected: Password expired',
        ipAddress: req.ip
      });
      return res.status(403).json({ message: 'Password expired', email: user.email });
    }

    // Check if account is locked
    if (user.isLocked) {
      const now = new Date();
      if (user.lockUntil && now > user.lockUntil) {
        // Auto-unlock account if lockout period has expired
        user.isLocked = false;
        user.loginAttempts = 0;
        user.lockUntil = undefined;
        await user.save();
        await logEvent({
          userId: user._id,
          userEmail: user.email,
          userRole: user.role,
          action: 'ACCOUNT_UNLOCK',
          success: true,
          details: 'Account automatically unlocked',
          ipAddress: req.ip
        });
      } else {
        // Still locked
        await logEvent({
          userId: user._id,
          userEmail: user.email,
          userRole: user.role,
          action: 'LOGIN_FAILED',
          success: false,
          details: 'Rejected: Account currently locked',
          ipAddress: req.ip
        });
        return res.status(403).json({ message: 'Account locked for 30 minutes.' });
      }
    }

    // Compare passwords
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      // Track failed attempt
      user.loginAttempts = (user.loginAttempts || 0) + 1;

      // Lock account after 5 failed attempts
      if (user.loginAttempts >= 5) {
        user.isLocked = true;
        user.lockUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes from now
        await user.save();
        await logEvent({
          userId: user._id,
          userEmail: user.email,
          userRole: user.role,
          action: 'ACCOUNT_LOCKOUT',
          success: false,
          details: 'Account locked due to 5 consecutive failed login attempts',
          ipAddress: req.ip
        });
        return res.status(403).json({ message: 'Account locked for 30 minutes.' });
      }

      await user.save();
      await logEvent({
        userId: user._id,
        userEmail: user.email,
        userRole: user.role,
        action: 'LOGIN_FAILED',
        success: false,
        details: `Failed password validation. Attempt #${user.loginAttempts}`,
        ipAddress: req.ip
      });
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // Reset login attempts on successful login
    user.loginAttempts = 0;
    user.isLocked = false;
    user.lockUntil = undefined;

    // Generate JWT with role in payload
    const token = jwt.sign(
      { id: user._id, name: user.name, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    user.activeToken = token;
    await user.save();

    await logEvent({
      userId: user._id,
      userEmail: user.email,
      userRole: user.role,
      action: 'LOGIN_SUCCESS',
      success: true,
      details: 'Login successful',
      ipAddress: req.ip
    });

    res.json({
      message: 'Login successful.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        lastPasswordChange: user.lastPasswordChange || user.createdAt,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      // Log failed reset attempt for audit
      await logEvent({
        userEmail: normalizedEmail,
        action: 'PASSWORD_RESET_ATTEMPT',
        success: false,
        details: 'Forgot password requested for non-existent email address',
        ipAddress: req.ip
      });
      // Generic message to prevent email harvesting
      return res.json({ message: 'If this email exists you will receive a reset link.' });
    }

    // Rate limiting check: Max 3 requests per hour
    if (user.resetRequestBlockUntil && new Date() < user.resetRequestBlockUntil) {
      await logEvent({
        userId: user._id,
        userEmail: user.email,
        userRole: user.role,
        action: 'PASSWORD_RESET_ATTEMPT',
        success: false,
        details: 'Forgot password request blocked: Rate limit block active',
        ipAddress: req.ip
      });
      return res.status(429).json({ message: 'Too many password reset requests. Please try again in 1 hour.' });
    }

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    if (!user.lastResetRequestTime || user.lastResetRequestTime < oneHourAgo) {
      user.resetRequestsCount = 1;
    } else {
      user.resetRequestsCount = (user.resetRequestsCount || 0) + 1;
    }
    user.lastResetRequestTime = new Date();

    if (user.resetRequestsCount > 3) {
      user.resetRequestBlockUntil = new Date(Date.now() + 60 * 60 * 1000); // Block for 1 hour
      await user.save();
      await logEvent({
        userId: user._id,
        userEmail: user.email,
        userRole: user.role,
        action: 'PASSWORD_RESET_ATTEMPT',
        success: false,
        details: 'Forgot password blocked: Exceeded 3 requests per hour limit. Blocked for 1 hour.',
        ipAddress: req.ip
      });
      return res.status(429).json({ message: 'Too many password reset requests. Please try again in 1 hour.' });
    }

    // Generate random 32-byte hex token
    const token = crypto.randomBytes(32).toString('hex');
    user.resetToken = token;
    user.resetTokenExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    await user.save();

    await logEvent({
      userId: user._id,
      userEmail: user.email,
      userRole: user.role,
      action: 'PASSWORD_RESET_ATTEMPT',
      success: true,
      details: 'Forgot password reset token generated and email dispatched',
      ipAddress: req.ip
    });

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const resetLink = `${clientUrl}/reset-password?token=${token}`;

    await sendResetEmail(user.email, resetLink);

    // Return generic message even for existing emails
    res.json({ message: 'If this email exists you will receive a reset link.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Server error. Failed to process request.' });
  }
});

// POST /api/auth/verify-reset-token
router.post('/verify-reset-token', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      await logEvent({
        action: 'PASSWORD_RESET_VERIFY',
        success: false,
        details: 'Token verification failed: No token provided',
        ipAddress: req.ip
      });
      return res.status(400).json({ message: 'Invalid or expired reset link' });
    }

    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: new Date() }
    });

    if (!user) {
      await logEvent({
        action: 'PASSWORD_RESET_VERIFY',
        success: false,
        details: 'Token verification failed: Token not found or expired',
        ipAddress: req.ip
      });
      return res.status(400).json({ message: 'Invalid or expired reset link' });
    }

    await logEvent({
      userId: user._id,
      userEmail: user.email,
      userRole: user.role,
      action: 'PASSWORD_RESET_VERIFY',
      success: true,
      details: 'Token verification succeeded',
      ipAddress: req.ip
    });

    res.json({ message: 'Token is valid.', email: user.email });
  } catch (error) {
    console.error('Verify token error:', error);
    res.status(500).json({ message: 'Invalid or expired reset link' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ message: 'Token and new password are required.' });
    }

    // Validate password complexity
    const strengthError = validatePasswordStrength(newPassword);
    if (strengthError) {
      return res.status(400).json({ message: strengthError });
    }

    // Find user with matching active, unexpired reset token
    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: new Date() }
    });

    if (!user) {
      await logEvent({
        action: 'PASSWORD_RESET_SUBMIT',
        success: false,
        details: 'Password reset failed: Invalid or expired token',
        ipAddress: req.ip
      });
      return res.status(400).json({ message: 'Invalid or expired reset link' });
    }

    // Check password reuse (cannot reuse any of the last 3 passwords)
    const isCurrentMatch = await user.comparePassword(newPassword);
    if (isCurrentMatch) {
      return res.status(400).json({ message: 'Cannot reuse any of your last 3 passwords.' });
    }

    let matchPrevious = false;
    for (const oldHash of user.previousPasswords || []) {
      const match = await bcrypt.compare(newPassword, oldHash);
      if (match) {
        matchPrevious = true;
        break;
      }
    }
    if (matchPrevious) {
      return res.status(400).json({ message: 'Cannot reuse any of your last 3 passwords.' });
    }

    // Add old password to previousPasswords
    if (!user.previousPasswords) {
      user.previousPasswords = [];
    }
    user.previousPasswords.unshift(user.password);
    if (user.previousPasswords.length > 3) {
      user.previousPasswords = user.previousPasswords.slice(0, 3);
    }

    // Reset password, invalidate token, and clear sessions
    user.password = newPassword;
    user.lastPasswordChange = new Date();
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    user.activeToken = undefined; // Invalidate all existing sessions
    user.refreshToken = undefined;

    await user.save();

    // Log password reset and session invalidation
    await logEvent({
      userId: user._id,
      userEmail: user.email,
      userRole: user.role,
      action: 'PASSWORD_RESET',
      success: true,
      details: 'Password reset successful via forgot-password token',
      ipAddress: req.ip
    });

    await logEvent({
      userId: user._id,
      userEmail: user.email,
      userRole: user.role,
      action: 'SESSION_INVALIDATION',
      success: true,
      details: 'Invalidated all existing sessions on password reset',
      ipAddress: req.ip
    });

    // Send confirmation email
    await sendConfirmationEmail(user.email);

    res.json({ message: 'Password has been reset successfully. You can now login.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Server error. Failed to reset password.' });
  }
});

module.exports = router;
