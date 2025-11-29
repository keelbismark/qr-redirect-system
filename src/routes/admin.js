// src/routes/admin.js

const express = require('express');
const router = express.Router();
const Redirect = require('../models/Redirect');
const ClickLog = require('../models/ClickLog');
const { adminAuth, checkPassword } = require('../middleware/auth');

/**
 * POST /api/admin/login - Авторизация
 */
router.post('/login', (req, res) => {
    const { password } = req.body;

    if (!password) {
        return res.status(400).json({ error: 'Пароль обязателен' });
    }

    if (checkPassword(password)) {
        res.json({ 
            success: true, 
            token: process.env.ADMIN_PASSWORD // В продакшене использовать JWT!
        });
    } else {
        res.status(401).json({ error: 'Неверный пароль' });
    }
});

// Все остальные роуты требуют авторизации
router.use(adminAuth);

/**
 * GET /api/admin/redirects - Список всех ссылок
 */
router.get('/redirects', async (req, res) => {
    try {
        const redirects = await Redirect.getAll();
        res.json(redirects);
    } catch (error) {
        console.error('Ошибка получения списка:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

/**
 * GET /api/admin/redirects/:id - Одна ссылка
 */
router.get('/redirects/:id', async (req, res) => {
    try {
        const redirect = await Redirect.findById(req.params.id);
        if (!redirect) {
            return res.status(404).json({ error: 'Ссылка не найдена' });
        }
        res.json(redirect);
    } catch (error) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

/**
 * POST /api/admin/redirects - Создать ссылку
 */
router.post('/redirects', async (req, res) => {
    try {
        let { slug, targetUrl, comment } = req.body;

        // Валидация
        const errors = {};

        // Очистка slug
        slug = (slug || '').replace(/[^a-zA-Z0-9\-_]/g, '').toLowerCase();

        if (!slug || slug.length < 2) {
            errors.slug = 'Slug должен быть минимум 2 символа (буквы, цифры, дефис)';
        }

        if (slug.length > 100) {
            errors.slug = 'Slug слишком длинный (макс. 100 символов)';
        }

        if (!targetUrl) {
            errors.targetUrl = 'URL обязателен';
        } else {
            try {
                new URL(targetUrl);
            } catch {
                errors.targetUrl = 'Некорректный URL';
            }
        }

        // Проверка уникальности
        if (slug && await Redirect.slugExists(slug)) {
            errors.slug = 'Такой slug уже существует';
        }

        if (Object.keys(errors).length > 0) {
            return res.status(400).json({ errors });
        }

        const redirect = await Redirect.create({ slug, targetUrl, comment });

        res.status(201).json({
            success: true,
            redirect,
            fullUrl: `${process.env.BASE_URL}${process.env.QR_PREFIX}${slug}`
        });

    } catch (error) {
        console.error('Ошибка создания:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

/**
 * PUT /api/admin/redirects/:id - Обновить ссылку
 */
router.put('/redirects/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { targetUrl, comment, isActive } = req.body;

        // Проверка существования
        const existing = await Redirect.findById(id);
        if (!existing) {
            return res.status(404).json({ error: 'Ссылка не найдена' });
        }

        // Валидация URL
        if (!targetUrl) {
            return res.status(400).json({ errors: { targetUrl: 'URL обязателен' } });
        }

        try {
            new URL(targetUrl);
        } catch {
            return res.status(400).json({ errors: { targetUrl: 'Некорректный URL' } });
        }

        const redirect = await Redirect.update(id, {
            targetUrl,
            comment: comment || '',
            isActive: isActive !== false
        });

        res.json({ success: true, redirect });

    } catch (error) {
        console.error('Ошибка обновления:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

/**
 * DELETE /api/admin/redirects/:id - Удалить ссылку
 */
router.delete('/redirects/:id', async (req, res) => {
    try {
        const deleted = await Redirect.delete(req.params.id);
        if (!deleted) {
            return res.status(404).json({ error: 'Ссылка не найдена' });
        }
        res.json({ success: true });
    } catch (error) {
        console.error('Ошибка удаления:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

/**
 * GET /api/admin/stats - Общая статистика
 */
router.get('/stats', async (req, res) => {
    try {
        const stats = await ClickLog.getOverallStats();
        res.json(stats);
    } catch (error) {
        console.error('Ошибка получения статистики:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

/**
 * GET /api/admin/stats/:id - Статистика по ссылке
 */
router.get('/stats/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const days = parseInt(req.query.days) || 30;

        const redirect = await Redirect.findById(id);
        if (!redirect) {
            return res.status(404).json({ error: 'Ссылка не найдена' });
        }

        const stats = await ClickLog.getStats(id, days);
        res.json({ redirect, stats });

    } catch (error) {
        console.error('Ошибка получения статистики:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

module.exports = router;