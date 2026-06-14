'use strict';
// utils/generateToken.js

const jwt = require('jsonwebtoken');

/**
 * Generate a signed JWT for an admin user.
 * @param {string} id - Admin document _id
 * @param {string} role - Admin role
 * @returns {string} Signed JWT
 */
const generateToken = (id, role) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined');
  }
  return jwt.sign(
    { id, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

/**
 * Verify a JWT and return the decoded payload.
 * @param {string} token
 * @returns {object} Decoded payload
 */
const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

module.exports = { generateToken, verifyToken };
