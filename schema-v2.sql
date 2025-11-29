-- schema-v2.sql

CREATE DATABASE IF NOT EXISTS qr_redirect_db 
CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE qr_redirect_db;

-- Пользователи
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100),
    role ENUM('admin', 'editor', 'viewer') DEFAULT 'editor',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_email (email)
) ENGINE=InnoDB;

-- Папки/группы
CREATE TABLE folders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(7) DEFAULT '#5c6ac4',
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user (user_id)
) ENGINE=InnoDB;

-- Ссылки (обновлённая)
CREATE TABLE redirects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    folder_id INT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    target_url TEXT NOT NULL,
    comment VARCHAR(500) DEFAULT NULL,
    is_active TINYINT(1) DEFAULT 1,
    
    -- Новые поля
    password_hash VARCHAR(255) NULL,
    expires_at TIMESTAMP NULL,
    utm_source VARCHAR(100) NULL,
    utm_medium VARCHAR(100) NULL,
    utm_campaign VARCHAR(100) NULL,
    qr_with_logo TINYINT(1) DEFAULT 0,
    logo_url VARCHAR(500) NULL,
    sort_order INT DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL,
    INDEX idx_slug (slug),
    INDEX idx_user (user_id),
    INDEX idx_folder (folder_id),
    INDEX idx_active (is_active),
    INDEX idx_expires (expires_at)
) ENGINE=InnoDB;

-- Клики (расширенная)
CREATE TABLE click_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    redirect_id INT NOT NULL,
    clicked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45) DEFAULT NULL,
    user_agent TEXT DEFAULT NULL,
    referrer TEXT DEFAULT NULL,
    device_type ENUM('desktop', 'mobile', 'tablet', 'bot', 'unknown') DEFAULT 'unknown',
    browser VARCHAR(50) DEFAULT NULL,
    os VARCHAR(50) DEFAULT NULL,
    
    -- Новые поля
    fingerprint VARCHAR(64) NULL,
    country_code VARCHAR(2) NULL,
    country_name VARCHAR(100) NULL,
    city VARCHAR(100) NULL,
    is_unique TINYINT(1) DEFAULT 1,
    
    FOREIGN KEY (redirect_id) REFERENCES redirects(id) ON DELETE CASCADE,
    INDEX idx_redirect (redirect_id),
    INDEX idx_clicked (clicked_at),
    INDEX idx_fingerprint (fingerprint),
    INDEX idx_country (country_code)
) ENGINE=InnoDB;

-- Refresh токены
CREATE TABLE refresh_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_token (token),
    INDEX idx_expires (expires_at)
) ENGINE=InnoDB;

-- Настройки Telegram бота
CREATE TABLE telegram_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    chat_id BIGINT NOT NULL UNIQUE,
    notify_clicks TINYINT(1) DEFAULT 0,
    notify_threshold INT DEFAULT 100,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Админ по умолчанию (пароль: admin123)
INSERT INTO users (email, password_hash, name, role) VALUES 
('admin@example.com', '$2b$10$rIC/uGJv6rLHxqKgHGJKxOGE4IVxM9JHKbqeVxV8YqBxXnxmxqxqK', 'Admin', 'admin');