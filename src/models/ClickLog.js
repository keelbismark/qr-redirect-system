const db = require('../config/database');

class ClickLog {
    static async create(data) {
        const {
            redirectId, ip, userAgent, referrer, deviceType, browser, os,
            fingerprint, countryCode, countryName, city
        } = data;

        // Проверяем уникальность
        const [existing] = await db.execute(
            'SELECT id FROM click_logs WHERE redirect_id = ? AND fingerprint = ? AND clicked_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)',
            [redirectId, fingerprint]
        );
        const isUnique = existing.length === 0 ? 1 : 0;

        await db.execute(`
            INSERT INTO click_logs 
            (redirect_id, ip_address, user_agent, referrer, device_type, browser, os, fingerprint, country_code, country_name, city, is_unique)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [redirectId, ip, userAgent, referrer, deviceType, browser, os, fingerprint, countryCode, countryName, city, isUnique]);
    }

    static async getStats(redirectId, days = 30) {
        const [total] = await db.execute(
            'SELECT COUNT(*) as total, COUNT(DISTINCT fingerprint) as unique_total FROM click_logs WHERE redirect_id = ?',
            [redirectId]
        );

        const [period] = await db.execute(
            'SELECT COUNT(*) as total, COUNT(DISTINCT fingerprint) as unique_total FROM click_logs WHERE redirect_id = ? AND clicked_at >= DATE_SUB(NOW(), INTERVAL ? DAY)',
            [redirectId, days]
        );

        const [byDay] = await db.execute(`
            SELECT DATE(clicked_at) as date, COUNT(*) as clicks, COUNT(DISTINCT fingerprint) as unique_clicks
            FROM click_logs WHERE redirect_id = ? AND clicked_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
            GROUP BY DATE(clicked_at) ORDER BY date
        `, [redirectId, days]);

        const [byDevice] = await db.execute(`
            SELECT device_type, COUNT(*) as count
            FROM click_logs WHERE redirect_id = ?
            GROUP BY device_type ORDER BY count DESC
        `, [redirectId]);

        const [byBrowser] = await db.execute(`
            SELECT browser, COUNT(*) as count
            FROM click_logs WHERE redirect_id = ? AND browser IS NOT NULL
            GROUP BY browser ORDER BY count DESC LIMIT 10
        `, [redirectId]);

        const [byOs] = await db.execute(`
            SELECT os, COUNT(*) as count
            FROM click_logs WHERE redirect_id = ? AND os IS NOT NULL
            GROUP BY os ORDER BY count DESC LIMIT 10
        `, [redirectId]);

        const [byCountry] = await db.execute(`
            SELECT country_code, country_name, COUNT(*) as count
            FROM click_logs WHERE redirect_id = ? AND country_code IS NOT NULL
            GROUP BY country_code, country_name ORDER BY count DESC LIMIT 10
        `, [redirectId]);

        const [byCity] = await db.execute(`
            SELECT city, country_name, COUNT(*) as count
            FROM click_logs WHERE redirect_id = ? AND city IS NOT NULL
            GROUP BY city, country_name ORDER BY count DESC LIMIT 10
        `, [redirectId]);

        return {
            totalClicks: total[0].total,
            uniqueClicks: total[0].unique_total,
            periodClicks: period[0].total,
            periodUnique: period[0].unique_total,
            byDay, byDevice, byBrowser, byOs, byCountry, byCity
        };
    }

    static async getOverall(userId) {
        const [links] = await db.execute('SELECT COUNT(*) as total FROM redirects WHERE user_id = ?', [userId]);
        const [active] = await db.execute(
            'SELECT COUNT(*) as total FROM redirects WHERE user_id = ? AND is_active = 1',
            [userId]
        );

        const [clicks] = await db.execute(`
            SELECT COUNT(*) as total, COUNT(DISTINCT c.fingerprint) as unique_total
            FROM click_logs c
            JOIN redirects r ON c.redirect_id = r.id
            WHERE r.user_id = ?
        `, [userId]);

        const [today] = await db.execute(`
            SELECT COUNT(*) as total
            FROM click_logs c
            JOIN redirects r ON c.redirect_id = r.id
            WHERE r.user_id = ? AND DATE(c.clicked_at) = CURDATE()
        `, [userId]);

        const [topLinks] = await db.execute(`
            SELECT r.slug, r.comment, COUNT(c.id) as clicks
            FROM redirects r
            LEFT JOIN click_logs c ON r.id = c.redirect_id
            WHERE r.user_id = ?
            GROUP BY r.id ORDER BY clicks DESC LIMIT 5
        `, [userId]);

        return {
            totalLinks: links[0].total,
            activeLinks: active[0].total,
            totalClicks: clicks[0].total,
            uniqueClicks: clicks[0].unique_total,
            todayClicks: today[0].total,
            topLinks
        };
    }

    static async getForExport(redirectId, days) {
        const [rows] = await db.execute(`
            SELECT clicked_at, ip_address, country_name, city, device_type, browser, os, referrer
            FROM click_logs WHERE redirect_id = ?
            ${days ? 'AND clicked_at >= DATE_SUB(NOW(), INTERVAL ? DAY)' : ''}
            ORDER BY clicked_at DESC
        `, days ? [redirectId, days] : [redirectId]);
        return rows;
    }
}

module.exports = ClickLog;