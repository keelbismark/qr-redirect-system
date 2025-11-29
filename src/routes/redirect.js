const express = require('express');
const router = express.Router();
const Redirect = require('../models/Redirect');
const ClickLog = require('../models/ClickLog');
const GeoService = require('../services/GeoService');
const { parseUserAgent, getClientIp } = require('../utils/parseUserAgent');
const { generateFingerprint } = require('../utils/fingerprint');
const { redirectLimiter } = require('../middleware/rateLimit');

const REDIRECT_TYPE = parseInt(process.env.REDIRECT_TYPE) || 302;

// Страница ввода пароля
function renderPasswordPage(slug) {
    return `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Введите пароль</title>
    <style>
        body { font-family: -apple-system, sans-serif; background: #faf9f7; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
        .box { background: #fff; padding: 40px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); max-width: 360px; width: 100%; }
        h1 { font-size: 1.25rem; margin: 0 0 8px; }
        p { color: #6b6b6b; margin: 0 0 24px; font-size: 0.9375rem; }
        input { width: 100%; padding: 12px; font-size: 1rem; border: 1.5px solid #e5e5e5; border-radius: 8px; margin-bottom: 16px; }
        button { width: 100%; padding: 12px; font-size: 1rem; background: #5c6ac4; color: #fff; border: none; border-radius: 8px; cursor: pointer; }
        .error { color: #dc2626; font-size: 0.875rem; margin-bottom: 16px; }
    </style>
</head>
<body>
    <div class="box">
        <h1>🔐 Защищённая ссылка</h1>
        <p>Для продолжения введите пароль</p>
        <form method="POST">
            <input type="password" name="password" placeholder="Пароль" required autofocus>
            <button type="submit">Продолжить</button>
        </form>
    </div>
</body>
</html>`;
}

// Страница 404
function render404() {
    return `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Не найдено</title>
    <style>
        body { font-family: -apple-system, sans-serif; background: #faf9f7; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; text-align: center; }
        h1 { font-size: 3rem; margin: 0; color: #1a1a1a; }
        p { color: #6b6b6b; margin: 16px 0 0; }
    </style>
</head>
<body>
    <div><h1>404</h1><p>Ссылка не найдена</p></div>
</body>
</html>`;
}

// Страница "Срок истёк"
function renderExpired() {
    return `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Срок истёк</title>
    <style>
        body { font-family: -apple-system, sans-serif; background: #faf9f7; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; text-align: center; }
        h1 { font-size: 2rem; margin: 0; color: #1a1a1a; }
        p { color: #6b6b6b; margin: 16px 0 0; }
    </style>
</head>
<body>
    <div><h1>⏰ Срок действия истёк</h1><p>Эта ссылка больше не активна</p></div>
</body>
</html>`;
}

// GET редирект
router.get('/:slug', redirectLimiter, async (req, res) => {
    try {
        const { slug } = req.params;
        const cleanSlug = slug.replace(/[^a-zA-Z0-9\-_]/g, '').toLowerCase();

        if (!cleanSlug) return res.status(404).send(render404());

        const redirect = await Redirect.findBySlug(cleanSlug);
        if (!redirect) return res.status(404).send(render404());
        if (!redirect.is_active) return res.status(410).send(renderExpired());

        // Проверка срока действия
        if (redirect.expires_at && new Date(redirect.expires_at) < new Date()) {
            return res.status(410).send(renderExpired());
        }

        // Если есть пароль — показываем форму
        if (redirect.password_hash) {
            return res.send(renderPasswordPage(cleanSlug));
        }

        // Логируем и редиректим
        await logAndRedirect(redirect, req, res);
    } catch (error) {
        console.error('Redirect error:', error);
        res.status(500).send('Ошибка сервера');
    }
});

// POST для пароля
router.post('/:slug', redirectLimiter, express.urlencoded({ extended: true }), async (req, res) => {
    try {
        const { slug } = req.params;
        const { password } = req.body;

        const redirect = await Redirect.findBySlug(slug);
        if (!redirect) return res.status(404).send(render404());

        const valid = await Redirect.checkPassword(redirect, password);
        if (!valid) {
            return res.send(renderPasswordPage(slug) + '<p class="error" style="color:#dc2626;text-align:center;">Неверный пароль</p>');
        }

        await logAndRedirect(redirect, req, res);
    } catch (error) {
        console.error('Password redirect error:', error);
        res.status(500).send('Ошибка сервера');
    }
});

// Логирование и редирект
async function logAndRedirect(redirect, req, res) {
    const userAgent = req.headers['user-agent'] || '';
    const ip = getClientIp(req);
    const parsed = parseUserAgent(userAgent);
    const geo = GeoService.lookup(ip);
    const fingerprint = generateFingerprint(ip, userAgent);

    // Асинхронно логируем
    ClickLog.create({
        redirectId: redirect.id,
        ip,
        userAgent,
        referrer: req.headers.referer || null,
        deviceType: parsed.deviceType,
        browser: parsed.browser,
        os: parsed.os,
        fingerprint,
        countryCode: geo.country_code,
        countryName: geo.country_name,
        city: geo.city
    }).catch(e => console.error('Log error:', e));

    // Собираем URL с UTM
    let targetUrl = redirect.target_url;
    if (redirect.utm_source || redirect.utm_medium || redirect.utm_campaign) {
        const url = new URL(targetUrl);
        if (redirect.utm_source) url.searchParams.set('utm_source', redirect.utm_source);
        if (redirect.utm_medium) url.searchParams.set('utm_medium', redirect.utm_medium);
        if (redirect.utm_campaign) url.searchParams.set('utm_campaign', redirect.utm_campaign);
        targetUrl = url.toString();
    }

    // Заголовки против кеша
    res.set({
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': 'Thu, 01 Jan 1970 00:00:00 GMT'
    });

    res.redirect(REDIRECT_TYPE, targetUrl);
}

module.exports = router;