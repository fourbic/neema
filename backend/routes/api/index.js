const express = require('express');
const router = express.Router();

const calendarRoutes = require('./calendar');
const emailsRoutes = require('./emails');
const productivityRoutes = require('./productivity');
const safetyRoutes = require('../safety');

router.use('/calendar', calendarRoutes);
router.use('/emails', emailsRoutes);
router.use('/productivity', productivityRoutes);
router.use('/safety', safetyRoutes);

module.exports = router;