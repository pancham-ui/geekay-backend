'use strict';
// middleware/upload.js

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { productImageStorage, categoryImageStorage, brandLogoStorage } = require('../config/cloudinary');
const logger = require('../utils/logger');

const ALLOWED_MIME = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// ─── File filter ──────────────────────────────────────────────
const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, and WebP images are allowed'), false);
  }
};

// ─── Local storage fallback ───────────────────────────────────
const localStorageFor = (subDir) => {
  const uploadDir = path.join(__dirname, '../uploads', subDir);
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

  return multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const name = path.basename(file.originalname, ext).replace(/\s+/g, '-').toLowerCase();
      cb(null, `${name}-${Date.now()}${ext}`);
    },
  });
};

// ─── Factory ──────────────────────────────────────────────────
const createUploader = (storageEngine, maxCount = 1) => {
  const useCloud = !!process.env.CLOUDINARY_CLOUD_NAME;
  const storage = useCloud ? storageEngine : localStorageFor(storageEngine._folder || 'general');

  if (!useCloud) {
    logger.warn('Cloudinary not configured — using local disk storage');
  }

  return multer({
    storage,
    fileFilter,
    limits: { fileSize: MAX_FILE_SIZE },
  });
};

// ─── Exported uploaders ───────────────────────────────────────
// For products — up to 10 images
const productUploader = (() => {
  const useCloud = !!process.env.CLOUDINARY_CLOUD_NAME;
  const storage = useCloud ? productImageStorage : localStorageFor('products');
  return multer({ storage, fileFilter, limits: { fileSize: MAX_FILE_SIZE } });
})();

// For categories — single image
const categoryUploader = (() => {
  const useCloud = !!process.env.CLOUDINARY_CLOUD_NAME;
  const storage = useCloud ? categoryImageStorage : localStorageFor('categories');
  return multer({ storage, fileFilter, limits: { fileSize: MAX_FILE_SIZE } });
})();

// For brand logos — single image
const brandUploader = (() => {
  const useCloud = !!process.env.CLOUDINARY_CLOUD_NAME;
  const storage = useCloud ? brandLogoStorage : localStorageFor('brands');
  return multer({
    storage,
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter: (req, file, cb) => {
      const allowed = [...ALLOWED_MIME, 'image/svg+xml'];
      cb(allowed.includes(file.mimetype) ? null : new Error('Only JPEG, PNG, WebP, SVG allowed'), allowed.includes(file.mimetype));
    },
  });
})();

// ─── Multer error handler ─────────────────────────────────────
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, message: 'File too large. Maximum size is 5MB.' });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ success: false, message: 'Too many files uploaded.' });
    }
    return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
  }
  if (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
  next();
};

module.exports = { productUploader, categoryUploader, brandUploader, handleMulterError };
