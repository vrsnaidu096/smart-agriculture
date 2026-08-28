/**
 * Idempotent schema migrations.
 *
 * schema.sql uses CREATE TABLE IF NOT EXISTS, which silently does nothing for
 * a table that already exists — so new *columns* never reach an existing
 * database.sqlite. These run after schema.sql and add them in place.
 */

const COLUMN_ADDITIONS = [
  ['CropScans', 'model_version', 'TEXT'],
  ['CropScans', 'prediction_source', 'TEXT'],
  ['CropScans', 'image_count', 'INTEGER DEFAULT 0']
];

const tableColumns = (db, table) =>
  new Promise((resolve) => {
    db.all(`PRAGMA table_info(${table})`, [], (err, rows) => {
      if (err) {
        console.error(`[Migrations] Could not inspect ${table}:`, err.message);
        return resolve(null);
      }
      resolve((rows || []).map((row) => row.name));
    });
  });

const addColumn = (db, table, column, definition) =>
  new Promise((resolve) => {
    db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`, (err) => {
      if (err) {
        console.error(
          `[Migrations] Failed adding ${table}.${column}:`, err.message
        );
      } else {
        console.log(`[Migrations] Added ${table}.${column}`);
      }
      resolve();
    });
  });

/**
 * Minimum rows the app needs to function.
 *
 * CropScans.farm_id is a foreign key onto Farms, and the mobile app currently
 * posts a hardcoded farmId of 1. With PRAGMA foreign_keys=ON and an empty
 * Farms table every insert fails with SQLITE_CONSTRAINT, silently losing the
 * scan. Seeding a default user and farm keeps referential integrity switched
 * on instead of turning it off to hide the problem.
 *
 * Replace this once real user and farm registration exists.
 */
const SEEDS = [
  ["INSERT OR IGNORE INTO Users (id, name) VALUES (1, 'Default User')", 'default user'],
  ["INSERT OR IGNORE INTO Farms (id, user_id, name) VALUES (1, 1, 'Default Farm')", 'default farm']
];

const seedDefaults = (db) =>
  new Promise((resolve) => {
    let remaining = SEEDS.length;
    if (remaining === 0) return resolve();

    for (const [sql, label] of SEEDS) {
      db.run(sql, function (err) {
        if (err) {
          console.error(`[Migrations] Seed failed (${label}):`, err.message);
        } else if (this?.changes > 0) {
          console.log(`[Migrations] Seeded ${label}`);
        }
        if (--remaining === 0) resolve();
      });
    }
  });

const run = async (db) => {
  for (const [table, column, definition] of COLUMN_ADDITIONS) {
    const columns = await tableColumns(db, table);
    if (columns === null) continue;
    if (columns.length === 0) continue; // table does not exist yet
    if (columns.includes(column)) continue;
    await addColumn(db, table, column, definition);
  }
  await seedDefaults(db);
  console.log('[Migrations] Up to date.');
};

module.exports = { run };
