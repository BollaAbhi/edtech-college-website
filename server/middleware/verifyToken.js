const jwt = require('jsonwebtoken');
const User = require('../models/User');

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Fetch the user to check their active token
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: 'Invalid or expired token.' });
    }

    // Check password expiry (90 days)
    const lastChange = user.lastPasswordChange || user.createdAt || new Date();
    const diffTime = new Date() - new Date(lastChange);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays >= 90) {
      return res.status(403).json({ message: 'Password expired' });
    }

    // Reject if activeToken does not match (session invalidated by another login)
    if (user.activeToken && user.activeToken !== token) {
      return res.status(401).json({ message: 'Logged in from another device' });
    }

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
};

module.exports = verifyToken;
