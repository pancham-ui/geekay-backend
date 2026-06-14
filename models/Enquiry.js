'use strict';
// models/Enquiry.js

const mongoose = require('mongoose');

const ENQUIRY_STATUS = ['Pending', 'Contacted', 'Closed'];
const ENQUIRY_SOURCE = ['Website', 'WhatsApp', 'Phone', 'Walk-in', 'Other'];

const enquirySchema = new mongoose.Schema(
  {
    customerName: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      match: [/^[6-9]\d{9}$/, 'Please provide a valid 10-digit Indian mobile number'],
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    message: {
      type: String,
      trim: true,
      maxlength: [2000, 'Message cannot exceed 2000 characters'],
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      default: null,
    },
    productName: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: { values: ENQUIRY_STATUS, message: 'Status must be Pending, Contacted, or Closed' },
      default: 'Pending',
      index: true,
    },
    source: {
      type: String,
      enum: { values: ENQUIRY_SOURCE, message: 'Invalid source value' },
      default: 'Website',
    },
    adminNotes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Admin notes cannot exceed 1000 characters'],
      select: false, // hidden from public queries
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    emailSent: {
      type: Boolean,
      default: false,
    },
    followUpAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

enquirySchema.index({ createdAt: -1 });
enquirySchema.index({ status: 1, createdAt: -1 });
enquirySchema.index({ phone: 1 });

// Virtual: days since enquiry
enquirySchema.virtual('age').get(function () {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24));
});

module.exports = mongoose.model('Enquiry', enquirySchema);
