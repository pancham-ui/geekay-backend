'use strict';
// routes/authRoutes.js

const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const {
  login,
  getMe,
  updatePassword,
  updateProfile,
  logout,
  getDashboardStats,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

// ─── Validators ───────────────────────────────────────────────
const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password is required'),
];

const updatePasswordValidation = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase, and a number'),
];

const updateProfileValidation = [
  body('name').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2–100 chars'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Valid email required'),
];

// ─── Routes ───────────────────────────────────────────────────
/**
 * @route   POST /api/auth/login
 * @desc    Admin login → returns JWT
 * @access  Public
 */
router.post('/login', loginValidation, login);

/**
 * @route   GET /api/auth/me
 * @desc    Get current admin profile
 * @access  Protected
 */
router.get('/me', protect, getMe);

/**
 * @route   PUT /api/auth/update-password
 * @desc    Change admin password
 * @access  Protected
 */
router.put('/update-password', protect, updatePasswordValidation, updatePassword);

/**
 * @route   PUT /api/auth/update-profile
 * @desc    Update admin name/email
 * @access  Protected
 */
router.put('/update-profile', protect, updateProfileValidation, updateProfile);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout (client should discard token)
 * @access  Protected
 */
router.post('/logout', protect, logout);

/**
 * @route   GET /api/auth/dashboard-stats
 * @desc    Overview counts for admin dashboard
 * @access  Protected
 */
router.get('/dashboard-stats', protect, getDashboardStats);

module.exports = router;
