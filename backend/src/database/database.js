const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const migrations = require('./migrations');

const dbPath = path.resolve(__dirname, '../../database.sqlite');
const schemaPath = path.resolve(__dirname, 'schema.sql');

let markReady;
let markFailed;

// Consumers can `await db.ready` to be sure the schema and migrations have
// finished before issuing queries.
const ready = new Promise((resolve, reject) => {
  markReady = resolve;
  markFailed = reject;
});

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err.message);
    return markFailed(err);
  }

  console.log('Connected to the SQLite database.');

  let schema;
  try {
    schema = fs.readFileSync(schemaPath, 'utf8');
  } catch (readErr) {
    console.error('Could not read schema file', readErr.message);
    return markFailed(readErr);
  }

  db.exec(schema, (schemaErr) => {
    if (schemaErr) {
      console.error('Error executing schema:', schemaErr.message);
      return markFailed(schemaErr);
    }

    console.log('Database schema initialized.');

    db.run('PRAGMA foreign_keys = ON');

    migrations
      .run(db)
      .then(() => markReady(db))
      .catch((migrationErr) => {
        console.error('Migration failure:', migrationErr.message);
        markFailed(migrationErr);
      });
  });
});

db.ready = ready;

module.exports = db;
