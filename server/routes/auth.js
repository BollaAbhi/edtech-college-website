const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/User');
const logEvent = require('../utils/auditLogger');
const verifyToken = require('../middleware/verifyToken');
const {
  sendResetEmail,
  sendLockoutEmail,
  sendPasswordChangedEmail
} = require('../utils/sendEmail');

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

    // Check if account is active
    if (user.isActive === false) {
      await logEvent({
        userId: user._id,
        userEmail: user.email,
        userRole: user.role,
        action: 'LOGIN_FAILED',
        success: false,
        details: 'Rejected: Account deactivated by administrator',
        ipAddress: req.ip
      });
      return res.status(403).json({ message: 'Your account has been deactivated. Please contact the administrator.' });
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
        await sendLockoutEmail(user.email, user.name);
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
        isFirstLogin: user.isFirstLogin,
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

    const resetLink = `https://edtech-college-website.vercel.app/reset-password/${token}`;

    await sendResetEmail(user.email, user.name, resetLink);

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
    await sendPasswordChangedEmail(user.email, user.name);

    res.json({ message: 'Password has been reset successfully. You can now login.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Server error. Failed to reset password.' });
  }
});

// POST /api/auth/change-password — Authenticated or Unauthenticated password update
router.post('/change-password', async (req, res) => {
  try {
    const { email, currentPassword, newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({ message: 'New password is required.' });
    }

    let user;

    // 1. Try to authenticate via Bearer token
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        user = await User.findById(decoded.id);
      } catch (err) {
        // Token verification failed, we will fall back to email lookup
      }
    }

    // 2. If not authenticated or not found via token, look up by email
    if (!user) {
      if (email) {
        user = await User.findOne({ email: email.toLowerCase().trim() });
      }
    }

    console.log("Change password attempt");
    console.log("User found:", !!user);

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (!currentPassword) {
      return res.status(400).json({ message: 'Current password is required.' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    console.log("Password match:", isMatch);

    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Validate new password complexity
    const strengthError = validatePasswordStrength(newPassword);
    if (strengthError) {
      return res.status(400).json({ message: strengthError });
    }

    // Prevent reuse of the last 3 passwords
    const isCurrentMatch = await bcrypt.compare(newPassword, user.password);
    if (isCurrentMatch) {
      return res.status(400).json({ message: 'New password same as old' });
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

    // Push current hash into previousPasswords history
    if (!user.previousPasswords) {
      user.previousPasswords = [];
    }
    user.previousPasswords.unshift(user.password);
    if (user.previousPasswords.length > 3) {
      user.previousPasswords = user.previousPasswords.slice(0, 3);
    }

    user.password = newPassword;
    user.lastPasswordChange = new Date();
    user.isFirstLogin = false; // Turn off first-login flag
    user.activeToken = undefined; // Force user to log in again with new password
    user.refreshToken = undefined;

    await user.save();

    await logEvent({
      userId: user._id,
      userEmail: user.email,
      userRole: user.role,
      action: 'PASSWORD_RESET',
      success: true,
      details: 'Password changed successfully',
      ipAddress: req.ip
    });

    await logEvent({
      userId: user._id,
      userEmail: user.email,
      userRole: user.role,
      action: 'SESSION_INVALIDATION',
      success: true,
      details: 'Invalidated all sessions on password change',
      ipAddress: req.ip
    });

    // Send confirmation email
    await sendPasswordChangedEmail(user.email, user.name);

    res.json({ message: 'Password successfully changed' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Server error. Failed to change password.' });
  }
});

module.exports = router;
