'use strict';
// routes/brandRoutes.js

const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();

const {
  getBrands,
  getBrand,
  createBrand,
  updateBrand,
  deleteBrand,
} = require('../controllers/brandController');
const { protect } = require('../middleware/auth');
const { brandUploader, handleMulterError } = require('../middleware/upload');

// ─── Validators ───────────────────────────────────────────────
const brandValidation = [
  body('name').trim().notEmpty().withMessage('Brand name is required')
    .isLength({ max: 100 }).withMessage('Name cannot exceed 100 characters'),
  body('website').optional({ nullable: true }).trim()
    .isURL({ require_protocol: true }).withMessage('Website must be a valid URL'),
  body('description').optional().trim().isLength({ max: 500 }),
  body('country').optional().trim(),
  body('displayOrder').optional().isInt({ min: 0 }),
];

const idValidation = [
  param('id').isMongoId().withMessage('Invalid brand ID'),
];

// ─── Routes ───────────────────────────────────────────────────

/**
 * @route   GET /api/brands
 * @desc    Get all brands
 * @access  Public
 */
router.get('/', getBrands);

/**
 * @route   GET /api/brands/:id
 * @desc    Get single brand by ID or slug
 * @access  Public
 * @query   withProducts=true to include brand products
 */
router.get('/:id', getBrand);

/**
 * @route   POST /api/brands
 * @desc    Create a brand
 * @access  Protected
 */
router.post(
  '/',
  protect,
  brandUploader.single('logo'),
  handleMulterError,
  brandValidation,
  createBrand
);

/**
 * @route   PUT /api/brands/:id
 * @desc    Update a brand
 * @access  Protected
 */
router.put(
  '/:id',
  protect,
  brandUploader.single('logo'),
  handleMulterError,
  idValidation,
  updateBrand
);

/**
 * @route   DELETE /api/brands/:id
 * @desc    Delete a brand (blocked if products exist)
 * @access  Protected
 */
router.delete('/:id', protect, idValidation, deleteBrand);

module.exports = router;
