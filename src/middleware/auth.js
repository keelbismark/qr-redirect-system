// src/middleware/auth.js
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const db = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-me';
const JWT_EXPIRES = process.env.JWT_EXPIRES_IN || '1h';

// Генерация токенов
function generateTokens(userId) {
    const accessToken = jwt.sign(
        { userId: userId, iat: Math.floor(Date.now() / 1000) },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES }
    );
    const refreshToken = crypto.randomBytes(64).toString('hex');
    return { accessToken, refreshToken };
}

// Проверка JWT
function authenticateToken(req, res, next) {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Требуется авторизация' });
    }

    jwt.verify(token, JWT_SECRET, async (err, decoded) => {
        if (err) {
            console.log('JWT Error:', err.message);
            
            // Если токен истёк, отправляем специальный статус
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({ error: 'Токен истёк', code: 'TOKEN_EXPIRED' });
            }
            
            return res.status(401).json({ error: 'Недействительный токен' });
        }

        try {
            const [users] = await db.execute(
                'SELECT id, email, name, role FROM users WHERE id = ?',
                [decoded.userId]
            );
            
            if (users.length === 0) {
                return res.status(401).json({ error: 'Пользователь не найден' });
            }
            
            req.user = users[0];
            next();
        } catch (e) {
            console.error('Auth DB error:', e);
            res.status(500).json({ error: 'Ошибка сервера' });
        }
    });
}

// Проверка роли
function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Недостаточно прав' });
        }
        next();
    };
}

// Хеширование пароля
async function hashPassword(password) {
    return bcrypt.hash(password, 10);
}

async function comparePassword(password, hash) {
    return bcrypt.compare(password, hash);
}

module.exports = {
    generateTokens,
    authenticateToken,
    requireRole,
    hashPassword,
    comparePassword,
    JWT_SECRET
};