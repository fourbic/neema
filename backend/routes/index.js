const express = require('express');
const rateLimit = require('express-rate-limit');
const { requireAuthAndLoadUser } = require('../middleware/auth');

const router = express.Router();

// Rate limiter for AI endpoints (copied from app.js)
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50
});

// Import individual route modules
const productivityRoutes = require('./productivity');
const taskRoutes = require('./tasks');
const projectRoutes = require('./projects');
const noteRoutes = require('./notes');
const userRoutes = require('./users');
const aiRoutes = require('./ai');
const calendarRoutes = require('./api/calendar'); // Adjusted path based on list_dir
const notionRoutes = require('./notion');
const linkedinRoutes = require('./linkedin');
const syncRoutes = require('./sync');
const emailRoutes = require('./emails');

// Apply auth middleware and mount routes
router.use('/productivity', requireAuthAndLoadUser, productivityRoutes);
router.use('/tasks', requireAuthAndLoadUser, taskRoutes);
router.use('/projects', requireAuthAndLoadUser, projectRoutes);
router.use('/notes', requireAuthAndLoadUser, noteRoutes);
router.use('/users', requireAuthAndLoadUser, userRoutes);
// Use AI routes without auth for testing
router.use('/ai', aiLimiter, aiRoutes);

// Integration Routes (also require auth)
router.use('/calendar', requireAuthAndLoadUser, calendarRoutes);
// Mount integration routes under /integrations path within this router
router.use('/integrations/notion', requireAuthAndLoadUser, notionRoutes);
router.use('/integrations/linkedin', requireAuthAndLoadUser, linkedinRoutes);
router.use('/sync', requireAuthAndLoadUser, syncRoutes);
router.use('/emails', requireAuthAndLoadUser, emailRoutes);

module.exports = router;