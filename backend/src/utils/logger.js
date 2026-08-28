/**
 * Minimal levelled logger. Swap the sink for pino/winston later without
 * touching call sites.
 */

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };
const threshold = LEVELS[(process.env.LOG_LEVEL || 'info').toLowerCase()] ?? LEVELS.info;

const emit = (level, scope, message, meta) => {
  if (LEVELS[level] < threshold) return;
  const line = `[${new Date().toISOString()}] ${level.toUpperCase()} [${scope}] ${message}`;
  const sink = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  meta === undefined ? sink(line) : sink(line, meta);
};

const create = (scope) => ({
  debug: (m, meta) => emit('debug', scope, m, meta),
  info: (m, meta) => emit('info', scope, m, meta),
  warn: (m, meta) => emit('warn', scope, m, meta),
  error: (m, meta) => emit('error', scope, m, meta)
});

module.exports = { create };
