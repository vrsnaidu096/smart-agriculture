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
