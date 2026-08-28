/**
 * Consistent API envelopes (spec section 23).
 * Every route replies through these so the mobile client can rely on one shape.
 */

const ok = (res, data, status = 200) =>
  res.status(status).json({ success: true, data });

const fail = (res, message, code = 'ERROR', status = 400) =>
  res.status(status).json({ success: false, error: { message, code } });

const notFound = (res, message = 'Not found') => fail(res, message, 'NOT_FOUND', 404);

const badRequest = (res, message, code = 'BAD_REQUEST') => fail(res, message, code, 400);

module.exports = { ok, fail, notFound, badRequest };
