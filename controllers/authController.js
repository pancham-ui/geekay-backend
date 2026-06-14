'use strict';
// controllers/authController.js

const { validationResult } = require('express-validator');
const Admin = require('../models/Admin');
const { generateToken } = require('../utils/generateToken');
const logger = require('../utils/logger');

// ─── Helpers ──────────────────────────────────────────────────
const sendTokenResponse = (admin, statusCode, res) => {
  const token = generateToken(admin._id, admin.role);

  res.status(statusCode).json({
    success: true,
    token,
    admin: {
      id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      lastLogin: admin.lastLogin,
    },
  });
};

// ─── @POST /api/auth/login ────────────────────────────────────
const login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, errors: errors.array() });
    }

    const { email, password } = req.body;

    // Find admin with password field
    const admin = await Admin.findByEmail(email);
    if (!admin) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    // Check account lock
    if (admin.isLocked()) {
      const minutesLeft = Math.ceil((admin.lockUntil - Date.now()) / 60000);
      return res.status(423).json({
        success: false,
        message: `Account temporarily locked. Try again in ${minutesLeft} minute(s).`,
      });
    }

    // Verify password
    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      await admin.incrementLoginAttempts();
      logger.warn(`Failed login attempt for: ${email}`);
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    // Check active status
    if (!admin.isActive) {
      return res.status(403).json({ success: false, message: 'Your account has been deactivated. Contact support.' });
    }

    // Reset failed attempts and record login
    await admin.resetLoginAttempts();
    logger.info(`Admin logged in: ${admin.email}`);

    sendTokenResponse(admin, 200, res);
  } catch (err) {
    next(err);
  }
};

// ─── @GET /api/auth/me ────────────────────────────────────────
const getMe = async (req, res, next) => {
  try {
    const admin = await Admin.findById(req.admin._id);
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin not found.' });
    }
    res.json({ success: true, admin });
  } catch (err) {
    next(err);
  }
};

// ─── @PUT /api/auth/update-password ──────────────────────────
const updatePassword = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, errors: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;

    const admin = await Admin.findById(req.admin._id).select('+password');
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin not found.' });
    }

    const isMatch = await admin.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
    }

    admin.password = newPassword;
    await admin.save();

    logger.info(`Password updated for admin: ${admin.email}`);
    sendTokenResponse(admin, 200, res);
  } catch (err) {
    next(err);
  }
};

// ─── @PUT /api/auth/update-profile ───────────────────────────
const updateProfile = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, errors: errors.array() });
    }

    const { name, email } = req.body;

    // Check email uniqueness
    if (email) {
      const existing = await Admin.findOne({ email, _id: { $ne: req.admin._id } });
      if (existing) {
        return res.status(409).json({ success: false, message: 'Email already in use.' });
      }
    }

    const admin = await Admin.findByIdAndUpdate(
      req.admin._id,
      { name, email },
      { new: true, runValidators: true }
    );

    res.json({ success: true, message: 'Profile updated.', admin });
  } catch (err) {
    next(err);
  }
};

// ─── @POST /api/auth/logout ───────────────────────────────────
// JWT is stateless — client drops the token; server just confirms
const logout = (req, res) => {
  logger.info(`Admin logged out: ${req.admin?.email}`);
  res.json({ success: true, message: 'Logged out successfully.' });
};

// ─── @GET /api/auth/dashboard-stats ──────────────────────────
const getDashboardStats = async (req, res, next) => {
  try {
    const [Product, Category, Brand, Enquiry] = [
      require('../models/Product'),
      require('../models/Category'),
      require('../models/Brand'),
      require('../models/Enquiry'),
    ];

    const [
      totalProducts,
      activeProducts,
      featuredProducts,
      totalCategories,
      totalBrands,
      totalEnquiries,
      pendingEnquiries,
      recentEnquiries,
    ] = await Promise.all([
      Product.countDocuments(),
      Product.countDocuments({ isActive: true }),
      Product.countDocuments({ featured: true }),
      Category.countDocuments({ isActive: true }),
      Brand.countDocuments({ isActive: true }),
      Enquiry.countDocuments(),
      Enquiry.countDocuments({ status: 'Pending' }),
      Enquiry.find().sort({ createdAt: -1 }).limit(5).select('customerName phone status createdAt productName'),
    ]);

    res.json({
      success: true,
      stats: {
        products: { total: totalProducts, active: activeProducts, featured: featuredProducts },
        categories: { total: totalCategories },
        brands: { total: totalBrands },
        enquiries: { total: totalEnquiries, pending: pendingEnquiries },
      },
      recentEnquiries,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { login, getMe, updatePassword, updateProfile, logout, getDashboardStats };
