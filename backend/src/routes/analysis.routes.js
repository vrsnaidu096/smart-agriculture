const express = require('express');
const router = express.Router();
const analysisController = require('../controllers/analysis.controller');

// POST /api/analyze
router.post('/', analysisController.analyzeCrop);

module.exports = router;
