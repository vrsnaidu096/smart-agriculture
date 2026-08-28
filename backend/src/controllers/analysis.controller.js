const FarmOrchestrator = require('../orchestrator/farmOrchestrator');

class AnalysisController {
  async analyzeCrop(req, res, next) {
    try {
      // Changed 'image' to 'images' to support multiple photos
      const { images, latitude, longitude, accuracy, farmId, cropName, language } = req.body;

      // Ensure images is an array and has at least one image
      if (!images || !Array.isArray(images) || images.length === 0 || latitude === undefined || longitude === undefined) {
        return res.status(400).json({
          success: false,
          error: { message: 'An array of images, latitude, and longitude are required.', code: 'MISSING_DATA' }
        });
      }

      // Pass the payload to the orchestrator
      const result = await FarmOrchestrator.processScan({
        images, latitude, longitude, accuracy, farmId, cropName, language
      });

      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AnalysisController();
