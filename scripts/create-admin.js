// scripts/create-admin.js
require('dotenv').config();
const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');

async function createAdmin() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'qr_redirect_db'
    });

    const email = 'admin@example.com';
    const password = 'admin123';
    const name = 'Admin';

    try {
        // Генерируем правильный хеш
        const hash = await bcrypt.hash(password, 10);
        console.log('Хеш пароля:', hash);

        // Удаляем старого пользователя если есть
        await pool.execute('DELETE FROM users WHERE email = ?', [email]);

        // Создаём нового
        await pool.execute(
            'INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)',
            [email, hash, name, 'admin']
        );

        console.log('✅ Администратор создан!');
        console.log('Email:', email);
        console.log('Пароль:', password);

        await pool.end();
    } catch (error) {
        console.error('Ошибка:', error.message);
        process.exit(1);
    }
}

createAdmin();