-- Database Schema for MVP

CREATE TABLE IF NOT EXISTS Users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Farms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(id)
);

CREATE TABLE IF NOT EXISTS FarmBoundaries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    farm_id INTEGER,
    geojson TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (farm_id) REFERENCES Farms(id)
);

CREATE TABLE IF NOT EXISTS CropScans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    farm_id INTEGER,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    image_ref TEXT,
    disease TEXT,
    confidence REAL,
    risk_level TEXT,
    risk_score INTEGER,
    recommendation TEXT,
    weather_data TEXT,
    soil_data TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (farm_id) REFERENCES Farms(id)
);

CREATE TABLE IF NOT EXISTS RiskAlerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    farm_id INTEGER,
    message TEXT NOT NULL,
    level TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (farm_id) REFERENCES Farms(id)
);

-- Per-image record for every photo submitted with a scan.
-- This is the raw material for a proprietary training set: `predicted_label`
-- is what the model said, `verified_label` is what a human confirmed.
-- Only rows with a `verified_label` (and prediction_source = 'live') are
-- safe to export as ground truth.
CREATE TABLE IF NOT EXISTS ScanImages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scan_id INTEGER NOT NULL,
    file_path TEXT NOT NULL,
    sha256 TEXT NOT NULL,
    mime TEXT,
    bytes INTEGER,
    crop_name TEXT,
    predicted_label TEXT,
    predicted_confidence REAL,
    prediction_source TEXT,
    model_version TEXT,
    verified_label TEXT,
    verified_at DATETIME,
    verified_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (scan_id) REFERENCES CropScans(id)
);

CREATE INDEX IF NOT EXISTS idx_scanimages_scan ON ScanImages(scan_id);
CREATE INDEX IF NOT EXISTS idx_scanimages_sha ON ScanImages(sha256);
CREATE INDEX IF NOT EXISTS idx_scanimages_verified ON ScanImages(verified_label);
CREATE INDEX IF NOT EXISTS idx_cropscans_farm_created ON CropScans(farm_id, created_at DESC);
