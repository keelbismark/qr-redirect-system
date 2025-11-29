const https = require('https');
const http = require('http');

class UrlChecker {
    // Чёрный список доменов
    static blacklist = [
        'bit.ly', 'tinyurl.com', 'goo.gl', // Другие сокращатели
        'malware.com', 'phishing.com' // Примеры вредоносных
    ];

    static async isUrlSafe(url) {
        try {
            const parsed = new URL(url);
            
            // Проверяем протокол
            if (!['http:', 'https:'].includes(parsed.protocol)) {
                return { safe: false, reason: 'Недопустимый протокол' };
            }

            // Проверяем чёрный список
            const domain = parsed.hostname.toLowerCase();
            for (const blocked of this.blacklist) {
                if (domain.includes(blocked)) {
                    return { safe: false, reason: 'Домен в чёрном списке' };
                }
            }

            // Проверяем доступность (опционально)
            // const isReachable = await this.checkReachable(url);

            return { safe: true };
        } catch (error) {
            return { safe: false, reason: 'Некорректный URL' };
        }
    }

    static checkReachable(url, timeout = 5000) {
        return new Promise((resolve) => {
            const protocol = url.startsWith('https') ? https : http;
            
            const req = protocol.get(url, { timeout }, (res) => {
                resolve(res.statusCode < 400);
            });

            req.on('error', () => resolve(false));
            req.on('timeout', () => { req.destroy(); resolve(false); });
        });
    }
}

module.exports = UrlChecker;