'use strict';
// controllers/brandController.js

const { validationResult } = require('express-validator');
const Brand = require('../models/Brand');
const Product = require('../models/Product');
const { cloudinary } = require('../config/cloudinary');
const logger = require('../utils/logger');

// ─── @GET /api/brands ─────────────────────────────────────────
const getBrands = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.active !== 'false') filter.isActive = true;

    const brands = await Brand.find(filter)
      .populate('productCount')
      .sort({ displayOrder: 1, name: 1 })
      .lean();

    res.json({ success: true, count: brands.length, brands });
  } catch (err) {
    next(err);
  }
};

// ─── @GET /api/brands/:id ─────────────────────────────────────
const getBrand = async (req, res, next) => {
  try {
    const { id } = req.params;
    const query = id.match(/^[a-f\d]{24}$/i) ? { _id: id } : { slug: id };

    const brand = await Brand.findOne(query).populate('productCount');
    if (!brand) {
      return res.status(404).json({ success: false, message: 'Brand not found.' });
    }

    // Optionally fetch brand products
    if (req.query.withProducts === 'true') {
      const products = await Product.find({ brand: brand._id, isActive: true })
        .select('name slug images price discountPrice priceLabel')
        .sort({ createdAt: -1 })
        .limit(12)
        .lean();
      return res.json({ success: true, brand, products });
    }

    res.json({ success: true, brand });
  } catch (err) {
    next(err);
  }
};

// ─── @POST /api/brands ────────────────────────────────────────
const createBrand = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, errors: errors.array() });
    }

    const logoData = req.file
      ? { url: req.file.path || `/uploads/brands/${req.file.filename}`, publicId: req.file.filename || req.file.public_id || '' }
      : { url: '', publicId: '' };

    const brand = await Brand.create({
      name: req.body.name,
      description: req.body.description,
      website: req.body.website,
      country: req.body.country || 'India',
      displayOrder: req.body.displayOrder || 0,
      logo: logoData,
    });

    logger.info(`Brand created: ${brand.name}`);
    res.status(201).json({ success: true, message: 'Brand created.', brand });
  } catch (err) {
    next(err);
  }
};

// ─── @PUT /api/brands/:id ─────────────────────────────────────
const updateBrand = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, errors: errors.array() });
    }

    const brand = await Brand.findById(req.params.id);
    if (!brand) {
      return res.status(404).json({ success: false, message: 'Brand not found.' });
    }

    const updateData = {
      name: req.body.name || brand.name,
      description: req.body.description ?? brand.description,
      website: req.body.website ?? brand.website,
      country: req.body.country ?? brand.country,
      displayOrder: req.body.displayOrder ?? brand.displayOrder,
      isActive: req.body.isActive ?? brand.isActive,
    };

    if (req.file) {
      if (brand.logo?.publicId && process.env.CLOUDINARY_CLOUD_NAME) {
        await cloudinary.uploader.destroy(brand.logo.publicId).catch(() => {});
      }
      updateData.logo = {
        url: req.file.path || `/uploads/brands/${req.file.filename}`,
        publicId: req.file.filename || req.file.public_id || '',
      };
    }

    const updated = await Brand.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    logger.info(`Brand updated: ${updated.name}`);
    res.json({ success: true, message: 'Brand updated.', brand: updated });
  } catch (err) {
    next(err);
  }
};

// ─── @DELETE /api/brands/:id ──────────────────────────────────
const deleteBrand = async (req, res, next) => {
  try {
    const brand = await Brand.findById(req.params.id);
    if (!brand) {
      return res.status(404).json({ success: false, message: 'Brand not found.' });
    }

    const productCount = await Product.countDocuments({ brand: brand._id });
    if (productCount > 0) {
      return res.status(409).json({
        success: false,
        message: `Cannot delete brand. It has ${productCount} product(s) assigned. Reassign them first.`,
      });
    }

    if (brand.logo?.publicId && process.env.CLOUDINARY_CLOUD_NAME) {
      await cloudinary.uploader.destroy(brand.logo.publicId).catch(() => {});
    }

    await brand.deleteOne();

    logger.info(`Brand deleted: ${brand.name}`);
    res.json({ success: true, message: 'Brand deleted successfully.' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getBrands, getBrand, createBrand, updateBrand, deleteBrand };
