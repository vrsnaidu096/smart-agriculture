const express = require('express');
const router = express.Router();
const farmController = require('../controllers/farm.controller');

// GET  /api/farms                  -> list farms
// POST /api/farms                  -> create a farm
// GET  /api/farms/:farmId          -> one farm
// GET  /api/farms/:farmId/summary  -> dashboard payload
router.get('/', farmController.listFarms);
router.post('/', farmController.createFarm);
router.get('/:farmId/summary', farmController.getSummary);
router.get('/:farmId', farmController.getFarm);

module.exports = router;
