'use strict';
// controllers/categoryController.js

const { validationResult } = require('express-validator');
const Category = require('../models/Category');
const Product = require('../models/Product');
const { cloudinary } = require('../config/cloudinary');
const logger = require('../utils/logger');

// ─── @GET /api/categories ─────────────────────────────────────
const getCategories = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.active !== 'false') filter.isActive = true;

    const categories = await Category.find(filter)
      .populate('productCount')
      .sort({ displayOrder: 1, name: 1 })
      .lean();

    res.json({ success: true, count: categories.length, categories });
  } catch (err) {
    next(err);
  }
};

// ─── @GET /api/categories/:id ─────────────────────────────────
const getCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const query = id.match(/^[a-f\d]{24}$/i) ? { _id: id } : { slug: id };

    const category = await Category.findOne(query).populate('productCount');
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found.' });
    }

    res.json({ success: true, category });
  } catch (err) {
    next(err);
  }
};

// ─── @POST /api/categories ────────────────────────────────────
const createCategory = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, errors: errors.array() });
    }

    const imageData = req.file
      ? { url: req.file.path || `/uploads/categories/${req.file.filename}`, publicId: req.file.filename || req.file.public_id || '' }
      : { url: '', publicId: '' };

    const category = await Category.create({
      name: req.body.name,
      description: req.body.description,
      icon: req.body.icon,
      displayOrder: req.body.displayOrder || 0,
      image: imageData,
    });

    logger.info(`Category created: ${category.name}`);
    res.status(201).json({ success: true, message: 'Category created.', category });
  } catch (err) {
    next(err);
  }
};

// ─── @PUT /api/categories/:id ────────────────────────────────
const updateCategory = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, errors: errors.array() });
    }

    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found.' });
    }

    const updateData = {
      name: req.body.name || category.name,
      description: req.body.description ?? category.description,
      icon: req.body.icon ?? category.icon,
      displayOrder: req.body.displayOrder ?? category.displayOrder,
      isActive: req.body.isActive ?? category.isActive,
    };

    // Handle new image upload
    if (req.file) {
      // Delete old image from Cloudinary
      if (category.image?.publicId && process.env.CLOUDINARY_CLOUD_NAME) {
        await cloudinary.uploader.destroy(category.image.publicId).catch(() => {});
      }
      updateData.image = {
        url: req.file.path || `/uploads/categories/${req.file.filename}`,
        publicId: req.file.filename || req.file.public_id || '',
      };
    }

    const updated = await Category.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    logger.info(`Category updated: ${updated.name}`);
    res.json({ success: true, message: 'Category updated.', category: updated });
  } catch (err) {
    next(err);
  }
};

// ─── @DELETE /api/categories/:id ─────────────────────────────
const deleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found.' });
    }

    // Prevent deletion if products exist in category
    const productCount = await Product.countDocuments({ category: category._id });
    if (productCount > 0) {
      return res.status(409).json({
        success: false,
        message: `Cannot delete category. It has ${productCount} product(s). Reassign or delete them first.`,
      });
    }

    // Delete image from Cloudinary
    if (category.image?.publicId && process.env.CLOUDINARY_CLOUD_NAME) {
      await cloudinary.uploader.destroy(category.image.publicId).catch(() => {});
    }

    await category.deleteOne();

    logger.info(`Category deleted: ${category.name}`);
    res.json({ success: true, message: 'Category deleted successfully.' });
  } catch (err) {
    next(err);
  }
};

// ─── @PATCH /api/categories/reorder ──────────────────────────
const reorderCategories = async (req, res, next) => {
  try {
    // req.body.order = [{ id, displayOrder }, ...]
    const { order } = req.body;
    if (!Array.isArray(order)) {
      return res.status(400).json({ success: false, message: 'order must be an array.' });
    }

    await Promise.all(
      order.map(({ id, displayOrder }) =>
        Category.findByIdAndUpdate(id, { displayOrder })
      )
    );

    res.json({ success: true, message: 'Category order updated.' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getCategories, getCategory, createCategory, updateCategory, deleteCategory, reorderCategories };
