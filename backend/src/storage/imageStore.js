const crypto = require('crypto');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');

/**
 * Image Store
 * Persists incoming scan images to disk so they can later be exported as
 * training data. Validates by magic bytes (never by the client-supplied
 * data-URL mime type) and de-duplicates by SHA-256 content hash.
 */

const BACKEND_ROOT = path.resolve(__dirname, '../..');

const MAX_IMAGES_PER_SCAN = Number(process.env.MAX_IMAGES_PER_SCAN || 8);
const MAX_IMAGE_BYTES = Number(process.env.MAX_IMAGE_BYTES || 8 * 1024 * 1024);
const STORAGE_SUBDIR = process.env.IMAGE_STORAGE_DIR || 'storage/scans';
const STORAGE_ROOT = path.resolve(BACKEND_ROOT, STORAGE_SUBDIR);

const startsWith = (buffer, bytes) =>
  bytes.every((byte, i) => buffer[i] === byte);

/**
 * Identify the image type from its leading bytes.
 * Returns null for anything we do not recognise as an image.
 */
const detectType = (buffer) => {
  if (!buffer || buffer.length < 12) return null;

  if (startsWith(buffer, [0xff, 0xd8, 0xff])) {
    return { ext: 'jpg', mime: 'image/jpeg' };
  }
  if (startsWith(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return { ext: 'png', mime: 'image/png' };
  }
  if (
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return { ext: 'webp', mime: 'image/webp' };
  }
  return null;
};

/**
 * Strip a data-URL prefix if present and decode to a Buffer.
 */
const decode = (input) => {
  if (typeof input !== 'string' || input.length === 0) return null;
  const base64 = input.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '');
  try {
    const buffer = Buffer.from(base64, 'base64');
    return buffer.length > 0 ? buffer : null;
  } catch (err) {
    return null;
  }
};

/**
 * Persist a single image. Returns a descriptor, or a rejection reason.
 */
const persistOne = async (input, index) => {
  const buffer = decode(input);

  if (!buffer) {
    return { index, ok: false, reason: 'UNDECODABLE' };
  }
  if (buffer.length > MAX_IMAGE_BYTES) {
    return { index, ok: false, reason: 'TOO_LARGE', bytes: buffer.length };
  }

  const type = detectType(buffer);
  if (!type) {
    return { index, ok: false, reason: 'NOT_AN_IMAGE' };
  }

  const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
  const now = new Date();
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');

  const relativeDir = path.posix.join(STORAGE_SUBDIR, year, month);
  const relativePath = path.posix.join(relativeDir, `${sha256}.${type.ext}`);
  const absolutePath = path.resolve(BACKEND_ROOT, relativePath);

  let deduped = false;
  try {
    await fsp.access(absolutePath, fs.constants.F_OK);
    deduped = true;
  } catch (err) {
    await fsp.mkdir(path.dirname(absolutePath), { recursive: true });
    // Write to a temp name first so a crash mid-write cannot leave a
    // truncated file sitting at the content-addressed path.
    const tempPath = `${absolutePath}.${process.pid}.tmp`;
    await fsp.writeFile(tempPath, buffer);
    await fsp.rename(tempPath, absolutePath);
  }

  return {
    index,
    ok: true,
    sha256,
    path: relativePath,
    mime: type.mime,
    bytes: buffer.length,
    deduped
  };
};

/**
 * Persist a batch of images. Never throws: a failure to store an image
 * must not fail the farmer's scan.
 */
const persistBatch = async (images) => {
  if (!Array.isArray(images) || images.length === 0) return [];

  const capped = images.slice(0, MAX_IMAGES_PER_SCAN);
  if (images.length > capped.length) {
    console.warn(
      `[ImageStore] Received ${images.length} images, storing first ${capped.length}.`
    );
  }

  const results = await Promise.all(
    capped.map(async (image, index) => {
      try {
        return await persistOne(image, index);
      } catch (err) {
        console.error(`[ImageStore] Failed to store image ${index}:`, err.message);
        return { index, ok: false, reason: 'WRITE_FAILED' };
      }
    })
  );

  const stored = results.filter((r) => r.ok).length;
  console.log(`[ImageStore] Stored ${stored}/${capped.length} image(s).`);

  return results;
};

const absolutePathFor = (relativePath) =>
  path.resolve(BACKEND_ROOT, relativePath);

module.exports = {
  persistBatch,
  detectType,
  absolutePathFor,
  STORAGE_ROOT,
  MAX_IMAGES_PER_SCAN,
  MAX_IMAGE_BYTES
};
