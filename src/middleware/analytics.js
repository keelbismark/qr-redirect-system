// src/middleware/analytics.js

const ClickLog = require('../models/ClickLog');
const { parseUserAgent, getClientIp } = require('../utils/parseUserAgent');

/**
 * Middleware для записи аналитики
 */
async function logClick(redirectId, req) {
    try {
        const userAgent = req.headers['user-agent'] || '';
        const parsed = parseUserAgent(userAgent);

        await ClickLog.create({
            redirectId,
            ip: getClientIp(req),
            userAgent,
            referrer: req.headers.referer || null,
            deviceType: parsed.deviceType,
            browser: parsed.browser,
            os: parsed.os
        });
    } catch (error) {
        console.error('Ошибка записи аналитики:', error);
        // Не блокируем редирект при ошибке логирования
    }
}

module.exports = { logClick };