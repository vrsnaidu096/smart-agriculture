const express = require('express');
const router = express.Router();
const alertsController = require('../controllers/alerts.controller');

// GET /api/alerts/:farmId
router.get('/:farmId', alertsController.getAlerts);

module.exports = router;
