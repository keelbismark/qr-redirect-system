const db = require('../config/database');
const bcrypt = require('bcrypt');

class Redirect {
    static async findBySlug(slug) {
        const [rows] = await db.execute('SELECT * FROM redirects WHERE slug = ?', [slug]);
        return rows[0] || null;
    }

    static async findById(id) {
        const [rows] = await db.execute('SELECT * FROM redirects WHERE id = ?', [id]);
        return rows[0] || null;
    }

    static async getByUser(userId, { folderId, search, status, page = 1, limit = 50 } = {}) {
        let query = `
            SELECT r.*, f.name as folder_name, f.color as folder_color,
                   COUNT(c.id) as click_count,
                   COUNT(DISTINCT c.fingerprint) as unique_clicks,
                   MAX(c.clicked_at) as last_click
            FROM redirects r
            LEFT JOIN folders f ON r.folder_id = f.id
            LEFT JOIN click_logs c ON r.id = c.redirect_id
            WHERE r.user_id = ?
        `;
        const params = [userId];

        if (folderId !== undefined) {
            if (folderId === null || folderId === 'null') {
                query += ' AND r.folder_id IS NULL';
            } else {
                query += ' AND r.folder_id = ?';
                params.push(folderId);
            }
        }

        if (search) {
            query += ' AND (r.slug LIKE ? OR r.target_url LIKE ? OR r.comment LIKE ?)';
            const s = `%${search}%`;
            params.push(s, s, s);
        }

        if (status === 'active') {
            query += ' AND r.is_active = 1 AND (r.expires_at IS NULL OR r.expires_at > NOW())';
        } else if (status === 'inactive') {
            query += ' AND (r.is_active = 0 OR (r.expires_at IS NOT NULL AND r.expires_at <= NOW()))';
        }

        query += ' GROUP BY r.id ORDER BY r.sort_order, r.created_at DESC';
        query += ` LIMIT ${limit} OFFSET ${(page - 1) * limit}`;

        const [rows] = await db.execute(query, params);
        return rows;
    }

    static async create(data) {
        const {
            userId, folderId, slug, targetUrl, comment,
            password, expiresAt, utmSource, utmMedium, utmCampaign
        } = data;

        let passwordHash = null;
        if (password) {
            passwordHash = await bcrypt.hash(password, 10);
        }

        const [result] = await db.execute(`
            INSERT INTO redirects 
            (user_id, folder_id, slug, target_url, comment, password_hash, expires_at, utm_source, utm_medium, utm_campaign)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [userId, folderId, slug, targetUrl, comment, passwordHash, expiresAt, utmSource, utmMedium, utmCampaign]);

        return { id: result.insertId, slug };
    }

    static async update(id, data) {
        const fields = [];
        const values = [];

        if (data.targetUrl !== undefined) { fields.push('target_url = ?'); values.push(data.targetUrl); }
        if (data.comment !== undefined) { fields.push('comment = ?'); values.push(data.comment); }
        if (data.isActive !== undefined) { fields.push('is_active = ?'); values.push(data.isActive ? 1 : 0); }
        if (data.folderId !== undefined) { fields.push('folder_id = ?'); values.push(data.folderId); }
        if (data.expiresAt !== undefined) { fields.push('expires_at = ?'); values.push(data.expiresAt); }
        if (data.utmSource !== undefined) { fields.push('utm_source = ?'); values.push(data.utmSource); }
        if (data.utmMedium !== undefined) { fields.push('utm_medium = ?'); values.push(data.utmMedium); }
        if (data.utmCampaign !== undefined) { fields.push('utm_campaign = ?'); values.push(data.utmCampaign); }
        if (data.logoUrl !== undefined) { fields.push('logo_url = ?'); values.push(data.logoUrl); }
        if (data.qrWithLogo !== undefined) { fields.push('qr_with_logo = ?'); values.push(data.qrWithLogo ? 1 : 0); }

        if (data.password !== undefined) {
            if (data.password) {
                const hash = await bcrypt.hash(data.password, 10);
                fields.push('password_hash = ?');
                values.push(hash);
            } else {
                fields.push('password_hash = NULL');
            }
        }

        if (fields.length === 0) return;

        values.push(id);
        await db.execute(`UPDATE redirects SET ${fields.join(', ')} WHERE id = ?`, values);
    }

    static async updateOrder(items) {
        for (const item of items) {
            await db.execute(
                'UPDATE redirects SET sort_order = ?, folder_id = ? WHERE id = ?',
                [item.order, item.folderId, item.id]
            );
        }
    }

    static async delete(id) {
        await db.execute('DELETE FROM redirects WHERE id = ?', [id]);
    }

    static async bulkDelete(ids) {
        if (!ids.length) return;
        await db.execute(`DELETE FROM redirects WHERE id IN (${ids.map(() => '?').join(',')})`, ids);
    }

    static async bulkUpdateStatus(ids, isActive) {
        if (!ids.length) return;
        await db.execute(
            `UPDATE redirects SET is_active = ? WHERE id IN (${ids.map(() => '?').join(',')})`,
            [isActive ? 1 : 0, ...ids]
        );
    }

    static async bulkMove(ids, folderId) {
        if (!ids.length) return;
        await db.execute(
            `UPDATE redirects SET folder_id = ? WHERE id IN (${ids.map(() => '?').join(',')})`,
            [folderId, ...ids]
        );
    }

    static async checkPassword(redirect, password) {
        if (!redirect.password_hash) return true;
        return bcrypt.compare(password, redirect.password_hash);
    }

    static async slugExists(slug) {
        const [rows] = await db.execute('SELECT id FROM redirects WHERE slug = ?', [slug]);
        return rows.length > 0;
    }

    // Для статистики
    static async getCount(userId) {
        const [rows] = await db.execute('SELECT COUNT(*) as count FROM redirects WHERE user_id = ?', [userId]);
        return rows[0].count;
    }

    static async getActiveCount(userId) {
        const [rows] = await db.execute(
            'SELECT COUNT(*) as count FROM redirects WHERE user_id = ? AND is_active = 1 AND (expires_at IS NULL OR expires_at > NOW())',
            [userId]
        );
        return rows[0].count;
    }
}

module.exports = Redirect;