const log = require('./logger').create('Error');

/**
 * Centralised error handling (spec section 24).
 * Detail is logged server-side; the client gets a generic message so internals
 * are not leaked.
 */

class AppError extends Error {
  constructor(message, code = 'APP_ERROR', status = 400) {
    super(message);
    this.code = code;
    this.status = status;
    this.expose = true;
  }
}

const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    error: { message: `No route for ${req.method} ${req.originalUrl}`, code: 'ROUTE_NOT_FOUND' }
  });
};

// eslint-disable-next-line no-unused-vars -- Express identifies handlers by arity
const errorHandler = (err, req, res, next) => {
  const status = err.status || 500;
  log.error(`${req.method} ${req.originalUrl} -> ${status}: ${err.message}`, err.stack);

  res.status(status).json({
    success: false,
    error: {
      message: err.expose ? err.message : 'Something went wrong. Please try again.',
      code: err.code || 'SERVER_ERROR'
    }
  });
};

module.exports = { AppError, errorHandler, notFoundHandler };
