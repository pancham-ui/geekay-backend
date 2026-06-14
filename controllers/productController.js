'use strict';
// controllers/productController.js

const { validationResult } = require('express-validator');
const mongoose = require('mongoose');
const Product = require('../models/Product');
const { cloudinary } = require('../config/cloudinary');
const logger = require('../utils/logger');

// ─── Helper: build filter query ──────────────────────────────
const buildFilterQuery = (queryParams) => {
  const { search, category, brand, featured, minPrice, maxPrice, tags, inStock } = queryParams;
  const filter = { isActive: true };

  if (search) {
    filter.$text = { $search: search };
  }

  if (category) {
    if (mongoose.Types.ObjectId.isValid(category)) {
      filter.category = category;
    }
  }

  if (brand) {
    if (mongoose.Types.ObjectId.isValid(brand)) {
      filter.brand = brand;
    }
  }

  if (featured === 'true') filter.featured = true;

  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = parseFloat(minPrice);
    if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
  }

  if (tags) {
    const tagList = tags.split(',').map((t) => t.trim().toLowerCase());
    filter.tags = { $in: tagList };
  }

  if (inStock === 'true') {
    filter.$or = [{ stock: -1 }, { stock: { $gt: 0 } }];
  }

  return filter;
};

// ─── Helper: build sort ───────────────────────────────────────
const buildSort = (sortParam, hasSearch) => {
  const sorts = {
    newest: { createdAt: -1 },
    oldest: { createdAt: 1 },
    price_asc: { price: 1 },
    price_desc: { price: -1 },
    name_asc: { name: 1 },
    name_desc: { name: -1 },
    popular: { enquiryCount: -1 },
  };

  if (hasSearch && !sortParam) {
    return { score: { $meta: 'textScore' } };
  }

  return sorts[sortParam] || { createdAt: -1 };
};

// ─── @GET /api/products ───────────────────────────────────────
const getProducts = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 12));
    const skip = (page - 1) * limit;

    const filter = buildFilterQuery(req.query);
    const sort = buildSort(req.query.sort, !!req.query.search);

    const selectFields = req.query.search
      ? { score: { $meta: 'textScore' } }
      : {};

    const [products, total] = await Promise.all([
      Product.find(filter, selectFields)
        .populate('category', 'name slug')
        .populate('brand', 'name logo')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      count: products.length,
      total,
      page,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      products,
    });
  } catch (err) {
    next(err);
  }
};

// ─── @GET /api/products/featured ─────────────────────────────
const getFeaturedProducts = async (req, res, next) => {
  try {
    const limit = Math.min(20, parseInt(req.query.limit) || 8);
    const products = await Product.find({ featured: true, isActive: true })
      .populate('category', 'name slug')
      .populate('brand', 'name logo')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    res.json({ success: true, count: products.length, products });
  } catch (err) {
    next(err);
  }
};

// ─── @GET /api/products/:id ───────────────────────────────────
const getProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Support both ObjectId and slug
    const query = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { slug: id };

    const product = await Product.findOne({ ...query, isActive: true })
      .populate('category', 'name slug description')
      .populate('brand', 'name logo website');

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    // Increment view count (non-blocking)
    Product.incrementViews(product._id).catch(() => {});

    // Related products: same category, exclude current
    const related = await Product.find({
      category: product.category._id,
      _id: { $ne: product._id },
      isActive: true,
    })
      .select('name slug images price discountPrice priceLabel')
      .limit(4)
      .lean();

    res.json({ success: true, product, related });
  } catch (err) {
    next(err);
  }
};

// ─── @POST /api/products ─────────────────────────────────────
const createProduct = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // Clean up any uploaded files on validation failure
      if (req.files?.length) {
        await cleanupUploadedFiles(req.files);
      }
      return res.status(422).json({ success: false, errors: errors.array() });
    }

    // Build images array from multer
    const images = buildImagesArray(req.files);

    // Parse JSON fields sent as strings from multipart
    const features = parseJsonField(req.body.features, []);
    const specifications = parseJsonField(req.body.specifications, []);
    const tags = parseJsonField(req.body.tags, []);

    const product = await Product.create({
      ...req.body,
      images,
      features,
      specifications,
      tags,
    });

    await product.populate([
      { path: 'category', select: 'name slug' },
      { path: 'brand', select: 'name logo' },
    ]);

    logger.info(`Product created: ${product.name} (${product._id})`);
    res.status(201).json({ success: true, message: 'Product created successfully.', product });
  } catch (err) {
    if (req.files?.length) await cleanupUploadedFiles(req.files).catch(() => {});
    next(err);
  }
};

