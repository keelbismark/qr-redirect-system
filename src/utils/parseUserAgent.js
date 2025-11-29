const UAParser = require('ua-parser-js');

function parseUserAgent(uaString) {
    if (!uaString) return { deviceType: 'unknown', browser: null, os: null };

    const parser = new UAParser(uaString);
    const result = parser.getResult();

    let deviceType = 'desktop';
    if (/bot|crawl|spider|slurp|yandex|google|bing/i.test(uaString)) {
        deviceType = 'bot';
    } else if (result.device.type === 'mobile') {
        deviceType = 'mobile';
    } else if (result.device.type === 'tablet') {
        deviceType = 'tablet';
    }

    return {
        deviceType,
        browser: result.browser.name || null,
        os: result.os.name ? `${result.os.name} ${result.os.version || ''}`.trim() : null
    };
}

function getClientIp(req) {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) return forwarded.split(',')[0].trim();
    return req.headers['x-real-ip'] || req.connection?.remoteAddress || req.socket?.remoteAddress || '0.0.0.0';
}

module.exports = { parseUserAgent, getClientIp };