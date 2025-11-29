const express = require('express');
const router = express.Router();
const Redirect = require('../models/Redirect');
const ClickLog = require('../models/ClickLog');
const ExportService = require('../services/ExportService');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// Общая статистика
router.get('/overview', async (req, res) => {
    try {
        const stats = await ClickLog.getOverall(req.user.id);
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Статистика по ссылке
router.get('/redirect/:id', async (req, res) => {
    try {
        const redirect = await Redirect.findById(req.params.id);
        if (!redirect || redirect.user_id !== req.user.id) {
            return res.status(404).json({ error: 'Ссылка не найдена' });
        }

        const days = parseInt(req.query.days) || 30;
        const stats = await ClickLog.getStats(req.params.id, days);

        res.json({ redirect, stats });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Экспорт статистики
router.get('/export/:id', async (req, res) => {
    try {
        const redirect = await Redirect.findById(req.params.id);
        if (!redirect || redirect.user_id !== req.user.id) {
            return res.status(404).json({ error: 'Ссылка не найдена' });
        }

        const days = req.query.days ? parseInt(req.query.days) : null;
        const clicks = await ClickLog.getForExport(req.params.id, days);
        const csv = await ExportService.toCSV(clicks, ExportService.getClicksColumns());

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="stats-${redirect.slug}.csv"`);
        res.send(csv);
    } catch (error) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Экспорт всех ссылок
router.get('/export-all', async (req, res) => {
    try {
        const redirects = await Redirect.getByUser(req.user.id);
        const csv = await ExportService.toCSV(redirects, ExportService.getRedirectsColumns());

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="all-links.csv"');
        res.send(csv);
    } catch (error) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

module.exports = router;