// ─── @PUT /api/products/:id ───────────────────────────────────
const updateProduct = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      if (req.files?.length) await cleanupUploadedFiles(req.files).catch(() => {});
      return res.status(422).json({ success: false, errors: errors.array() });
    }

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    // Handle image updates
    let images = product.images;
    if (req.files?.length) {
      const newImages = buildImagesArray(req.files);
      // Replace or append based on replaceImages flag
      images = req.body.replaceImages === 'true'
        ? newImages
        : [...images, ...newImages].slice(0, 10);
    }

    // Handle image deletions (array of publicIds to remove)
    if (req.body.deleteImages) {
      const toDelete = parseJsonField(req.body.deleteImages, []);
      await deleteCloudinaryImages(toDelete);
      images = images.filter((img) => !toDelete.includes(img.publicId));
    }

    const features = req.body.features !== undefined ? parseJsonField(req.body.features, product.features) : product.features;
    const specifications = req.body.specifications !== undefined ? parseJsonField(req.body.specifications, product.specifications) : product.specifications;
    const tags = req.body.tags !== undefined ? parseJsonField(req.body.tags, product.tags) : product.tags;

    const updated = await Product.findByIdAndUpdate(
      req.params.id,
      { ...req.body, images, features, specifications, tags },
      { new: true, runValidators: true }
    ).populate([
      { path: 'category', select: 'name slug' },
      { path: 'brand', select: 'name logo' },
    ]);

    logger.info(`Product updated: ${updated.name} (${updated._id})`);
    res.json({ success: true, message: 'Product updated successfully.', product: updated });
  } catch (err) {
    if (req.files?.length) await cleanupUploadedFiles(req.files).catch(() => {});
    next(err);
  }
};

// ─── @DELETE /api/products/:id ────────────────────────────────
const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    // Delete images from Cloudinary
    const publicIds = product.images.map((img) => img.publicId).filter(Boolean);
    await deleteCloudinaryImages(publicIds);

    await product.deleteOne();

    logger.info(`Product deleted: ${product.name} (${product._id})`);
    res.json({ success: true, message: 'Product deleted successfully.' });
  } catch (err) {
    next(err);
  }
};

// ─── @PATCH /api/products/:id/toggle-featured ─────────────────
const toggleFeatured = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    product.featured = !product.featured;
    await product.save();

    res.json({
      success: true,
      message: `Product ${product.featured ? 'marked as' : 'removed from'} featured.`,
      featured: product.featured,
    });
  } catch (err) {
    next(err);
  }
};

// ─── @PATCH /api/products/:id/toggle-active ───────────────────
const toggleActive = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    product.isActive = !product.isActive;
    await product.save();

    res.json({
      success: true,
      message: `Product ${product.isActive ? 'activated' : 'deactivated'}.`,
      isActive: product.isActive,
    });
  } catch (err) {
    next(err);
  }
};

// ─── @GET /api/products/admin/all ────────────────────────────
// Admin view: includes inactive products + view counts
const getAdminProducts = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.search) filter.$text = { $search: req.query.search };
    if (req.query.category) filter.category = req.query.category;
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';
    if (req.query.featured === 'true') filter.featured = true;

    const sort = buildSort(req.query.sort, !!req.query.search);

    const [products, total] = await Promise.all([
      Product.find(filter)
        .select('+views')
        .populate('category', 'name')
        .populate('brand', 'name')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(filter),
    ]);

    res.json({
      success: true,
      count: products.length,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      products,
    });
  } catch (err) {
    next(err);
  }
};

// ─── Private helpers ──────────────────────────────────────────
const buildImagesArray = (files = []) =>
  files.map((file) => ({
    url: file.path || `/uploads/products/${file.filename}`,
    publicId: file.filename || file.public_id || '',
    altText: file.originalname?.split('.')[0] || '',
  }));

const parseJsonField = (value, fallback) => {
  if (!value) return fallback;
  if (Array.isArray(value)) return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const cleanupUploadedFiles = async (files = []) => {
  const { cloudinary: cloud } = require('../config/cloudinary');
  await Promise.allSettled(
    files.map((f) => f.public_id ? cloud.uploader.destroy(f.public_id) : Promise.resolve())
  );
};

const deleteCloudinaryImages = async (publicIds = []) => {
  if (!publicIds.length || !process.env.CLOUDINARY_CLOUD_NAME) return;
  await Promise.allSettled(
    publicIds.map((id) => cloudinary.uploader.destroy(id))
  );
};

module.exports = {
  getProducts,
  getFeaturedProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  toggleFeatured,
  toggleActive,
  getAdminProducts,
};
