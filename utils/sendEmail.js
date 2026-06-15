'use strict';
// utils/sendEmail.js

const nodemailer = require('nodemailer');
const logger = require('./logger');

// ─── Transport ────────────────────────────────────────────────
const createTransport = () =>
  nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_PORT === '465',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    pool: true,
    maxConnections: 5,
    rateDelta: 1000,
    rateLimit: 5,
  });

// ─── HTML Templates ───────────────────────────────────────────
const enquiryAdminTemplate = (enquiry) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0; }
    .wrapper { max-width: 600px; margin: 30px auto; background: #fff; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.1); }
    .header { background: #1A1A1A; padding: 28px 32px; text-align: center; }
    .header h1 { color: #C9A96E; font-size: 1.4rem; margin: 0; letter-spacing: 0.05em; }
    .header p { color: rgba(255,255,255,0.6); font-size: 0.85rem; margin: 6px 0 0; }
    .alert-bar { background: #C9A96E; color: #1A1A1A; text-align: center; padding: 10px; font-weight: 600; font-size: 0.85rem; letter-spacing: 0.08em; }
    .body { padding: 32px; }
    .field { margin-bottom: 18px; }
    .field label { display: block; font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #888; margin-bottom: 4px; }
    .field span { font-size: 1rem; color: #1A1A1A; }
    .message-box { background: #f9f9f9; border-left: 4px solid #C9A96E; padding: 16px 20px; border-radius: 4px; margin-top: 8px; color: #333; font-size: 0.9rem; line-height: 1.7; }
    .cta { text-align: center; margin: 28px 0 12px; }
    .cta a { background: #C9A96E; color: #1A1A1A; padding: 13px 32px; border-radius: 100px; text-decoration: none; font-weight: 700; font-size: 0.9rem; display: inline-block; }
    .footer { background: #f4f4f4; padding: 20px 32px; text-align: center; color: #999; font-size: 0.78rem; }
    .divider { border: none; border-top: 1px solid #eee; margin: 24px 0; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>Gee Kay Agencies</h1>
      <p>Premium Kitchen Accessories & Hardware — Sunam, Punjab</p>
    </div>
    <div class="alert-bar">🔔 NEW ENQUIRY RECEIVED</div>
    <div class="body">
      <div class="field">
        <label>Customer Name</label>
        <span>${enquiry.customerName}</span>
      </div>
      <div class="field">
        <label>Phone</label>
        <span><a href="tel:${enquiry.phone}" style="color:#C9A96E;">${enquiry.phone}</a></span>
      </div>
      ${enquiry.email ? `
      <div class="field">
        <label>Email</label>
        <span><a href="mailto:${enquiry.email}" style="color:#C9A96E;">${enquiry.email}</a></span>
      </div>` : ''}
      ${enquiry.productName ? `
      <div class="field">
        <label>Product Interested In</label>
        <span>${enquiry.productName}</span>
      </div>` : ''}
      ${enquiry.message ? `
      <div class="field">
        <label>Message</label>
        <div class="message-box">${enquiry.message}</div>
      </div>` : ''}
      <hr class="divider">
      <div class="field">
        <label>Received At</label>
        <span>${new Date(enquiry.createdAt || Date.now()).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</span>
      </div>
      <div class="field">
        <label>Source</label>
        <span>${enquiry.source || 'Website'}</span>
      </div>
      <div class="cta">
        <a href="tel:${enquiry.phone}">Call Customer Now</a>
      </div>
    </div>
    <div class="footer">
      Gee Kay Agencies &bull; Sunam, Punjab, India &bull; +91 9417750577
    </div>
  </div>
</body>
</html>
`;

const enquiryCustomerTemplate = (enquiry) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0; }
    .wrapper { max-width: 600px; margin: 30px auto; background: #fff; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.1); }
    .header { background: #1A1A1A; padding: 32px; text-align: center; }
    .header h1 { color: #C9A96E; font-size: 1.5rem; margin: 0; }
    .header p { color: rgba(255,255,255,0.6); margin: 8px 0 0; font-size: 0.85rem; }
    .body { padding: 36px 32px; }
    .body h2 { font-size: 1.2rem; color: #1A1A1A; margin-bottom: 12px; }
    .body p { color: #555; line-height: 1.75; margin-bottom: 14px; }
    .highlight { color: #C9A96E; font-weight: 700; }
    .info-box { background: #f9f9f9; border: 1px solid #eee; border-radius: 8px; padding: 20px 24px; margin: 24px 0; }
    .info-box p { margin: 0; font-size: 0.9rem; }
    .cta { text-align: center; margin: 28px 0; }
    .cta a { background: #C9A96E; color: #1A1A1A; padding: 13px 32px; border-radius: 100px; text-decoration: none; font-weight: 700; font-size: 0.9rem; display: inline-block; margin: 6px; }
    .footer { background: #1A1A1A; padding: 20px 32px; text-align: center; color: rgba(255,255,255,0.4); font-size: 0.78rem; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>Gee Kay Agencies</h1>
      <p>Premium Kitchen Accessories & Hardware — Sunam, Punjab</p>
    </div>
    <div class="body">
      <h2>Thank you, <span class="highlight">${enquiry.customerName}</span>!</h2>
      <p>We've received your enquiry and our team will get back to you shortly. At Gee Kay Agencies, we're committed to helping you find the perfect products for your kitchen.</p>
      ${enquiry.productName ? `<p>You enquired about: <strong>${enquiry.productName}</strong></p>` : ''}
      <div class="info-box">
        <p><strong>📞 For immediate assistance:</strong><br>
        Call us at <a href="tel:+919417750577" style="color:#C9A96E;font-weight:700;">+91 9417750577</a></p>
        <p style="margin-top:10px"><strong>⏰ Business Hours:</strong><br>
        Monday – Saturday, 9:00 AM – 7:00 PM IST</p>
        <p style="margin-top:10px"><strong>📍 Location:</strong><br>
        Sunam, Punjab, India</p>
      </div>
      <div class="cta">
        <a href="https://wa.me/919417750577">WhatsApp Us</a>
        <a href="tel:+919417750577" style="background:#f4f4f4;color:#1A1A1A;border:1px solid #ddd;">Call Now</a>
      </div>
    </div>
    <div class="footer">
      © ${new Date().getFullYear()} Gee Kay Agencies. All rights reserved.<br>
      Sunam, Punjab, India &bull; arorasc077@gmail.com
    </div>
  </div>
</body>
</html>
`;

// ─── Booking (Advance Payment) Templates ──────────────────────
const bookingAdminTemplate = (booking) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0; }
    .wrapper { max-width: 600px; margin: 30px auto; background: #fff; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.1); }
    .header { background: #1A1A1A; padding: 28px 32px; text-align: center; }
    .header h1 { color: #C9A96E; font-size: 1.4rem; margin: 0; letter-spacing: 0.05em; }
    .header p { color: rgba(255,255,255,0.6); font-size: 0.85rem; margin: 6px 0 0; }
    .alert-bar { background: #16a34a; color: #fff; text-align: center; padding: 10px; font-weight: 600; font-size: 0.85rem; letter-spacing: 0.08em; }
    .body { padding: 32px; }
    .field { margin-bottom: 18px; }
    .field label { display: block; font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #888; margin-bottom: 4px; }
    .field span { font-size: 1rem; color: #1A1A1A; }
    .amount-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px 20px; text-align: center; margin: 20px 0; }
    .amount-box .amount { font-size: 1.8rem; font-weight: 700; color: #16a34a; }
    .cta { text-align: center; margin: 28px 0 12px; }
    .cta a { background: #C9A96E; color: #1A1A1A; padding: 13px 32px; border-radius: 100px; text-decoration: none; font-weight: 700; font-size: 0.9rem; display: inline-block; }
    .footer { background: #f4f4f4; padding: 20px 32px; text-align: center; color: #999; font-size: 0.78rem; }
    .divider { border: none; border-top: 1px solid #eee; margin: 24px 0; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>Gee Kay Agencies</h1>
      <p>Premium Kitchen Accessories & Hardware — Sunam, Punjab</p>
    </div>
    <div class="alert-bar">✅ NEW BOOKING — ADVANCE PAID</div>
    <div class="body">
      <div class="field">
        <label>Customer Name</label>
        <span>${booking.customerName}</span>
      </div>
      <div class="field">
        <label>Phone</label>
        <span><a href="tel:${booking.phone}" style="color:#C9A96E;">${booking.phone}</a></span>
      </div>
      ${booking.email ? `
      <div class="field">
        <label>Email</label>
        <span><a href="mailto:${booking.email}" style="color:#C9A96E;">${booking.email}</a></span>
      </div>` : ''}
      <div class="field">
        <label>Product</label>
        <span>${booking.productName}</span>
      </div>
      <div class="field">
        <label>Product Price</label>
        <span>₹${Number(booking.productPrice).toLocaleString('en-IN')}</span>
      </div>
      <div class="amount-box">
        <div style="font-size:0.78rem;color:#555;margin-bottom:4px">ADVANCE RECEIVED</div>
        <div class="amount">₹${Number(booking.advanceAmount).toLocaleString('en-IN')}</div>
      </div>
      <hr class="divider">
      <div class="field">
        <label>Payment ID</label>
        <span style="font-size:0.85rem;font-family:monospace">${booking.razorpayPaymentId}</span>
      </div>
      <div class="field">
        <label>Order ID</label>
        <span style="font-size:0.85rem;font-family:monospace">${booking.razorpayOrderId}</span>
      </div>
      <div class="field">
        <label>Received At</label>
        <span>${new Date(booking.createdAt || Date.now()).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</span>
      </div>
      <div class="cta">
        <a href="tel:${booking.phone}">Call Customer Now</a>
      </div>
    </div>
    <div class="footer">
      Gee Kay Agencies &bull; Sunam, Punjab, India &bull; +91 9417750577
    </div>
  </div>
</body>
</html>
`;

const bookingCustomerTemplate = (booking) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0; }
    .wrapper { max-width: 600px; margin: 30px auto; background: #fff; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.1); }
    .header { background: #1A1A1A; padding: 32px; text-align: center; }
    .header h1 { color: #C9A96E; font-size: 1.5rem; margin: 0; }
    .header p { color: rgba(255,255,255,0.6); margin: 8px 0 0; font-size: 0.85rem; }
    .body { padding: 36px 32px; }
    .body h2 { font-size: 1.2rem; color: #1A1A1A; margin-bottom: 12px; }
    .body p { color: #555; line-height: 1.75; margin-bottom: 14px; }
    .highlight { color: #C9A96E; font-weight: 700; }
    .amount-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px 24px; text-align: center; margin: 24px 0; }
    .amount-box .amount { font-size: 2rem; font-weight: 700; color: #16a34a; }
    .info-box { background: #f9f9f9; border: 1px solid #eee; border-radius: 8px; padding: 20px 24px; margin: 24px 0; }
    .info-box p { margin: 0; font-size: 0.9rem; }
    .cta { text-align: center; margin: 28px 0; }
    .cta a { background: #C9A96E; color: #1A1A1A; padding: 13px 32px; border-radius: 100px; text-decoration: none; font-weight: 700; font-size: 0.9rem; display: inline-block; margin: 6px; }
    .footer { background: #1A1A1A; padding: 20px 32px; text-align: center; color: rgba(255,255,255,0.4); font-size: 0.78rem; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>Gee Kay Agencies</h1>
      <p>Premium Kitchen Accessories & Hardware — Sunam, Punjab</p>
    </div>
    <div class="body">
      <h2>Booking Confirmed, <span class="highlight">${booking.customerName}</span>!</h2>
      <p>Thank you for your booking. We've received your advance payment and our team will contact you shortly to confirm details and arrange the rest.</p>
      <p>You booked: <strong>${booking.productName}</strong></p>
      <div class="amount-box">
        <div style="font-size:0.78rem;color:#555;margin-bottom:4px">ADVANCE PAID</div>
        <div class="amount">₹${Number(booking.advanceAmount).toLocaleString('en-IN')}</div>
        <div style="font-size:0.78rem;color:#888;margin-top:6px">Payment ID: ${booking.razorpayPaymentId}</div>
      </div>
      <div class="info-box">
        <p><strong>📞 For immediate assistance:</strong><br>
        Call us at <a href="tel:+919417750577" style="color:#C9A96E;font-weight:700;">+91 9417750577</a></p>
        <p style="margin-top:10px"><strong>⏰ Business Hours:</strong><br>
        Monday – Saturday, 9:00 AM – 7:00 PM IST</p>
        <p style="margin-top:10px"><strong>📍 Location:</strong><br>
        Sunam, Punjab, India</p>
      </div>
      <div class="cta">
        <a href="https://wa.me/919417750577">WhatsApp Us</a>
        <a href="tel:+919417750577" style="background:#f4f4f4;color:#1A1A1A;border:1px solid #ddd;">Call Now</a>
      </div>
    </div>
    <div class="footer">
      © ${new Date().getFullYear()} Gee Kay Agencies. All rights reserved.<br>
      Sunam, Punjab, India &bull; arorasc077@gmail.com
    </div>
  </div>
</body>
</html>
`;

// ─── Main sendEmail function ──────────────────────────────────
const sendEmail = async ({ to, subject, html, text }) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    logger.warn('Email credentials not configured — skipping email send');
    return { skipped: true };
  }
  const transporter = createTransport();
  const info = await transporter.sendMail({
    from: process.env.EMAIL_FROM || `Gee Kay Agencies <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
    text: text || html.replace(/<[^>]+>/g, ''),
  });
  logger.info(`Email sent: ${info.messageId} → ${to}`);
  return info;
};

// ─── Specialised senders ──────────────────────────────────────
const sendEnquiryNotification = async (enquiry) => {
  const results = await Promise.allSettled([
    // Notify admin
    sendEmail({
      to: process.env.ADMIN_EMAIL || 'arorasc077@gmail.com',
      subject: `🔔 New Enquiry from ${enquiry.customerName} — Gee Kay Agencies`,
      html: enquiryAdminTemplate(enquiry),
    }),
    // Confirm to customer (if email provided)
    ...(enquiry.email
      ? [sendEmail({
          to: enquiry.email,
          subject: 'Thank you for your enquiry — Gee Kay Agencies',
          html: enquiryCustomerTemplate(enquiry),
        })]
      : []),
  ]);

  const adminResult = results[0];
  if (adminResult.status === 'rejected') {
    logger.error('Failed to send admin notification email:', adminResult.reason);
  }

  return results;
};

const sendBookingNotification = async (booking) => {
  const results = await Promise.allSettled([
    // Notify admin
    sendEmail({
      to: process.env.ADMIN_EMAIL || 'arorasc077@gmail.com',
      subject: `✅ New Booking (₹${booking.advanceAmount} advance) — ${booking.customerName}`,
      html: bookingAdminTemplate(booking),
    }),
    // Confirm to customer (if email provided)
    ...(booking.email
      ? [sendEmail({
          to: booking.email,
          subject: 'Booking Confirmed — Gee Kay Agencies',
          html: bookingCustomerTemplate(booking),
        })]
      : []),
  ]);

  const adminResult = results[0];
  if (adminResult.status === 'rejected') {
    logger.error('Failed to send booking admin notification email:', adminResult.reason);
  }

  return results;
};

module.exports = { sendEmail, sendEnquiryNotification, sendBookingNotification };
