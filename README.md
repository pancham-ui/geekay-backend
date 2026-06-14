# Gee Kay Agencies — Backend API

Production-ready REST API for the Gee Kay Agencies kitchen accessories website.
**Stack:** Node.js · Express.js · MongoDB · Mongoose · JWT · Cloudinary · Nodemailer

---

## Quick Start

### 1. Prerequisites
- Node.js v18+
- MongoDB (local) or a [MongoDB Atlas](https://cloud.mongodb.com) free cluster
- Cloudinary account (free at cloudinary.com) — or skip for local image storage
- Gmail account with an **App Password** (not your regular password)

### 2. Install
```bash
cd geekay-backend
npm install
```

### 3. Configure environment
```bash
cp .env.example .env
# Open .env and fill in every value
```

### 4. Seed database
```bash
npm run seed:admin   # Creates the superadmin account
npm run seed         # Loads sample categories, brands, products
```

### 5. Start
```bash
npm run dev    # Development (auto-restart with nodemon)
npm start      # Production
```

Server runs on **http://localhost:5000**

---

## Environment Variables

| Variable | Description |
|---|---|
| `NODE_ENV` | `development` or `production` |
| `PORT` | Server port (default 5000) |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | 32+ char random string |
| `JWT_EXPIRE` | Token expiry e.g. `7d` |
| `CLOUDINARY_CLOUD_NAME` | From Cloudinary dashboard |
| `CLOUDINARY_API_KEY` | From Cloudinary dashboard |
| `CLOUDINARY_API_SECRET` | From Cloudinary dashboard |
| `EMAIL_HOST` | SMTP host (default `smtp.gmail.com`) |
| `EMAIL_PORT` | SMTP port (default `587`) |
| `EMAIL_USER` | Gmail address |
| `EMAIL_PASS` | Gmail App Password |
| `ADMIN_EMAIL` | Enquiry notification recipient |
| `CLIENT_URL` | Frontend URL for CORS |

---

## API Reference

Base URL: `http://localhost:5000/api`

All protected routes require: `Authorization: Bearer <token>`

---

### Auth — `/api/auth`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/login` | ❌ | Admin login |
| GET | `/me` | ✅ | Get own profile |
| PUT | `/update-password` | ✅ | Change password |
| PUT | `/update-profile` | ✅ | Update name/email |
| POST | `/logout` | ✅ | Logout |
| GET | `/dashboard-stats` | ✅ | Dashboard overview counts |

**POST /api/auth/login**
```json
// Request
{ "email": "admin@geekayagencies.com", "password": "ChangeMe@123!" }

// Response 200
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "admin": { "id": "...", "name": "Subhash Chander Arora", "role": "superadmin" }
}
```

---

### Products — `/api/products`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | ❌ | List products (search, filter, paginate) |
| GET | `/featured` | ❌ | Featured products |
| GET | `/admin/all` | ✅ | All products including inactive |
| GET | `/:id` | ❌ | Single product + related |
| POST | `/` | ✅ | Create product (multipart) |
| PUT | `/:id` | ✅ | Update product |
| DELETE | `/:id` | ✅ | Delete product |
| PATCH | `/:id/toggle-featured` | ✅ | Toggle featured flag |
| PATCH | `/:id/toggle-active` | ✅ | Toggle active/inactive |

**Query Parameters — GET /api/products**

| Param | Type | Example | Description |
|-------|------|---------|-------------|
| `page` | int | `1` | Page number |
| `limit` | int | `12` | Items per page (max 100) |
| `search` | string | `chimney` | Full-text search |
| `category` | ObjectId | `64abc...` | Filter by category |
| `brand` | ObjectId | `64def...` | Filter by brand |
| `featured` | bool | `true` | Featured only |
| `minPrice` | number | `1000` | Minimum price |
| `maxPrice` | number | `20000` | Maximum price |
| `sort` | string | `price_asc` | `newest`, `oldest`, `price_asc`, `price_desc`, `popular` |
| `tags` | string | `sink,steel` | Comma-separated tags |

**POST /api/products** (multipart/form-data)
```
name          = "Product Name"           (required)
description   = "Full description..."    (required)
category      = <ObjectId>               (required)
price         = 9999                     (required)
brand         = <ObjectId>               (optional)
discountPrice = 7999                     (optional)
priceLabel    = "Starting from"          (optional)
stock         = -1                       (-1 = unlimited)
featured      = false
features      = ["Feature 1","Feature 2"]  (JSON array string)
specifications = [{"key":"Material","value":"Steel"}]
tags          = ["chimney","bestseller"]
images        = <file> <file> ...        (up to 10 files)
```

**GET /api/products/:id Response**
```json
{
  "success": true,
  "product": {
    "_id": "...",
    "name": "Triton Pro Auto-Clean Chimney",
    "slug": "triton-pro-auto-clean-chimney",
    "price": 14500,
    "discountPrice": 12500,
    "discountPercent": 14,
    "effectivePrice": 12500,
    "images": [{ "url": "https://res.cloudinary.com/...", "publicId": "...", "altText": "" }],
    "category": { "_id": "...", "name": "Kitchen Chimneys", "slug": "kitchen-chimneys" },
    "brand": { "_id": "...", "name": "KAFF", "logo": {} },
    "features": ["1200 m³/hr suction capacity", "..."],
    "specifications": [{ "key": "Suction Power", "value": "1200 m³/hr" }],
    "featured": true,
    "isActive": true,
    "createdAt": "2025-01-01T00:00:00.000Z"
  },
  "related": [...]
}
```

---

### Categories — `/api/categories`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | ❌ | All active categories (with product counts) |
| GET | `/:id` | ❌ | Single category by ID or slug |
| POST | `/` | ✅ | Create category (multipart — image optional) |
| PUT | `/:id` | ✅ | Update category |
| DELETE | `/:id` | ✅ | Delete (blocked if products exist) |
| PATCH | `/reorder` | ✅ | Bulk update display order |

**PATCH /api/categories/reorder**
```json
{ "order": [{ "id": "64abc...", "displayOrder": 1 }, { "id": "64def...", "displayOrder": 2 }] }
```

---

### Brands — `/api/brands`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | ❌ | All brands |
| GET | `/:id` | ❌ | Single brand (`?withProducts=true` to include products) |
| POST | `/` | ✅ | Create brand (logo upload optional) |
| PUT | `/:id` | ✅ | Update brand |
| DELETE | `/:id` | ✅ | Delete (blocked if products exist) |

---

### Enquiries — `/api/enquiries`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/` | ❌ | Submit enquiry (rate limited: 5/hr/IP) |
| GET | `/` | ✅ | List all enquiries |
| GET | `/stats` | ✅ | Enquiry statistics |
| GET | `/:id` | ✅ | Single enquiry (marks as read) |
| PATCH | `/:id/status` | ✅ | Update status/notes/follow-up |
| PATCH | `/:id/read` | ✅ | Mark as read |
| DELETE | `/:id` | ✅ | Delete single enquiry |
| DELETE | `/bulk-delete` | ✅ | Delete multiple by ID array |

**POST /api/enquiries**
```json
// Request
{
  "customerName": "Harpreet Singh",
  "phone": "9876543210",
  "email": "harpreet@email.com",
  "message": "I want pricing on the magic corner unit.",
  "productId": "64abc123..."
}

// Response 201
{
  "success": true,
  "message": "Thank you! Your enquiry has been received. We will contact you shortly.",
  "enquiryId": "64xyz789..."
}
```

**PATCH /api/enquiries/:id/status**
```json
{
  "status": "Contacted",
  "adminNotes": "Called at 11am, sending quotation via WhatsApp.",
  "followUpAt": "2025-02-15T10:00:00.000Z"
}
```

**GET /api/enquiries?status=Pending&page=1&limit=20&search=Harpreet**

---

## Error Response Format

All errors return:
```json
{
  "success": false,
  "message": "Human-readable error description"
}
```

Validation errors (422):
```json
{
  "success": false,
  "errors": [
    { "field": "phone", "message": "Enter a valid 10-digit Indian mobile number" }
  ]
}
```

---

## HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | OK |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorised (no/invalid token) |
| 403 | Forbidden (insufficient role) |
| 404 | Not Found |
| 409 | Conflict (duplicate or dependency) |
| 422 | Validation Error |
| 423 | Locked (account locked after failed logins) |
| 429 | Too Many Requests (rate limited) |
| 500 | Server Error |

---

## Security Features

- **Helmet** — 11 security headers
- **CORS** — whitelist-only origins
- **Rate limiting** — global (100/15min) + auth (10/15min) + enquiry (5/hr)
- **MongoDB sanitization** — blocks NoSQL injection
- **JWT** with expiry + account lockout after 5 failed logins
- **bcrypt** with 12 salt rounds
- **Input validation** via express-validator on every route
- **Password never returned** in any response (select: false)
- **Cloudinary images** deleted on product/category/brand deletion

---

## Project Structure

```
backend/
├── server.js              # Entry point
├── config/
│   ├── db.js              # MongoDB connection
│   └── cloudinary.js      # Cloudinary + multer storage
├── models/
│   ├── Product.js         # Full product schema + virtuals
│   ├── Category.js        # Category schema
│   ├── Brand.js           # Brand schema
│   ├── Enquiry.js         # Enquiry schema + status enum
│   └── Admin.js           # Admin + bcrypt + lockout logic
├── controllers/
│   ├── authController.js      # Login, profile, stats
│   ├── productController.js   # Full CRUD + search + pagination
│   ├── categoryController.js  # CRUD + reorder
│   ├── brandController.js     # CRUD
│   └── enquiryController.js   # CRUD + email + stats
├── routes/
│   ├── authRoutes.js
│   ├── productRoutes.js
│   ├── categoryRoutes.js
│   ├── brandRoutes.js
│   └── enquiryRoutes.js
├── middleware/
│   ├── auth.js            # protect + restrict
│   ├── upload.js          # multer + cloudinary + local fallback
│   └── errorHandler.js    # Global error handler + AppError class
├── utils/
│   ├── generateToken.js   # JWT sign + verify
│   ├── sendEmail.js       # Nodemailer + HTML templates
│   └── logger.js          # Winston logger
├── scripts/
│   ├── seed.js            # Sample data loader
│   └── createAdmin.js     # First admin setup
└── logs/                  # Winston log files (production)
```

---

## Future Extensions

This backend is designed for easy extension:

- **Inventory management** — `stock` field is already present
- **Online ordering** — add `Order` model, extend `Product` with `isOrderable`
- **Payment integration** — Razorpay/PayU webhook routes under `/api/payments`
- **Admin panel** — connect any React admin (Refine, AdminJS, custom) to these endpoints
- **Image optimization** — Cloudinary transformations already configured
- **Analytics** — `views` and `enquiryCount` fields ready on Product model
