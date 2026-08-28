const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/review.controller');

// GET  /api/review/pending          -> images awaiting a human label
// PATCH /api/review/images/:imageId -> set the confirmed label
router.get('/pending', reviewController.listUnverified);
router.patch('/images/:imageId', reviewController.verifyLabel);

module.exports = router;
