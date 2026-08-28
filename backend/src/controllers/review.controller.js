const HistoryService = require('../modules/history/history.service');

/**
 * Review Controller
 * Lets a human confirm or correct the label on a stored image. A verified
 * label is the only thing safe to treat as ground truth at training time.
 *
 * NOTE: gated by a shared REVIEW_TOKEN. That is a stopgap until real auth
 * exists — it is not a substitute for it.
 */

const requireReviewToken = (req, res) => {
  const expected = process.env.REVIEW_TOKEN;

  if (!expected) {
    res.status(503).json({
      success: false,
      error: { message: 'Review API disabled: REVIEW_TOKEN is not set.', code: 'REVIEW_DISABLED' }
    });
    return false;
  }

  const provided = req.get('x-review-token');
  if (provided !== expected) {
    res.status(401).json({
      success: false,
      error: { message: 'Invalid review token.', code: 'UNAUTHORIZED' }
    });
    return false;
  }

  return true;
};

class ReviewController {
  async listUnverified(req, res, next) {
    if (!requireReviewToken(req, res)) return;

    try {
      const limit = Math.min(Number(req.query.limit) || 50, 200);
      const images = await HistoryService.getUnverifiedImages(limit);
      res.json({ success: true, data: { count: images.length, images } });
    } catch (error) {
      next(error);
    }
  }

  async verifyLabel(req, res, next) {
    if (!requireReviewToken(req, res)) return;

    try {
      const imageId = Number(req.params.imageId);
      const { verifiedLabel, verifiedBy } = req.body;

      if (!Number.isInteger(imageId) || imageId <= 0) {
        return res.status(400).json({
          success: false,
          error: { message: 'imageId must be a positive integer.', code: 'BAD_ID' }
        });
      }

      if (typeof verifiedLabel !== 'string' || verifiedLabel.trim() === '') {
        return res.status(400).json({
          success: false,
          error: { message: 'verifiedLabel is required.', code: 'MISSING_LABEL' }
        });
      }

      const changed = await HistoryService.verifyImageLabel(
        imageId,
        verifiedLabel.trim(),
        typeof verifiedBy === 'string' && verifiedBy.trim() ? verifiedBy.trim() : 'reviewer'
      );

      if (changed === 0) {
        return res.status(404).json({
          success: false,
          error: { message: 'No image with that id.', code: 'NOT_FOUND' }
        });
      }

      res.json({ success: true, data: { imageId, verifiedLabel: verifiedLabel.trim() } });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ReviewController();
