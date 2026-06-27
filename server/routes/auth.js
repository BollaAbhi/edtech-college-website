const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const User = require('../models/User');

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

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email.' });
    }

    // Validate password complexity
    const strengthError = validatePasswordStrength(password);
    if (strengthError) {
      return res.status(400).json({ message: strengthError });
    }

    // Create new user
    const user = await User.create({
      name,
      email,
      password,
      role,
      lastPasswordChange: new Date()
    });

    // Generate JWT
    const token = jwt.sign(
      { id: user._id, name: user.name, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    user.activeToken = token;
    await user.save();

    res.status(201).json({
      message: 'User registered successfully.',
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
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
});

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
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // Check password expiry (90 days)
    const lastChange = user.lastPasswordChange || user.createdAt || new Date();
    const diffTime = new Date() - new Date(lastChange);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays >= 90) {
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
      } else {
        // Still locked
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
        return res.status(403).json({ message: 'Account locked for 30 minutes.' });
      }

      await user.save();
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

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      // Return a generic success to prevent account enumeration attacks
      return res.json({ message: 'If your email is registered, a reset link has been sent.' });
    }

    // Generate random 32-byte hex token
    const token = crypto.randomBytes(32).toString('hex');
    user.resetToken = token;
    user.resetTokenExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    await user.save();

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const resetLink = `${clientUrl}/reset-password?token=${token}`;

    await sendResetEmail(user.email, resetLink);

    res.json({ message: 'Reset link has been sent to your email.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Server error. Failed to send reset email.' });
  }
});

// POST /api/auth/verify-reset-token
router.post('/verify-reset-token', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ message: 'Token is required.' });
    }

    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token.' });
    }

    res.json({ message: 'Token is valid.', email: user.email });
  } catch (error) {
    console.error('Verify token error:', error);
    res.status(500).json({ message: 'Server error. Failed to verify token.' });
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
      return res.status(400).json({ message: 'Invalid or expired reset token.' });
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

    res.json({ message: 'Password has been reset successfully. You can now login.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Server error. Failed to reset password.' });
  }
});

module.exports = router;
