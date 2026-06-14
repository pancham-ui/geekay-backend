'use strict';
// controllers/enquiryController.js

const { validationResult } = require('express-validator');
const Enquiry = require('../models/Enquiry');
const Product = require('../models/Product');
const { sendEnquiryNotification } = require('../utils/sendEmail');
const logger = require('../utils/logger');

// ─── @POST /api/enquiries ─────────────────────────────────────
const createEnquiry = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, errors: errors.array() });
    }

    const { customerName, phone, email, message, productId, source } = req.body;

    // Resolve product name if productId provided
    let productName = '';
    let productRef = null;
    if (productId) {
      const product = await Product.findById(productId).select('name').lean();
      if (product) {
        productName = product.name;
        productRef = product._id;
        // Increment product enquiry counter (non-blocking)
        Product.incrementEnquiries(productRef).catch(() => {});
      }
    }

    const enquiry = await Enquiry.create({
      customerName,
      phone,
      email,
      message,
      product: productRef,
      productName,
      source: source || 'Website',
    });

    // Send email notifications (non-blocking — don't fail the request if email fails)
    sendEnquiryNotification({ ...enquiry.toObject(), createdAt: enquiry.createdAt })
      .then((results) => {
        const adminSent = results[0]?.status === 'fulfilled';
        if (adminSent) {
          Enquiry.findByIdAndUpdate(enquiry._id, { emailSent: true }).exec();
        }
      })
      .catch((err) => logger.error('Enquiry email error:', err.message));

    logger.info(`New enquiry from ${customerName} (${phone})`);

    res.status(201).json({
      success: true,
      message: 'Thank you! Your enquiry has been received. We will contact you shortly.',
      enquiryId: enquiry._id,
    });
  } catch (err) {
    next(err);
  }
};

// ─── @GET /api/enquiries ──────────────────────────────────────
const getEnquiries = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.isRead !== undefined) filter.isRead = req.query.isRead === 'true';
    if (req.query.source) filter.source = req.query.source;

    // Date range filter
    if (req.query.from || req.query.to) {
      filter.createdAt = {};
      if (req.query.from) filter.createdAt.$gte = new Date(req.query.from);
      if (req.query.to) {
        const to = new Date(req.query.to);
        to.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = to;
      }
    }

    // Search by name or phone
    if (req.query.search) {
      const s = req.query.search.trim();
      filter.$or = [
        { customerName: { $regex: s, $options: 'i' } },
        { phone: { $regex: s, $options: 'i' } },
        { productName: { $regex: s, $options: 'i' } },
      ];
    }

    const sort = req.query.sort === 'oldest' ? { createdAt: 1 } : { createdAt: -1 };

    const [enquiries, total, pendingCount, unreadCount] = await Promise.all([
      Enquiry.find(filter)
        .populate('product', 'name slug')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Enquiry.countDocuments(filter),
      Enquiry.countDocuments({ status: 'Pending' }),
      Enquiry.countDocuments({ isRead: false }),
    ]);

    res.json({
      success: true,
      count: enquiries.length,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      meta: { pendingCount, unreadCount },
      enquiries,
    });
  } catch (err) {
    next(err);
  }
};

// ─── @GET /api/enquiries/:id ──────────────────────────────────
const getEnquiry = async (req, res, next) => {
  try {
    const enquiry = await Enquiry.findById(req.params.id)
      .populate('product', 'name slug images')
      .select('+adminNotes');

    if (!enquiry) {
      return res.status(404).json({ success: false, message: 'Enquiry not found.' });
    }

    // Mark as read
    if (!enquiry.isRead) {
      enquiry.isRead = true;
      await enquiry.save();
    }

    res.json({ success: true, enquiry });
  } catch (err) {
    next(err);
  }
};

// ─── @PATCH /api/enquiries/:id/status ────────────────────────
const updateEnquiryStatus = async (req, res, next) => {
  try {
    const { status, adminNotes, followUpAt } = req.body;

    const validStatuses = ['Pending', 'Contacted', 'Closed'];
    if (status && !validStatuses.includes(status)) {
      return res.status(422).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const updateData = {};
    if (status) updateData.status = status;
    if (adminNotes !== undefined) updateData.adminNotes = adminNotes;
    if (followUpAt !== undefined) updateData.followUpAt = followUpAt ? new Date(followUpAt) : null;

    const enquiry = await Enquiry.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!enquiry) {
      return res.status(404).json({ success: false, message: 'Enquiry not found.' });
    }

    logger.info(`Enquiry ${enquiry._id} status → ${status}`);
    res.json({ success: true, message: 'Enquiry updated.', enquiry });
  } catch (err) {
    next(err);
  }
};

// ─── @PATCH /api/enquiries/:id/read ──────────────────────────
const markAsRead = async (req, res, next) => {
  try {
    const enquiry = await Enquiry.findByIdAndUpdate(
      req.params.id,
      { isRead: true },
      { new: true }
    );
    if (!enquiry) {
      return res.status(404).json({ success: false, message: 'Enquiry not found.' });
    }
    res.json({ success: true, message: 'Marked as read.' });
  } catch (err) {
    next(err);
  }
};

// ─── @DELETE /api/enquiries/:id ───────────────────────────────
const deleteEnquiry = async (req, res, next) => {
  try {
    const enquiry = await Enquiry.findByIdAndDelete(req.params.id);
    if (!enquiry) {
      return res.status(404).json({ success: false, message: 'Enquiry not found.' });
    }
    logger.info(`Enquiry deleted: ${enquiry._id}`);
    res.json({ success: true, message: 'Enquiry deleted.' });
  } catch (err) {
    next(err);
  }
};

// ─── @DELETE /api/enquiries/bulk-delete ──────────────────────
const bulkDeleteEnquiries = async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || !ids.length) {
      return res.status(400).json({ success: false, message: 'Provide an array of ids.' });
    }

    const result = await Enquiry.deleteMany({ _id: { $in: ids } });
    logger.info(`Bulk deleted ${result.deletedCount} enquiries`);
    res.json({ success: true, message: `${result.deletedCount} enquiries deleted.` });
  } catch (err) {
    next(err);
  }
};

// ─── @GET /api/enquiries/stats ────────────────────────────────
const getEnquiryStats = async (req, res, next) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [statusBreakdown, last30Days, topProducts] = await Promise.all([
      Enquiry.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Enquiry.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
      Enquiry.aggregate([
        { $match: { productName: { $ne: '' } } },
        { $group: { _id: '$productName', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]),
    ]);

    res.json({
      success: true,
      stats: {
        statusBreakdown: statusBreakdown.reduce((acc, s) => ({ ...acc, [s._id]: s.count }), {}),
        last30Days,
        topProducts,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createEnquiry,
  getEnquiries,
  getEnquiry,
  updateEnquiryStatus,
  markAsRead,
  deleteEnquiry,
  bulkDeleteEnquiries,
  getEnquiryStats,
};
