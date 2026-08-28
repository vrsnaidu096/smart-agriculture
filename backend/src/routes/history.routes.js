const express = require('express');
const router = express.Router();
const historyController = require('../controllers/history.controller');

// GET /api/history/:farmId        -> paginated scan history
// GET /api/history/scan/:scanId   -> one scan
router.get('/scan/:scanId', historyController.getScan);
router.get('/:farmId', historyController.getHistory);

module.exports = router;
