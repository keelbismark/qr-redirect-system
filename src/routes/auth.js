const express = require('express');
const router = express.Router();
const User = require('../models/User');
const db = require('../config/database');
const { generateTokens, authenticateToken, comparePassword, hashPassword } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimit');

// Вход
router.post('/login', authLimiter, async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email и пароль обязательны' });
        }

        const user = await User.findByEmail(email);
        if (!user) {
            return res.status(401).json({ error: 'Неверный email или пароль' });
        }

        const valid = await comparePassword(password, user.password_hash);
        if (!valid) {
            return res.status(401).json({ error: 'Неверный email или пароль' });
        }

        const { accessToken, refreshToken } = generateTokens(user.id);

        // Сохраняем refresh token
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await db.execute(
            'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
            [user.id, refreshToken, expiresAt]
        );

        res.json({
            accessToken,
            refreshToken,
            user: { id: user.id, email: user.email, name: user.name, role: user.role }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Обновление токена
router.post('/refresh', async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({ error: 'Refresh token обязателен' });
        }

        const [tokens] = await db.execute(
            'SELECT * FROM refresh_tokens WHERE token = ? AND expires_at > NOW()',
            [refreshToken]
        );

        if (tokens.length === 0) {
            return res.status(401).json({ error: 'Недействительный refresh token' });
        }

        const userId = tokens[0].user_id;

        // Удаляем старый токен
        await db.execute('DELETE FROM refresh_tokens WHERE token = ?', [refreshToken]);

        // Генерируем новые токены
        const newTokens = generateTokens(userId);
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await db.execute(
            'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
            [userId, newTokens.refreshToken, expiresAt]
        );

        const user = await User.findById(userId);

        res.json({
            accessToken: newTokens.accessToken,
            refreshToken: newTokens.refreshToken,
            user: { id: user.id, email: user.email, name: user.name, role: user.role }
        });
    } catch (error) {
        console.error('Refresh error:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Выход
router.post('/logout', authenticateToken, async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (refreshToken) {
            await db.execute('DELETE FROM refresh_tokens WHERE token = ?', [refreshToken]);
        }
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Текущий пользователь
router.get('/me', authenticateToken, (req, res) => {
    res.json({ user: req.user });
});

// Обновление профиля
router.put('/me', authenticateToken, async (req, res) => {
    try {
        const { name, currentPassword, newPassword } = req.body;

        if (name) {
            await db.execute('UPDATE users SET name = ? WHERE id = ?', [name, req.user.id]);
        }

        if (newPassword) {
            const user = await User.findByEmail(req.user.email);
            const valid = await comparePassword(currentPassword, user.password_hash);
            if (!valid) {
                return res.status(400).json({ error: 'Неверный текущий пароль' });
            }
            await User.updatePassword(req.user.id, newPassword);
        }

        const updated = await User.findById(req.user.id);
        res.json({ user: updated });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

module.exports = router;