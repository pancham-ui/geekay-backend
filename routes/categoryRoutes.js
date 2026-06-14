'use strict';
// routes/categoryRoutes.js

const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();

const {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,
} = require('../controllers/categoryController');
const { protect } = require('../middleware/auth');
const { categoryUploader, handleMulterError } = require('../middleware/upload');

// ─── Validators ───────────────────────────────────────────────
const categoryValidation = [
  body('name').trim().notEmpty().withMessage('Category name is required')
    .isLength({ max: 100 }).withMessage('Name cannot exceed 100 characters'),
  body('description').optional().trim().isLength({ max: 1000 }),
  body('displayOrder').optional().isInt({ min: 0 }),
];

const idValidation = [
  param('id').isMongoId().withMessage('Invalid category ID'),
];

// ─── Routes ───────────────────────────────────────────────────

/**
 * @route   GET /api/categories
 * @desc    Get all active categories (with product counts)
 * @access  Public
 * @query   active=false to include inactive (admin use)
 */
router.get('/', getCategories);

/**
 * @route   GET /api/categories/:id
 * @desc    Get single category by ID or slug
 * @access  Public
 */
router.get('/:id', getCategory);

/**
 * @route   POST /api/categories
 * @desc    Create category
 * @access  Protected
 */
router.post(
  '/',
  protect,
  categoryUploader.single('image'),
  handleMulterError,
  categoryValidation,
  createCategory
);

/**
 * @route   PUT /api/categories/:id
 * @desc    Update category
 * @access  Protected
 */
router.put(
  '/:id',
  protect,
  categoryUploader.single('image'),
  handleMulterError,
  idValidation,
  updateCategory
);

/**
 * @route   DELETE /api/categories/:id
 * @desc    Delete category (blocked if products exist)
 * @access  Protected
 */
router.delete('/:id', protect, idValidation, deleteCategory);

/**
 * @route   PATCH /api/categories/reorder
 * @desc    Bulk update display order
 * @access  Protected
 * @body    { order: [{ id, displayOrder }] }
 */
router.patch('/reorder', protect, reorderCategories);

module.exports = router;
