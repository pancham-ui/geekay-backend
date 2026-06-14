'use strict';
// scripts/seed.js
// Run: npm run seed

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const mongoose = require('mongoose');
const slugify = require('slugify');
const Category = require('../models/Category');
const Brand = require('../models/Brand');
const Product = require('../models/Product');

// ─── Seed Data ────────────────────────────────────────────────
const CATEGORIES = [
  { name: 'Kitchen Chimneys',       description: 'Wall-mounted and island chimneys for smoke-free kitchens.',        icon: '💨', displayOrder: 1 },
  { name: 'Built-in Hobs',          description: 'Gas and electric built-in hobs for modern modular kitchens.',       icon: '🔥', displayOrder: 2 },
  { name: 'Gas Stoves',             description: 'Free-standing gas stoves with toughened glass and auto-ignition.',  icon: '🍳', displayOrder: 3 },
  { name: 'Stainless Steel Sinks',  description: '304 and 316 grade sinks in single and double bowl options.',        icon: '🚰', displayOrder: 4 },
  { name: 'Designer Faucets',       description: 'Premium kitchen mixer taps and pull-out faucets.',                  icon: '🚿', displayOrder: 5 },
  { name: 'Water Purifiers',        description: 'RO+UV+UF water purifiers for safe drinking water.',                 icon: '💧', displayOrder: 6 },
  { name: 'Modular Storage',        description: 'Pull-outs, carousels, baskets and pantry systems.',                 icon: '📦', displayOrder: 7 },
  { name: 'Cabinet Hardware',       description: 'Hinges, handles, channels and soft-close mechanisms.',              icon: '🔧', displayOrder: 8 },
  { name: 'Wardrobe Accessories',   description: 'Wardrobe lift systems, trouser racks, and organizers.',             icon: '👔', displayOrder: 9 },
  { name: 'Kitchen Organizers',     description: 'Cutlery trays, spice racks, and in-drawer organizers.',             icon: '🗂️', displayOrder: 10 },
];

const BRANDS = [
  { name: 'Hafele',      country: 'Germany', website: 'https://www.hafele.com',          description: 'World leader in furniture fittings and architectural hardware.' },
  { name: 'Hettich',     country: 'Germany', website: 'https://www.hettich.com',         description: 'Premium drawer systems, hinges and sliding door hardware.' },
  { name: 'Ebco',        country: 'India',   website: 'https://www.ebco.in',             description: "India's leading manufacturer of furniture hardware." },
  { name: 'Franke',      country: 'Germany', website: 'https://www.franke.com',          description: 'Premium sinks, faucets and kitchen systems.' },
  { name: 'KAFF',        country: 'India',   website: 'https://www.kaff.in',             description: 'Built-in kitchen appliances — chimneys, hobs, and ovens.' },
  { name: 'Faber',       country: 'Italy',   website: 'https://www.faber-india.com',     description: 'Italian kitchen appliances sold across 50 countries.' },
  { name: 'Aquaguard',   country: 'India',   website: 'https://www.aquaguard.com',       description: 'India\'s most trusted water purifier brand.' },
  { name: 'Hindware',    country: 'India',   website: 'https://www.hindware.com',        description: 'Bathroom and kitchen hardware solutions.' },
  { name: 'Carysil',     country: 'India',   website: 'https://www.carysil.com',         description: 'Premium kitchen sinks in granite and stainless steel.' },
  { name: 'Blum',        country: 'Austria', website: 'https://www.blum.com',            description: 'World-class motion technology for furniture.' },
];

