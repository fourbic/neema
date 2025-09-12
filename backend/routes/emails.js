const express = require('express');
const router = express.Router();
const { requireAuthAndLoadUser } = require('../middleware/auth');
const Email = require('../models/Email');

// @route   GET api/emails
// @desc    Get user emails
// @access  Private
router.get('/', requireAuthAndLoadUser, async (req, res) => {
  try {
    const emails = await Email.find({ user: req.dbUser._id }).limit(req.query.limit || 20);
    res.json(emails);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/emails/unread
// @desc    Get unread emails for a user
// @access  Private
router.get('/unread', requireAuthAndLoadUser, async (req, res) => {
  try {
    const emails = await Email.find({ user: req.dbUser._id, isRead: false });
    res.json(emails);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;