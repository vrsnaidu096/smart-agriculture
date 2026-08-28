#!/usr/bin/env node
/**
 * Dataset export.
 *
 * Turns stored scan images into a training-ready folder tree plus a manifest.
 *
 *   node scripts/export-dataset.js --out ./export
 *
 * Defaults are deliberately strict: only human-verified labels from live
 * model runs are exported. Mock predictions are fabricated by the fallback in
 * diseaseModel.js and must never be trained on.
 *
 * Flags:
 *   --out <dir>            output directory (default ./export)
 *   --include-unverified   also export rows whose label is only a prediction
 *   --include-mock         also export rows whose prediction came from a mock
 *   --min-confidence <n>   floor for unverified rows (default 0.7)
 *   --dry-run              report what would be exported, copy nothing
 */

const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');

process.env.NODE_ENV = process.env.NODE_ENV || 'script';
require('dotenv').config();

const db = require('../src/database/database');
const ImageStore = require('../src/storage/imageStore');

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const value = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
};

const OUT_DIR = path.resolve(process.cwd(), value('out', './export'));
const INCLUDE_UNVERIFIED = flag('include-unverified');
const INCLUDE_MOCK = flag('include-mock');
const MIN_CONFIDENCE = Number(value('min-confidence', '0.7'));
const DRY_RUN = flag('dry-run');

const slug = (label) =>
  String(label)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'unlabelled';

const csvCell = (v) => {
  if (v === null || v === undefined) return '';
  const s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const query = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows || [])));
  });

const main = async () => {
  await db.ready;

  const conditions = [];
  const params = [];

  if (!INCLUDE_UNVERIFIED) {
    conditions.push('si.verified_label IS NOT NULL');
  } else {
    conditions.push(
      '(si.verified_label IS NOT NULL OR (si.predicted_label IS NOT NULL AND si.predicted_confidence >= ?))'
    );
    params.push(MIN_CONFIDENCE);
  }

  if (!INCLUDE_MOCK) {
    // Verified labels are trustworthy whatever produced the original guess;
    // unverified rows are only as good as the model run behind them.
    conditions.push("(si.verified_label IS NOT NULL OR si.prediction_source = 'live')");
  }

  const rows = await query(
    `SELECT si.id, si.scan_id, si.file_path, si.sha256, si.mime, si.bytes,
            si.crop_name, si.predicted_label, si.predicted_confidence,
            si.prediction_source, si.model_version, si.verified_label,
            si.verified_by, si.created_at,
            cs.farm_id, cs.latitude, cs.longitude
     FROM ScanImages si
     LEFT JOIN CropScans cs ON cs.id = si.scan_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY si.created_at ASC`,
    params
  );

  if (rows.length === 0) {
    console.log('Nothing to export.');
    if (!INCLUDE_UNVERIFIED) {
      console.log('No images have a verified_label yet. Label some via');
      console.log('  GET  /api/review/pending');
      console.log('  PATCH /api/review/images/:imageId');
      console.log('or re-run with --include-unverified to export model guesses.');
    }
    return;
  }

  const manifest = [
    [
      'image_id', 'scan_id', 'file', 'label', 'label_source',
      'predicted_label', 'predicted_confidence', 'prediction_source',
      'model_version', 'crop_name', 'farm_id', 'latitude', 'longitude', 'captured_at'
    ].join(',')
  ];

  const classCounts = new Map();
  let copied = 0;
  let missing = 0;

  for (const row of rows) {
    const label = row.verified_label || row.predicted_label;
    const labelSource = row.verified_label ? 'verified' : 'predicted';
    const className = slug(label);
    const ext = path.extname(row.file_path) || '.jpg';
    const relative = path.posix.join('images', className, `${row.sha256}${ext}`);

    const source = ImageStore.absolutePathFor(row.file_path);
    if (!fs.existsSync(source)) {
      console.warn(`[skip] missing file on disk: ${row.file_path}`);
      missing++;
      continue;
    }

    if (!DRY_RUN) {
      const destination = path.join(OUT_DIR, relative);
      await fsp.mkdir(path.dirname(destination), { recursive: true });
      await fsp.copyFile(source, destination);
    }

    classCounts.set(className, (classCounts.get(className) || 0) + 1);
    copied++;

    manifest.push(
      [
        row.id, row.scan_id, relative, label, labelSource,
        row.predicted_label, row.predicted_confidence, row.prediction_source,
        row.model_version, row.crop_name, row.farm_id, row.latitude,
        row.longitude, row.created_at
      ].map(csvCell).join(',')
    );
  }

  if (!DRY_RUN && copied > 0) {
    await fsp.mkdir(OUT_DIR, { recursive: true });
    await fsp.writeFile(path.join(OUT_DIR, 'manifest.csv'), manifest.join('\n') + '\n');
  }

  console.log('');
  console.log(DRY_RUN ? 'Dry run — nothing written.' : `Exported to ${OUT_DIR}`);
  console.log(`  images:  ${copied}${missing ? ` (${missing} missing on disk)` : ''}`);
  console.log(`  classes: ${classCounts.size}`);
  console.log('');

  const sorted = [...classCounts.entries()].sort((a, b) => b[1] - a[1]);
  const widest = sorted.reduce((w, [name]) => Math.max(w, name.length), 0);
  for (const [name, count] of sorted) {
    console.log(`  ${name.padEnd(widest)}  ${count}`);
  }

  if (sorted.length > 1) {
    const [, most] = sorted[0];
    const [, least] = sorted[sorted.length - 1];
    const ratio = most / least;
    if (ratio >= 5) {
      console.log('');
      console.log(
        `  Warning: class imbalance ${ratio.toFixed(1)}:1 — rebalance or weight the loss.`
      );
    }
  }
  console.log('');
};

main()
  .catch((err) => {
    console.error('Export failed:', err.message);
    process.exitCode = 1;
  })
  .finally(() => db.close());
