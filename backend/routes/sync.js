const express = require('express');
const router = express.Router();
const { syncData } = require('../controllers/syncController');

router.post('/', syncData);

module.exports = router;
