const express = require('express');
const router = express.Router();
const mapController = require('../controllers/map.controller');

router.post('/boundary', mapController.saveBoundary);
router.get('/:farmId', mapController.getMapData);

module.exports = router;