// Products are built after categories and brands are created, so we use refs
const buildProducts = (catMap, brandMap) => [
  {
    name: 'Triton Pro 1200 Auto-Clean Chimney',
    description: 'Wall-mounted auto-clean chimney with 1200 m³/hr suction capacity. Features baffle filters, touch and gesture control, and energy-efficient LED lighting. Ideal for Indian cooking with heavy oil and spice usage.',
    shortDescription: 'Auto-clean chimney with 1200 m³/hr suction and baffle filters.',
    category: catMap['Kitchen Chimneys'],
    brand: brandMap['KAFF'],
    price: 14500,
    discountPrice: 12500,
    priceLabel: 'Starting from',
    features: [
      '1200 m³/hr suction capacity',
      'Auto-clean with removable oil collector',
      'Baffle filter — dishwasher safe',
      'Touch + gesture control panel',
      'Energy-efficient LED lighting',
      'Filterless technology option available',
    ],
    specifications: [
      { key: 'Suction Power', value: '1200 m³/hr' },
      { key: 'Filter Type', value: 'Baffle Filter' },
      { key: 'Control Type', value: 'Touch + Gesture' },
      { key: 'Motor', value: 'Single Motor' },
      { key: 'Warranty', value: '2 Years' },
      { key: 'Width', value: '60 cm / 90 cm' },
    ],
    stock: -1,
    featured: true,
    tags: ['chimney', 'auto-clean', 'kitchen-appliance', 'bestseller'],
  },
  {
    name: 'Opus 4-Burner Built-in Hob',
    description: 'Premium 4-burner built-in gas hob with Italian brass burners, auto-ignition on all burners, and a sleek stainless steel body. Designed for flush installation in modular kitchens.',
    category: catMap['Built-in Hobs'],
    brand: brandMap['KAFF'],
    price: 9999,
    discountPrice: 8499,
    priceLabel: 'Starting from',
    features: [
      '4 Italian brass burners',
      'Auto-ignition on all burners',
      'Flame failure safety device',
      'Cast iron pan supports',
      'Flush installation design',
    ],
    specifications: [
      { key: 'Burners', value: '4 (2 Heavy + 1 Medium + 1 Small)' },
      { key: 'Body Material', value: 'Stainless Steel' },
      { key: 'Ignition', value: 'Auto Electric' },
      { key: 'Gas Type', value: 'LPG / PNG' },
      { key: 'Warranty', value: '2 Years' },
      { key: 'Cutout Size', value: '720 × 390 mm' },
    ],
    stock: -1,
    featured: true,
    tags: ['hob', 'built-in', 'gas', 'modular-kitchen'],
  },
  {
    name: 'Blaze 4-Burner Toughened Glass Stove',
    description: 'Free-standing 4-burner gas stove with premium toughened glass top and auto-ignition. ISI certified with a spill-proof design and easy-clean surface.',
    category: catMap['Gas Stoves'],
    brand: brandMap['Hindware'],
    price: 5999,
    discountPrice: 4999,
    features: [
      'Toughened glass cooktop',
      'Auto-ignition for all 4 burners',
      '2 heavy + 1 medium + 1 small burner',
      'Stainless steel drip tray',
      'ISI certified',
    ],
    specifications: [
      { key: 'Burners', value: '4' },
      { key: 'Cooktop', value: 'Toughened Glass' },
      { key: 'Pan Support', value: 'Cast Iron' },
      { key: 'Gas Type', value: 'LPG' },
      { key: 'Warranty', value: '1 Year' },
    ],
    stock: 15,
    featured: false,
    tags: ['gas-stove', 'freestanding'],
  },
  {
    name: 'Nova Single Bowl Sink 36"',
    description: '304-grade stainless steel single bowl kitchen sink with deep 7-inch bowl, anti-noise rubber padding, and satin finish. Includes plumbing fittings.',
    category: catMap['Stainless Steel Sinks'],
    brand: brandMap['Carysil'],
    price: 4800,
    discountPrice: 3999,
    priceLabel: 'Starting from',
    features: [
      '304-grade 8" deep bowl',
      'Anti-noise rubber undercoating',
      'Satin brushed finish',
      'Compatible with all standard tap holes',
      'Drainage coupling included',
    ],
    specifications: [
      { key: 'Grade', value: '304 Stainless Steel' },
      { key: 'Bowl Depth', value: '8 inches' },
      { key: 'Overall Size', value: '36" × 18"' },
      { key: 'Thickness', value: '0.8 mm' },
      { key: 'Finish', value: 'Satin' },
    ],
    stock: -1,
    featured: true,
    tags: ['sink', 'stainless-steel', 'single-bowl'],
  },
  {
    name: 'Duo Double Bowl Sink 45"',
    description: '316-grade stainless steel double bowl sink with scratch-resistant nano coating. Suitable for large modular kitchens requiring separate prep and wash zones.',
    category: catMap['Stainless Steel Sinks'],
    brand: brandMap['Franke'],
    price: 8500,
    discountPrice: 6999,
    features: [
      '316-grade premium steel',
      'Nano scratch-resistant coating',
      'Twin bowls: 450mm + 250mm',
      'Undermount or top-mount install',
      'Anti-drip lip design',
    ],
    specifications: [
      { key: 'Grade', value: '316 Stainless Steel' },
      { key: 'Bowl Depth', value: '8 + 6 inches' },
      { key: 'Overall Size', value: '45" × 20"' },
      { key: 'Finish', value: 'Nano Coating' },
    ],
    stock: -1,
    featured: false,
    tags: ['sink', 'double-bowl', 'stainless-steel'],
  },
  {
    name: 'Cascade Pull-Out Kitchen Faucet',
    description: 'Contemporary single-lever pull-out kitchen tap with 360° swivel spout, ceramic cartridge valve, and chrome finish. Suitable for all standard basin hole sizes.',
    category: catMap['Designer Faucets'],
    brand: brandMap['Hindware'],
    price: 4200,
    discountPrice: 3500,
    features: [
      '360° swivel spout',
      'Pull-out spray with 2 modes (stream + spray)',
      'Ceramic cartridge — drip-free',
      'Single lever hot & cold control',
      'Chrome finish — rust resistant',
    ],
    specifications: [
      { key: 'Material', value: 'Brass body, chrome finish' },
      { key: 'Flow Rate', value: '8 L/min' },
      { key: 'Spout Reach', value: '220 mm' },
      { key: 'Hose Length', value: '1.5 m' },
      { key: 'Warranty', value: '5 Years (cartridge)' },
    ],
    stock: -1,
    featured: false,
    tags: ['faucet', 'pull-out', 'kitchen-tap'],
  },
  {
    name: 'AquaPlus 7-Stage RO+UV Water Purifier',
    description: '7-stage purification including RO, UV and UF with TDS controller and alkaline mineral enhancer. 12-litre storage tank with auto-shutoff and filter change alerts.',
    category: catMap['Water Purifiers'],
    brand: brandMap['Aquaguard'],
    price: 11999,
    discountPrice: 9499,
    features: [
      'RO + UV + UF 7-stage purification',
      'TDS controller for mineral retention',
      'Alkaline mineral cartridge',
      '12-litre food-grade storage tank',
      'Auto shutoff & filter life indicator',
    ],
    specifications: [
      { key: 'Purification Stages', value: '7' },
      { key: 'Tank Capacity', value: '12 Litres' },
      { key: 'Purification Rate', value: '15 L/hr' },
      { key: 'Input TDS Range', value: 'Up to 2000 ppm' },
      { key: 'Warranty', value: '1 Year (comprehensive)' },
    ],
    stock: -1,
    featured: true,
    tags: ['water-purifier', 'ro', 'uv'],
  },
  {
    name: 'Magic Corner Kidney Carousel',
    description: 'Full-extension kidney-shaped rotating carousel for blind corner cabinets. Maximises every centimetre of corner space with smooth ball-bearing rotation and soft-close return.',
    category: catMap['Modular Storage'],
    brand: brandMap['Hafele'],
    price: 8500,
    discountPrice: 6999,
    features: [
      'Full-extension pull-out with auto-return',
      'Kidney-shaped epoxy-coated trays',
      'Ball-bearing rotation mechanism',
      'Fits 900 mm × 900 mm corner cabinets',
      'Adjustable shelf height',
    ],
    specifications: [
      { key: 'Cabinet Size', value: '900 × 900 mm corner' },
      { key: 'Tray Shape', value: 'Kidney (crescent)' },
      { key: 'Finish', value: 'Chrome + Grey epoxy' },
      { key: 'Load Capacity', value: '25 kg per tray' },
    ],
    stock: -1,
    featured: true,
    tags: ['modular-storage', 'corner-unit', 'carousel'],
  },
  {
    name: 'Tandem Soft-Close Drawer System',
    description: 'Premium full-extension tandem drawer box with integrated soft-close mechanism. 40 kg load capacity with anti-tipping protection. Includes adjustable side organizer rails.',
    category: catMap['Modular Storage'],
    brand: brandMap['Hettich'],
    price: 6200,
    discountPrice: 5299,
    features: [
      'Full 550mm extension',
      '40 kg load capacity',
      'Integrated soft-close',
      'Anti-tipping lock',
      'Available in 3 heights and 3 widths',
    ],
    specifications: [
      { key: 'Extension', value: 'Full (550 mm)' },
      { key: 'Load Rating', value: '40 kg' },
      { key: 'Material', value: 'Steel + ABS sides' },
      { key: 'Available Widths', value: '300 / 400 / 500 mm' },
    ],
    stock: -1,
    featured: false,
    tags: ['drawer', 'soft-close', 'tandem', 'modular-storage'],
  },
  {
    name: 'Tall Pantry Pull-Out System',
    description: 'Floor-to-ceiling tall unit pull-out with 4 adjustable shelves and full-extension soft-close glides. Ideal for storing dry goods, bottles and kitchen essentials in a 600mm cabinet.',
    category: catMap['Modular Storage'],
    brand: brandMap['Hafele'],
    price: 13500,
    discountPrice: 11200,
    features: [
      '4 adjustable wire shelves',
      'Full-extension 560 mm depth',
      'Soft-close undermount glides',
      'Grey epoxy powder-coat finish',
      'Fits standard 600mm base cabinet',
    ],
    specifications: [
      { key: 'Depth', value: '560 mm (full extension)' },
      { key: 'Shelves', value: '4 (adjustable height)' },
      { key: 'Cabinet Width', value: '600 mm' },
      { key: 'Finish', value: 'Grey epoxy + chrome' },
    ],
    stock: -1,
    featured: false,
    tags: ['pantry', 'pull-out', 'modular-storage'],
  },
  {
    name: 'Concealed Soft-Close Hinges (Pair)',
    description: 'European concealed cabinet hinges with integrated damper for whisper-quiet door closing. 3D adjustable (up/down, left/right, in/out) with easy clip-on mounting.',
    category: catMap['Cabinet Hardware'],
    brand: brandMap['Blum'],
    price: 180,
    features: [
      '110° full opening angle',
      'Integrated soft-close damper',
      '3D adjustment: height, depth, lateral',
      'Easy press-on clip mounting',
      'Nickel-plated finish',
    ],
    specifications: [
      { key: 'Opening Angle', value: '110°' },
      { key: 'Mounting', value: 'Clip-on (tool-free removal)' },
      { key: 'Overlay', value: 'Full / Half / Inset options' },
      { key: 'Finish', value: 'Nickel plated' },
    ],
    stock: 500,
    featured: false,
    priceLabel: '₹180 per pair',
    tags: ['hinge', 'soft-close', 'hardware'],
  },
  {
    name: 'Square Bar Cabinet Handles',
    description: 'Minimal 4mm square-bar cabinet handles in brushed gold, polished chrome, and matte black. Available in 4 lengths. Matching screws included.',
    category: catMap['Cabinet Hardware'],
    brand: brandMap['Hafele'],
    price: 220,
    features: [
      '4mm square-bar profile',
      'Brushed gold, chrome, matte black',
      'Available in 128 / 160 / 192 / 256 mm',
      'Zinc alloy with premium plating',
      'Matching M4 screws included',
    ],
    specifications: [
      { key: 'Material', value: 'Zinc alloy' },
      { key: 'Profile', value: '4mm square bar' },
      { key: 'Lengths', value: '128, 160, 192, 256 mm' },
      { key: 'Finishes', value: 'Brushed Gold, Chrome, Matte Black' },
    ],
    stock: 1000,
    priceLabel: 'From ₹220 per piece',
    featured: false,
    tags: ['handle', 'hardware', 'cabinet'],
  },
  {
    name: 'Full-Extension Undermount Drawer Channels',
    description: 'Synchronised full-extension undermount runners with whisper-quiet soft-close. Invisible when drawer is closed, rated for 45 kg. Available in 400–600 mm lengths.',
    category: catMap['Cabinet Hardware'],
    brand: brandMap['Hettich'],
    price: 1100,
    discountPrice: 950,
    features: [
      'Full 550 mm extension',
      '45 kg load capacity per pair',
      'Synchronised soft-close',
      'Undermount — invisible when closed',
      'Available in 400, 450, 500, 550, 600 mm',
    ],
    specifications: [
      { key: 'Extension', value: 'Full' },
      { key: 'Load Rating', value: '45 kg per pair' },
      { key: 'Close Type', value: 'Soft-close (both sides)' },
      { key: 'Lengths', value: '400–600 mm' },
    ],
    stock: -1,
    priceLabel: 'From ₹950 per pair',
    featured: false,
    tags: ['drawer-channel', 'undermount', 'soft-close', 'hardware'],
  },
  {
    name: 'Bottle Pull-Out 150mm',
    description: 'Slim 150mm narrow pull-out for 150mm base cabinets. 4 adjustable shelves for bottles, oils, and cleaning supplies. Full-extension soft-close runner included.',
    category: catMap['Modular Storage'],
    brand: brandMap['Ebco'],
    price: 3800,
    discountPrice: 3200,
    features: [
      'Fits 150 mm narrow base cabinet',
      '4 non-slip shelf tiers',
      'Full-extension runner',
      'Soft-close mechanism',
      'Chrome + grey finish',
    ],
    specifications: [
      { key: 'Cabinet Width', value: '150 mm' },
      { key: 'Shelf Count', value: '4' },
      { key: 'Extension', value: 'Full' },
      { key: 'Finish', value: 'Chrome + Grey' },
    ],
    stock: -1,
    featured: false,
    tags: ['bottle-pull-out', 'modular-storage', 'narrow-cabinet'],
  },
  {
    name: 'Dual Waste Bin Pull-Out',
    description: 'Under-sink 2-bin pull-out with automatic lid-opening mechanism. Segregated compartments for wet and dry waste. Fits 400mm base cabinet.',
    category: catMap['Kitchen Organizers'],
    brand: brandMap['Hafele'],
    price: 5200,
    discountPrice: 4499,
    features: [
      '2 × 15 litre removable bins',
      'Automatic lid opens on pull',
      'Odour-control lid seal',
      'Fits 400 mm base cabinet',
      'Removable bins for easy cleaning',
    ],
    specifications: [
      { key: 'Bin Capacity', value: '2 × 15 L' },
      { key: 'Cabinet Width', value: '400 mm' },
      { key: 'Material', value: 'PP bins + steel frame' },
      { key: 'Mechanism', value: 'Auto lid with door mount' },
    ],
    stock: -1,
    featured: false,
    tags: ['waste-bin', 'pull-out', 'kitchen-organizer'],
  },
  {
    name: 'Modular Cutlery Tray Organizer',
    description: 'Adjustable bamboo and stainless steel cutlery insert with flexible dividers. Custom-cuts to fit any drawer width from 300 to 900 mm.',
    category: catMap['Kitchen Organizers'],
    brand: brandMap['Ebco'],
    price: 1800,
    discountPrice: 1399,
    features: [
      'Adjustable dividers — fits 300–900mm drawers',
      'Bamboo + stainless steel combination',
      'Anti-slip rubberized base',
      'Easy wipe-clean surface',
      'Compartments for fork, spoon, knife, ladle',
    ],
    specifications: [
      { key: 'Material', value: 'Bamboo + Stainless Steel' },
      { key: 'Adjustable Width', value: '300–900 mm' },
      { key: 'Depth', value: '450 mm' },
      { key: 'Compartments', value: '5 adjustable' },
    ],
    stock: 50,
    featured: false,
    tags: ['cutlery-tray', 'organizer', 'drawer'],
  },
];

