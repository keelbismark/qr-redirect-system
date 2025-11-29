// src/routes/qrcode.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const Redirect = require('../models/Redirect');
const QRStyleService = require('../services/QRStyleService');
const { authenticateToken } = require('../middleware/auth');

const upload = multer({ limits: { fileSize: 1024 * 1024 } }); // 1MB

router.use(authenticateToken);

// Список тем
router.get('/themes', (req, res) => {
    res.json({ themes: QRStyleService.getThemes() });
});

// Генерация
router.get('/generate/:slug', async (req, res) => {
    try {
        const { slug } = req.params;
        const redirect = await Redirect.findBySlug(slug);
        if (!redirect) return res.status(404).json({ error: 'Not found' });

        // Читаем параметры из query
        const options = {
            size: parseInt(req.query.size) || 400,
            style: req.query.style, // square, rounded, dots, liquid
            eyeStyle: req.query.eyeStyle, // square, rounded, circle
            color: req.query.color ? '#' + req.query.color.replace('#', '') : undefined,
            bg: req.query.bg ? '#' + req.query.bg.replace('#', '') : undefined,
            logoPath: (req.query.withLogo === 'true' && redirect.logo_url) ? redirect.logo_url : null,
            format: req.query.format || 'png'
        };

        // Если выбрана тема, берем настройки оттуда
        if (req.query.theme && QRStyleService.themes[req.query.theme]) {
            const t = QRStyleService.themes[req.query.theme];
            if (!options.style) options.style = t.style;
            if (!options.eyeStyle) options.eyeStyle = t.eye;
            if (!options.color) options.color = t.fg;
            if (!options.bg) options.bg = t.bg;
        }

        const qr = await QRStyleService.generate(`${process.env.BASE_URL}/qr/${slug}`, options);

        if (options.format === 'base64') {
            res.json({ qr });
        } else if (options.format === 'svg') {
            res.type('image/svg+xml').send(qr);
        } else {
            res.type('image/png').send(qr);
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Error generating QR');
    }
});

// Загрузка лого
router.post('/upload-logo', upload.single('logo'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file' });
    try {
        const path = await QRStyleService.saveLogo(req.file);
        res.json({ path });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;