'use strict';
// routes/productRoutes.js

const express = require('express');
const { body, param, query } = require('express-validator');
const router = express.Router();

const {
  getProducts,
  getFeaturedProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  toggleFeatured,
  toggleActive,
  getAdminProducts,
} = require('../controllers/productController');

const { protect, restrict } = require('../middleware/auth');
const { productUploader, handleMulterError } = require('../middleware/upload');

// ─── Validators ───────────────────────────────────────────────
const createProductValidation = [
  body('name').trim().notEmpty().withMessage('Product name is required')
    .isLength({ max: 200 }).withMessage('Name cannot exceed 200 characters'),
  body('description').trim().notEmpty().withMessage('Description is required')
    .isLength({ max: 5000 }).withMessage('Description cannot exceed 5000 characters'),
  body('category').notEmpty().withMessage('Category is required')
    .isMongoId().withMessage('Invalid category ID'),
  body('price').notEmpty().withMessage('Price is required')
    .isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('discountPrice').optional({ nullable: true })
    .isFloat({ min: 0 }).withMessage('Discount price must be positive'),
  body('stock').optional().isInt({ min: -1 }).withMessage('Stock must be >= -1'),
  body('brand').optional({ nullable: true }).isMongoId().withMessage('Invalid brand ID'),
];

const updateProductValidation = [
  param('id').isMongoId().withMessage('Invalid product ID'),
  body('name').optional().trim().isLength({ min: 1, max: 200 }),
  body('price').optional().isFloat({ min: 0 }).withMessage('Price must be positive'),
  body('discountPrice').optional({ nullable: true }).isFloat({ min: 0 }),
  body('category').optional().isMongoId().withMessage('Invalid category ID'),
  body('brand').optional({ nullable: true }).isMongoId().withMessage('Invalid brand ID'),
];

const paginationValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be >= 1'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1–100'),
  query('minPrice').optional().isFloat({ min: 0 }),
  query('maxPrice').optional().isFloat({ min: 0 }),
];

// ─── Public Routes ────────────────────────────────────────────

/**
 * @route   GET /api/products
 * @desc    Get products with search, filter, pagination
 * @access  Public
 * @query   page, limit, search, category, brand, featured, minPrice, maxPrice, sort, tags
 */
router.get('/', paginationValidation, getProducts);

/**
 * @route   GET /api/products/featured
 * @desc    Get featured products
 * @access  Public
 */
router.get('/featured', getFeaturedProducts);

/**
 * @route   GET /api/products/admin/all
 * @desc    Get all products including inactive (admin only)
 * @access  Protected
 */
router.get('/admin/all', protect, paginationValidation, getAdminProducts);

/**
 * @route   GET /api/products/:id
 * @desc    Get single product by ID or slug (includes related products)
 * @access  Public
 */
router.get('/:id', getProduct);

// ─── Protected Routes (Admin) ─────────────────────────────────

/**
 * @route   POST /api/products
 * @desc    Create a new product
 * @access  Protected
 * @body    multipart/form-data — up to 10 images
 */
router.post(
  '/',
  protect,
  productUploader.array('images', 10),
  handleMulterError,
  createProductValidation,
  createProduct
);

/**
 * @route   PUT /api/products/:id
 * @desc    Update a product
 * @access  Protected
 */
router.put(
  '/:id',
  protect,
  productUploader.array('images', 10),
  handleMulterError,
  updateProductValidation,
  updateProduct
);

/**
 * @route   DELETE /api/products/:id
 * @desc    Delete a product (also removes Cloudinary images)
 * @access  Protected — superadmin only
 */
router.delete(
  '/:id',
  protect,
  restrict('superadmin', 'admin'),
  deleteProduct
);

/**
 * @route   PATCH /api/products/:id/toggle-featured
 * @desc    Toggle featured status
 * @access  Protected
 */
router.patch('/:id/toggle-featured', protect, toggleFeatured);

/**
 * @route   PATCH /api/products/:id/toggle-active
 * @desc    Toggle active/inactive
 * @access  Protected
 */
router.patch('/:id/toggle-active', protect, toggleActive);

module.exports = router;
