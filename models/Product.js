'use strict';

const mongoose = require('mongoose');
const slugify = require('slugify');

const imageSchema = new mongoose.Schema({
  url: { type: String, required: true },
  publicId: { type: String }, // Cloudinary public_id for deletion
  altText: { type: String, default: '' },
}, { _id: false });

const specificationSchema = new mongoose.Schema({
  key: { type: String, required: true, trim: true },
  value: { type: String, required: true, trim: true },
}, { _id: false });

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      maxlength: [200, 'Product name cannot exceed 200 characters'],
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      index: true,
    },
    description: {
      type: String,
      required: [true, 'Product description is required'],
      trim: true,
      maxlength: [5000, 'Description cannot exceed 5000 characters'],
    },
    shortDescription: {
      type: String,
      trim: true,
      maxlength: [500, 'Short description cannot exceed 500 characters'],
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Product category is required'],
      index: true,
    },
    brand: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Brand',
      index: true,
    },
    price: {
      type: Number,
      required: [true, 'Product price is required'],
      min: [0, 'Price cannot be negative'],
    },
    discountPrice: {
      type: Number,
      min: [0, 'Discount price cannot be negative'],
      validate: {
        validator: function (val) {
          return !val || val < this.price;
        },
        message: 'Discount price must be less than the regular price',
      },
    },
    images: {
      type: [imageSchema],
      validate: {
        validator: (arr) => arr.length <= 10,
        message: 'Maximum 10 images allowed per product',
      },
    },
    features: {
      type: [{ type: String, trim: true, maxlength: 500 }],
      default: [],
    },
    specifications: {
      type: [specificationSchema],
      default: [],
    },
    stock: {
      type: Number,
      default: -1, // -1 = unlimited / enquiry-based
      min: -1,
    },
    sku: {
      type: String,
      trim: true,
      uppercase: true,
      sparse: true,
      index: true,
    },
    featured: {
      type: Boolean,
      default: false,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    tags: {
      type: [{ type: String, trim: true, lowercase: true }],
      default: [],
      index: true,
    },
    // Analytics (lightweight — no external service needed)
    views: {
      type: Number,
      default: 0,
      select: false, // Hidden from default queries
    },
    enquiryCount: {
      type: Number,
      default: 0,
    },
    priceLabel: {
      type: String,
      trim: true,
      default: '',
      // e.g. "Starting from" — displayed before price
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Indexes ─────────────────────────────────────────────────
productSchema.index({ name: 'text', description: 'text', tags: 'text' });
productSchema.index({ price: 1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ category: 1, isActive: 1, featured: -1 });

// ─── Virtuals ────────────────────────────────────────────────
productSchema.virtual('discountPercent').get(function () {
  if (!this.discountPrice || !this.price) return 0;
  return Math.round(((this.price - this.discountPrice) / this.price) * 100);
});

productSchema.virtual('effectivePrice').get(function () {
  return this.discountPrice || this.price;
});

productSchema.virtual('primaryImage').get(function () {
  return this.images && this.images.length > 0 ? this.images[0].url : null;
});

// ─── Pre-save Hook: generate slug ────────────────────────────
productSchema.pre('save', async function (next) {
  if (!this.isModified('name') && this.slug) return next();
  let baseSlug = slugify(this.name, { lower: true, strict: true });
  let slug = baseSlug;
  let count = 1;
  while (await mongoose.model('Product').findOne({ slug, _id: { $ne: this._id } })) {
    slug = `${baseSlug}-${count++}`;
  }
  this.slug = slug;
  next();
});

// ─── Pre-save: auto short description ────────────────────────
productSchema.pre('save', function (next) {
  if (!this.shortDescription && this.description) {
    this.shortDescription = this.description.substring(0, 160).trim();
    if (this.description.length > 160) this.shortDescription += '…';
  }
  next();
});

// ─── Static Methods ───────────────────────────────────────────
productSchema.statics.incrementViews = async function (id) {
  return this.findByIdAndUpdate(id, { $inc: { views: 1 } });
};

productSchema.statics.incrementEnquiries = async function (id) {
  return this.findByIdAndUpdate(id, { $inc: { enquiryCount: 1 } });
};

module.exports = mongoose.model('Product', productSchema);
