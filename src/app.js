// src/app.js
require('dotenv').config();

const express = require('express');
const path = require('path');
const { generalLimiter } = require('./middleware/rateLimit');

// Роуты
const authRoutes = require('./routes/auth');
const foldersRoutes = require('./routes/folders');
const redirectsRoutes = require('./routes/redirects');
const statsRoutes = require('./routes/stats');
const qrcodeRoutes = require('./routes/qrcode');
const publicRedirectRoutes = require('./routes/redirect');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(generalLimiter);

// Статика
app.use('/admin', express.static(path.join(__dirname, '../public/admin')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// robots.txt
app.get('/robots.txt', (req, res) => {
    res.type('text/plain').send('User-agent: *\nDisallow: /qr/\nDisallow: /go/\nDisallow: /admin/\nDisallow: /api/');
});

// API
app.use('/api/auth', authRoutes);
app.use('/api/folders', foldersRoutes);
app.use('/api/redirects', redirectsRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/qr', qrcodeRoutes);

// Публичные редиректы
app.use('/qr', publicRedirectRoutes);
app.use('/go', publicRedirectRoutes);

// Главная
app.get('/', (req, res) => {
    res.redirect('/admin/');
});

// 404
app.use((req, res) => {
    res.status(404).json({ error: 'Не найдено' });
});

// Ошибки
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

app.listen(PORT, () => {
    console.log(`
🚀 Сервер: http://localhost:${PORT}
📱 Редиректы: http://localhost:${PORT}/qr/{slug}
🔧 Админка: http://localhost:${PORT}/admin/
    `);
});