// ─── Seed function ────────────────────────────────────────────
const seed = async () => {
  try {
    console.log('🌱 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected');

    // ── Clear existing data ──
    console.log('🗑️  Clearing existing data...');
    await Promise.all([
      Category.deleteMany({}),
      Brand.deleteMany({}),
      Product.deleteMany({}),
    ]);

    // ── Seed Categories ──
    console.log('📂 Seeding categories...');
    const categoriesWithSlugs = CATEGORIES.map((c) => ({
      ...c,
      slug: slugify(c.name, { lower: true, strict: true }),
    }));
    const createdCats = await Category.insertMany(categoriesWithSlugs);
    const catMap = {};
    createdCats.forEach((c) => { catMap[c.name] = c._id; });
    console.log(`   ✅ ${createdCats.length} categories created`);

    // ── Seed Brands ──
    console.log('🏷️  Seeding brands...');
    const brandsWithSlugs = BRANDS.map((b) => ({
      ...b,
      slug: slugify(b.name, { lower: true, strict: true }),
    }));
    const createdBrands = await Brand.insertMany(brandsWithSlugs);
    const brandMap = {};
    createdBrands.forEach((b) => { brandMap[b.name] = b._id; });
    console.log(`   ✅ ${createdBrands.length} brands created`);

    // ── Seed Products ──
    console.log('📦 Seeding products...');
    const products = buildProducts(catMap, brandMap);

    // insertMany() skips Mongoose pre('save') hooks, so generate slugs manually
    const usedSlugs = new Set();
    products.forEach((p) => {
      let baseSlug = slugify(p.name, { lower: true, strict: true });
      let slug = baseSlug;
      let counter = 1;
      while (usedSlugs.has(slug)) {
        slug = `${baseSlug}-${counter++}`;
      }
      usedSlugs.add(slug);
      p.slug = slug;
    });

    const createdProducts = await Product.insertMany(products);
    console.log(`   ✅ ${createdProducts.length} products created`);

    // ── Summary ──
    console.log('\n══════════════════════════════');
    console.log('  🎉 Database seeded!');
    console.log(`  Categories : ${createdCats.length}`);
    console.log(`  Brands     : ${createdBrands.length}`);
    console.log(`  Products   : ${createdProducts.length}`);
    console.log('══════════════════════════════\n');
    console.log('Run "npm run seed:admin" to create the admin account.');

  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

seed();
