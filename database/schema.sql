-- SQLite Database Schema for Inventory Management System

-- Users table for authentication
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    role VARCHAR(20) DEFAULT 'user',
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Assets/Equipment table
CREATE TABLE assets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    categoria VARCHAR(50) NOT NULL,
    marca VARCHAR(50) NOT NULL,
    serial VARCHAR(100) UNIQUE NOT NULL,
    cantidad INTEGER NOT NULL DEFAULT 1,
    ubicacion VARCHAR(100) NOT NULL,
    observaciones TEXT,
    status VARCHAR(20) DEFAULT 'active',
    condition_status VARCHAR(20) DEFAULT 'Bueno',
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Asset status history for tracking changes
CREATE TABLE asset_status_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    asset_id INTEGER NOT NULL,
    old_status VARCHAR(20),
    new_status VARCHAR(20) NOT NULL,
    changed_by INTEGER NOT NULL,
    change_reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE,
    FOREIGN KEY (changed_by) REFERENCES users(id)
);

-- Audit log for all user actions
CREATE TABLE audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    action VARCHAR(50) NOT NULL,
    table_name VARCHAR(50) NOT NULL,
    record_id INTEGER,
    old_values TEXT,
    new_values TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Sessions table for managing user sessions
CREATE TABLE user_sessions (
    id VARCHAR(128) PRIMARY KEY,
    user_id INTEGER NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for better performance
CREATE INDEX idx_assets_categoria ON assets(categoria);
CREATE INDEX idx_assets_ubicacion ON assets(ubicacion);
CREATE INDEX idx_assets_status ON assets(status);
CREATE INDEX idx_assets_serial ON assets(serial);
CREATE INDEX idx_status_history_asset ON asset_status_history(asset_id);
CREATE INDEX idx_status_history_date ON asset_status_history(created_at);
CREATE INDEX idx_audit_log_user ON audit_log(user_id);
CREATE INDEX idx_audit_log_date ON audit_log(created_at);
CREATE INDEX idx_audit_log_table ON audit_log(table_name, record_id);
CREATE INDEX idx_sessions_user ON user_sessions(user_id);
CREATE INDEX idx_sessions_expires ON user_sessions(expires_at);

-- Insert default admin user (password: admin123)
INSERT INTO users (username, password, full_name, email, role) VALUES 
('admin', '$2y$10$PVqX6NmqXPYI41k4cBgXP.rAEra.6ny/M45GKTL2LuKAHWvor2OhK', 'Administrator', 'admin@example.com', 'admin');

-- Insert sample users (password: admin123)
INSERT INTO users (username, password, full_name, email, role) VALUES 
('user1', '$2y$10$PVqX6NmqXPYI41k4cBgXP.rAEra.6ny/M45GKTL2LuKAHWvor2OhK', 'Usuario Uno', 'user1@example.com', 'user'),
('user2', '$2y$10$PVqX6NmqXPYI41k4cBgXP.rAEra.6ny/M45GKTL2LuKAHWvor2OhK', 'Usuario Dos', 'user2@example.com', 'user');