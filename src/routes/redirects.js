const express = require('express');
const router = express.Router();
const multer = require('multer');
const Redirect = require('../models/Redirect');
const UrlChecker = require('../services/UrlChecker');
const QRService = require('../services/QRService');
const { authenticateToken, requireRole } = require('../middleware/auth');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: parseInt(process.env.MAX_LOGO_SIZE) || 512000 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) cb(null, true);
        else cb(new Error('Только изображения'));
    }
});

router.use(authenticateToken);

// Получить все ссылки
router.get('/', async (req, res) => {
    try {
        const { folderId, search, status, page, limit } = req.query;
        const redirects = await Redirect.getByUser(req.user.id, { folderId, search, status, page, limit });
        res.json(redirects);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Получить одну ссылку
router.get('/:id', async (req, res) => {
    try {
        const redirect = await Redirect.findById(req.params.id);
        if (!redirect || redirect.user_id !== req.user.id) {
            return res.status(404).json({ error: 'Ссылка не найдена' });
        }
        res.json(redirect);
    } catch (error) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Создать ссылку
router.post('/', async (req, res) => {
    try {
        let { slug, targetUrl, comment, folderId, password, expiresAt, utmSource, utmMedium, utmCampaign } = req.body;

        // Валидация slug
        slug = (slug || '').replace(/[^a-zA-Z0-9\-_]/g, '').toLowerCase();
        if (!slug || slug.length < 2) {
            return res.status(400).json({ errors: { slug: 'Минимум 2 символа' } });
        }
        if (await Redirect.slugExists(slug)) {
            return res.status(400).json({ errors: { slug: 'Такой slug уже существует' } });
        }

        // Валидация URL
        if (!targetUrl) {
            return res.status(400).json({ errors: { targetUrl: 'URL обязателен' } });
        }
        try { new URL(targetUrl); } catch {
            return res.status(400).json({ errors: { targetUrl: 'Некорректный URL' } });
        }

        // Проверка безопасности URL
        const urlCheck = await UrlChecker.isUrlSafe(targetUrl);
        if (!urlCheck.safe) {
            return res.status(400).json({ errors: { targetUrl: urlCheck.reason } });
        }

        const redirect = await Redirect.create({
            userId: req.user.id,
            folderId: folderId || null,
            slug,
            targetUrl,
            comment,
            password,
            expiresAt: expiresAt || null,
            utmSource,
            utmMedium,
            utmCampaign
        });

        res.status(201).json({
            success: true,
            redirect,
            fullUrl: `${process.env.BASE_URL}/qr/${slug}`
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Обновить ссылку
router.put('/:id', async (req, res) => {
    try {
        const redirect = await Redirect.findById(req.params.id);
        if (!redirect || redirect.user_id !== req.user.id) {
            return res.status(404).json({ error: 'Ссылка не найдена' });
        }

        const { targetUrl } = req.body;
        if (targetUrl) {
            try { new URL(targetUrl); } catch {
                return res.status(400).json({ errors: { targetUrl: 'Некорректный URL' } });
            }
            const urlCheck = await UrlChecker.isUrlSafe(targetUrl);
            if (!urlCheck.safe) {
                return res.status(400).json({ errors: { targetUrl: urlCheck.reason } });
            }
        }

        await Redirect.update(req.params.id, req.body);
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Загрузить логотип для QR
router.post('/:id/logo', upload.single('logo'), async (req, res) => {
    try {
        const redirect = await Redirect.findById(req.params.id);
        if (!redirect || redirect.user_id !== req.user.id) {
            return res.status(404).json({ error: 'Ссылка не найдена' });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'Файл не загружен' });
        }

        const logoPath = await QRService.saveLogo(req.file);
        await Redirect.update(req.params.id, { logoUrl: logoPath, qrWithLogo: true });

        res.json({ success: true, logoUrl: logoPath });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка загрузки' });
    }
});

// Удалить ссылку
router.delete('/:id', async (req, res) => {
    try {
        const redirect = await Redirect.findById(req.params.id);
        if (!redirect || redirect.user_id !== req.user.id) {
            return res.status(404).json({ error: 'Ссылка не найдена' });
        }

        await Redirect.delete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Bulk действия
router.post('/bulk', async (req, res) => {
    try {
        const { action, ids, folderId } = req.body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ error: 'Не выбраны ссылки' });
        }

        // Проверяем права на все ссылки
        for (const id of ids) {
            const redirect = await Redirect.findById(id);
            if (!redirect || redirect.user_id !== req.user.id) {
                return res.status(403).json({ error: 'Нет доступа к некоторым ссылкам' });
            }
        }

        switch (action) {
            case 'delete':
                await Redirect.bulkDelete(ids);
                break;
            case 'activate':
                await Redirect.bulkUpdateStatus(ids, true);
                break;
            case 'deactivate':
                await Redirect.bulkUpdateStatus(ids, false);
                break;
            case 'move':
                await Redirect.bulkMove(ids, folderId);
                break;
            default:
                return res.status(400).json({ error: 'Неизвестное действие' });
        }

        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Обновить порядок
router.put('/reorder', async (req, res) => {
    try {
        const { items } = req.body;
        await Redirect.updateOrder(items);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

module.exports = router;