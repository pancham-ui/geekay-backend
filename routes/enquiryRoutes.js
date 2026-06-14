'use strict';
// routes/enquiryRoutes.js

const express = require('express');
const { body, param, query } = require('express-validator');
const rateLimit = require('express-rate-limit');
const router = express.Router();

const {
  createEnquiry,
  getEnquiries,
  getEnquiry,
  updateEnquiryStatus,
  markAsRead,
  deleteEnquiry,
  bulkDeleteEnquiries,
  getEnquiryStats,
} = require('../controllers/enquiryController');
const { protect, restrict } = require('../middleware/auth');

// ─── Strict limiter for public enquiry submission ─────────────
const enquiryLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,                   // 5 enquiries per IP per hour
  message: { success: false, message: 'Too many enquiries submitted. Please try again in an hour.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── Validators ───────────────────────────────────────────────
const createEnquiryValidation = [
  body('customerName').trim().notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be 2–100 characters'),
  body('phone').trim().notEmpty().withMessage('Phone number is required')
    .matches(/^[6-9]\d{9}$/).withMessage('Enter a valid 10-digit Indian mobile number'),
  body('email').optional({ nullable: true }).trim()
    .isEmail().normalizeEmail().withMessage('Enter a valid email address'),
  body('message').optional().trim()
    .isLength({ max: 2000 }).withMessage('Message cannot exceed 2000 characters'),
  body('productId').optional({ nullable: true })
    .isMongoId().withMessage('Invalid product ID'),
  body('source').optional()
    .isIn(['Website', 'WhatsApp', 'Phone', 'Walk-in', 'Other'])
    .withMessage('Invalid source'),
];

const statusValidation = [
  param('id').isMongoId().withMessage('Invalid enquiry ID'),
  body('status').optional()
    .isIn(['Pending', 'Contacted', 'Closed']).withMessage('Invalid status'),
  body('followUpAt').optional({ nullable: true })
    .isISO8601().withMessage('followUpAt must be a valid date'),
];

// ─── Public Routes ────────────────────────────────────────────

/**
 * @route   POST /api/enquiries
 * @desc    Submit a new customer enquiry (triggers email)
 * @access  Public (rate limited: 5/hour per IP)
 * @body    { customerName, phone, email?, message?, productId?, source? }
 */
router.post('/', enquiryLimiter, createEnquiryValidation, createEnquiry);

// ─── Protected Routes (Admin) ─────────────────────────────────

/**
 * @route   GET /api/enquiries
 * @desc    List all enquiries with filters & pagination
 * @access  Protected
 * @query   page, limit, status, isRead, source, search, from, to, sort
 */
router.get('/', protect, getEnquiries);

/**
 * @route   GET /api/enquiries/stats
 * @desc    Enquiry stats — status breakdown, monthly count, top products
 * @access  Protected
 */
router.get('/stats', protect, getEnquiryStats);

/**
 * @route   DELETE /api/enquiries/bulk-delete
 * @desc    Delete multiple enquiries by ID array
 * @access  Protected — admin/superadmin only
 * @body    { ids: [...] }
 */
router.delete('/bulk-delete', protect, restrict('superadmin', 'admin'), bulkDeleteEnquiries);

/**
 * @route   GET /api/enquiries/:id
 * @desc    Get single enquiry (marks as read)
 * @access  Protected
 */
router.get('/:id', protect, param('id').isMongoId(), getEnquiry);

/**
 * @route   PATCH /api/enquiries/:id/status
 * @desc    Update status, admin notes, follow-up date
 * @access  Protected
 * @body    { status?, adminNotes?, followUpAt? }
 */
router.patch('/:id/status', protect, statusValidation, updateEnquiryStatus);

/**
 * @route   PATCH /api/enquiries/:id/read
 * @desc    Mark enquiry as read
 * @access  Protected
 */
router.patch('/:id/read', protect, param('id').isMongoId(), markAsRead);

/**
 * @route   DELETE /api/enquiries/:id
 * @desc    Delete single enquiry
 * @access  Protected — admin/superadmin only
 */
router.delete('/:id', protect, restrict('superadmin', 'admin'), param('id').isMongoId(), deleteEnquiry);

module.exports = router;
