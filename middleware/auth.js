'use strict';
// middleware/auth.js

const { verifyToken } = require('../utils/generateToken');
const Admin = require('../models/Admin');
const logger = require('../utils/logger');

/**
 * Protect routes — verifies JWT and attaches admin to req.
 */
const protect = async (req, res, next) => {
  try {
    let token;

    // Extract token from Authorization header
    if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
      });
    }

    // Verify token
    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (err) {
      const message =
        err.name === 'TokenExpiredError'
          ? 'Session expired. Please log in again.'
          : 'Invalid token. Please log in again.';
      return res.status(401).json({ success: false, message });
    }

    // Find admin
    const admin = await Admin.findById(decoded.id).select('-password');
    if (!admin) {
      return res.status(401).json({ success: false, message: 'Admin account not found.' });
    }

    if (!admin.isActive) {
      return res.status(403).json({ success: false, message: 'Your account has been deactivated.' });
    }

    req.admin = admin;
    next();
  } catch (err) {
    logger.error('Auth middleware error:', err.message);
    next(err);
  }
};

/**
 * Restrict access to specific roles.
 * Usage: restrict('superadmin'), restrict('superadmin', 'admin')
 */
const restrict = (...roles) => (req, res, next) => {
  if (!roles.includes(req.admin?.role)) {
    return res.status(403).json({
      success: false,
      message: `Access denied. Requires role: ${roles.join(' or ')}.`,
    });
  }
  next();
};

module.exports = { protect, restrict };
