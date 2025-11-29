-- schema.sql

CREATE DATABASE IF NOT EXISTS qr_redirect_db 
CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE qr_redirect_db;

-- Основная таблица ссылок
CREATE TABLE IF NOT EXISTS redirects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    slug VARCHAR(100) NOT NULL UNIQUE,
    target_url TEXT NOT NULL,
    comment VARCHAR(500) DEFAULT NULL,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_slug (slug),
    INDEX idx_active (is_active)
) ENGINE=InnoDB;

-- Таблица статистики
CREATE TABLE IF NOT EXISTS click_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    redirect_id INT NOT NULL,
    clicked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45) DEFAULT NULL,
    user_agent TEXT DEFAULT NULL,
    referrer TEXT DEFAULT NULL,
    device_type ENUM('desktop', 'mobile', 'tablet', 'bot', 'unknown') DEFAULT 'unknown',
    browser VARCHAR(50) DEFAULT NULL,
    os VARCHAR(50) DEFAULT NULL,
    
    INDEX idx_redirect (redirect_id),
    INDEX idx_clicked (clicked_at),
    
    FOREIGN KEY (redirect_id) REFERENCES redirects(id) ON DELETE CASCADE
) ENGINE=InnoDB;