const express = require('express');
const cors = require('cors');

const config = require('./config/environment');
const log = require('./utils/logger').create('Server');
const { errorHandler, notFoundHandler } = require('./utils/errorHandler');

const app = express();

// Middleware -----------------------------------------------------------------
app.use(cors());

// Base64 images arrive in the JSON body. Sized for MAX_IMAGES_PER_SCAN photos
// plus base64 overhead, rather than the previous blanket 50mb.
const bodyLimit = `${Math.ceil((config.images.maxBytes * config.images.maxPerScan * 1.4) / (1024 * 1024))}mb`;
app.use(express.json({ limit: bodyLimit }));
app.use(express.urlencoded({ limit: bodyLimit, extended: true }));

app.use((req, res, next) => {
  const started = Date.now();
  res.on('finish', () => {
    log.info(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - started}ms`);
  });
  next();
});

// Routes ---------------------------------------------------------------------
app.use('/api/analyze', require('./routes/analysis.routes'));
app.use('/api/map', require('./routes/map.routes'));
app.use('/api/history', require('./routes/history.routes'));
app.use('/api/alerts', require('./routes/alerts.routes'));
app.use('/api/farms', require('./routes/farm.routes'));
app.use('/api/review', require('./routes/review.routes'));

app.get('/health', async (req, res) => {
  const { checkHealth } = require('./integrations/diseaseModel');
  const inference = await checkHealth();
  res.json({
    success: true,
    data: {
      status: 'ok',
      message: 'Smart Agriculture API is running.',
      inferenceService: inference
    }
  });
});

// Error handling -------------------------------------------------------------
app.use(notFoundHandler);
app.use(errorHandler);

app.listen(config.port, () => {
  log.info(`Server is running on port ${config.port}`);
  log.info(`Inference sidecar expected at ${config.ml.serviceUrl}`);
});

module.exports = app;
