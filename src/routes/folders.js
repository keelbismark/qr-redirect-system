const express = require('express');
const router = express.Router();
const Folder = require('../models/Folder');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// Получить все папки
router.get('/', async (req, res) => {
    try {
        const folders = await Folder.getByUser(req.user.id);
        res.json(folders);
    } catch (error) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Создать папку
router.post('/', async (req, res) => {
    try {
        const { name, color } = req.body;

        if (!name || name.length < 1) {
            return res.status(400).json({ error: 'Название обязательно' });
        }

        const folder = await Folder.create({ userId: req.user.id, name, color });
        res.status(201).json(folder);
    } catch (error) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Обновить папку
router.put('/:id', async (req, res) => {
    try {
        const folder = await Folder.findById(req.params.id);
        if (!folder || folder.user_id !== req.user.id) {
            return res.status(404).json({ error: 'Папка не найдена' });
        }

        await Folder.update(req.params.id, req.body);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Обновить порядок папок
router.put('/reorder', async (req, res) => {
    try {
        const { items } = req.body;
        for (const item of items) {
            await Folder.updateOrder(item.id, item.order);
        }
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Удалить папку
router.delete('/:id', async (req, res) => {
    try {
        const folder = await Folder.findById(req.params.id);
        if (!folder || folder.user_id !== req.user.id) {
            return res.status(404).json({ error: 'Папка не найдена' });
        }

        await Folder.delete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

module.exports = router;