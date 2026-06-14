'use strict';
// scripts/createAdmin.js
// Run: npm run seed:admin

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const mongoose = require('mongoose');
const Admin = require('../models/Admin');

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const email = process.env.SEED_ADMIN_EMAIL || 'admin@geekayagencies.com';
    const password = process.env.SEED_ADMIN_PASSWORD || 'ChangeMe@123!';
    const name = 'Subhash Chander Arora';

    const existing = await Admin.findOne({ email });
    if (existing) {
      console.log(`⚠️  Admin already exists: ${email}`);
      process.exit(0);
    }

    const admin = await Admin.create({
      name,
      email,
      password,
      role: 'superadmin',
    });

    console.log('✅ Admin created successfully!');
    console.log('─────────────────────────────────');
    console.log(`   Name  : ${admin.name}`);
    console.log(`   Email : ${admin.email}`);
    console.log(`   Role  : ${admin.role}`);
    console.log('─────────────────────────────────');
    console.log('⚠️  IMPORTANT: Change the password immediately after first login!');
    console.log(`   Default password: ${password}`);
    console.log('─────────────────────────────────');
  } catch (err) {
    console.error('❌ Error creating admin:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

createAdmin();
