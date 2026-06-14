'use strict';

const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const logger = require('../utils/logger');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// Verify configuration
const verifyCloudinary = async () => {
  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    logger.warn('Cloudinary not configured — falling back to local storage');
    return false;
  }
  try {
    await cloudinary.api.ping();
    logger.info('✅ Cloudinary connected');
    return true;
  } catch (err) {
    logger.warn('Cloudinary ping failed:', err.message);
    return false;
  }
};

// Cloudinary storage engine for multer
const productImageStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'geekay/products',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [
      { width: 1200, height: 900, crop: 'limit', quality: 'auto:good' },
    ],
    public_id: (req, file) => {
      const name = file.originalname.split('.')[0].replace(/\s+/g, '-').toLowerCase();
      return `${name}-${Date.now()}`;
    },
  },
});

const categoryImageStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'geekay/categories',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 800, height: 600, crop: 'limit', quality: 'auto:good' }],
    public_id: (req, file) => `cat-${Date.now()}`,
  },
});

const brandLogoStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'geekay/brands',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'svg'],
    transformation: [{ width: 400, height: 200, crop: 'limit', quality: 'auto:good' }],
    public_id: (req, file) => `brand-${Date.now()}`,
  },
});

module.exports = {
  cloudinary,
  productImageStorage,
  categoryImageStorage,
  brandLogoStorage,
  verifyCloudinary,
};
