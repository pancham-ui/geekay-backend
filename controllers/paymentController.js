'use strict';
// controllers/paymentController.js

const crypto = require('crypto');
const { validationResult } = require('express-validator');
const { getRazorpay } = require('../config/razorpay');
const Booking = require('../models/Booking');
const Product = require('../models/Product');
const { sendBookingNotification } = require('../utils/sendEmail');
const logger = require('../utils/logger');

// Default advance amount in INR (flat amount per product)
const ADVANCE_AMOUNT = parseInt(process.env.ADVANCE_AMOUNT) || 500;

// ─── @POST /api/payments/create-order ────────────────────────
// Creates a Razorpay order for the advance/booking amount
const createOrder = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, errors: errors.array() });
    }

    const razorpay = getRazorpay();
    if (!razorpay) {
      return res.status(503).json({
        success: false,
        message: 'Online payments are not configured yet. Please call us to book.',
      });
    }

    const { productId, customerName, phone, email } = req.body;

    const product = await Product.findOne({ _id: productId, isActive: true }).select('name price');
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    const amountInPaise = ADVANCE_AMOUNT * 100; // Razorpay expects amount in paise

    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt: `gk_${Date.now()}`,
      notes: {
        productId: String(product._id),
        productName: product.name,
        customerName,
        phone,
      },
    });

    const booking = await Booking.create({
      customerName,
      phone,
      email,
      product: product._id,
      productName: product.name,
      productPrice: product.price,
      advanceAmount: ADVANCE_AMOUNT,
      razorpayOrderId: order.id,
      status: 'Created',
    });

    logger.info(`Booking order created: ${order.id} for ${customerName} (${phone}) — ${product.name}`);

    res.status(201).json({
      success: true,
      orderId: order.id,
      amount: amountInPaise,
      currency: 'INR',
      keyId: process.env.RAZORPAY_KEY_ID,
      bookingId: booking._id,
      productName: product.name,
    });
  } catch (err) {
    logger.error('Create order error:', err.message);
    next(err);
  }
};

// ─── @POST /api/payments/verify ───────────────────────────────
// Verifies Razorpay payment signature and marks booking as paid
const verifyPayment = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, errors: errors.array() });
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!process.env.RAZORPAY_KEY_SECRET) {
      return res.status(503).json({ success: false, message: 'Payment verification not configured.' });
    }

    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      logger.warn(`Payment signature mismatch for order ${razorpay_order_id}`);

      await Booking.findOneAndUpdate(
        { razorpayOrderId: razorpay_order_id },
        { status: 'Failed' }
      );

      return res.status(400).json({ success: false, message: 'Payment verification failed.' });
    }

    const booking = await Booking.findOneAndUpdate(
      { razorpayOrderId: razorpay_order_id },
      {
        status: 'Paid',
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
      },
      { new: true }
    );

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    logger.info(`Payment verified for booking ${booking._id} (${booking.customerName}) — ₹${booking.advanceAmount}`);

    // Send email notifications (non-blocking)
    sendBookingNotification(booking.toObject())
      .then((results) => {
        const adminSent = results[0]?.status === 'fulfilled';
        if (adminSent) {
          Booking.findByIdAndUpdate(booking._id, { emailSent: true }).exec();
        }
      })
      .catch((err) => logger.error('Booking email error:', err.message));

    res.json({
      success: true,
      message: 'Payment verified successfully! Your booking is confirmed.',
      booking: {
        id: booking._id,
        productName: booking.productName,
        advanceAmount: booking.advanceAmount,
        status: booking.status,
      },
    });
  } catch (err) {
    logger.error('Verify payment error:', err.message);
    next(err);
  }
};

// ─── @GET /api/payments/bookings ──────────────────────────────
// Admin: list bookings with pagination/filters
const getBookings = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.search) {
      const s = req.query.search.trim();
      filter.$or = [
        { customerName: { $regex: s, $options: 'i' } },
        { phone: { $regex: s, $options: 'i' } },
        { productName: { $regex: s, $options: 'i' } },
      ];
    }

    const [bookings, total] = await Promise.all([
      Booking.find(filter)
        .populate('product', 'name slug')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Booking.countDocuments(filter),
    ]);

    res.json({
      success: true,
      count: bookings.length,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      bookings,
    });
  } catch (err) {
    next(err);
  }
};

// ─── @GET /api/payments/config ────────────────────────────────
// Public: returns Razorpay key ID + advance amount for frontend
const getPaymentConfig = async (req, res, next) => {
  try {
    res.json({
      success: true,
      enabled: !!process.env.RAZORPAY_KEY_ID,
      keyId: process.env.RAZORPAY_KEY_ID || null,
      advanceAmount: ADVANCE_AMOUNT,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { createOrder, verifyPayment, getBookings, getPaymentConfig };
