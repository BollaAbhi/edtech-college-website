const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email.' });
    }

    // Create new user
    const user = await User.create({ name, email, password, role });

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
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({ message: 'Email and new password are required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(404).json({ message: 'User not found with this email.' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password has been reset successfully. You can now login.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error. Failed to reset password.' });
  }
});

module.exports = router;
