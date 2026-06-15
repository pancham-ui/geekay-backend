'use strict';
// routes/paymentRoutes.js

const express = require('express');
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');
const router = express.Router();

const {
  createOrder,
  verifyPayment,
  getBookings,
  getPaymentConfig,
} = require('../controllers/paymentController');
const { protect } = require('../middleware/auth');

// ─── Rate limiter for payment creation ────────────────────────
const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 10,
  message: { success: false, message: 'Too many payment attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── Validators ───────────────────────────────────────────────
const createOrderValidation = [
  body('productId').notEmpty().withMessage('Product ID is required')
    .isMongoId().withMessage('Invalid product ID'),
  body('customerName').trim().notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be 2–100 characters'),
  body('phone').trim().notEmpty().withMessage('Phone number is required')
    .matches(/^[6-9]\d{9}$/).withMessage('Enter a valid 10-digit Indian mobile number'),
  body('email').optional({ nullable: true }).trim()
    .isEmail().normalizeEmail().withMessage('Enter a valid email address'),
];

const verifyPaymentValidation = [
  body('razorpay_order_id').notEmpty().withMessage('Order ID is required'),
  body('razorpay_payment_id').notEmpty().withMessage('Payment ID is required'),
  body('razorpay_signature').notEmpty().withMessage('Signature is required'),
];

// ─── Public Routes ────────────────────────────────────────────

/**
 * @route   GET /api/payments/config
 * @desc    Get Razorpay public key + advance amount (for frontend)
 * @access  Public
 */
router.get('/config', getPaymentConfig);

/**
 * @route   POST /api/payments/create-order
 * @desc    Create a Razorpay order for the advance booking amount
 * @access  Public (rate limited: 10/15min per IP)
 * @body    { productId, customerName, phone, email? }
 */
router.post('/create-order', paymentLimiter, createOrderValidation, createOrder);

/**
 * @route   POST /api/payments/verify
 * @desc    Verify Razorpay payment signature and confirm booking
 * @access  Public
 * @body    { razorpay_order_id, razorpay_payment_id, razorpay_signature }
 */
router.post('/verify', verifyPaymentValidation, verifyPayment);

// ─── Protected Routes (Admin) ─────────────────────────────────

/**
 * @route   GET /api/payments/bookings
 * @desc    List all bookings with pagination/filters
 * @access  Protected
 * @query   page, limit, status, search
 */
router.get('/bookings', protect, getBookings);

module.exports = router;
