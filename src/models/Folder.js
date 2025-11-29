const db = require('../config/database');

class Folder {
    static async getByUser(userId) {
        const [rows] = await db.execute(`
            SELECT f.*, COUNT(r.id) as link_count
            FROM folders f
            LEFT JOIN redirects r ON f.id = r.folder_id
            WHERE f.user_id = ?
            GROUP BY f.id
            ORDER BY f.sort_order, f.name
        `, [userId]);
        return rows;
    }

    static async findById(id) {
        const [rows] = await db.execute('SELECT * FROM folders WHERE id = ?', [id]);
        return rows[0] || null;
    }

    static async create({ userId, name, color = '#5c6ac4' }) {
        const [result] = await db.execute(
            'INSERT INTO folders (user_id, name, color) VALUES (?, ?, ?)',
            [userId, name, color]
        );
        return { id: result.insertId, name, color };
    }

    static async update(id, { name, color }) {
        await db.execute(
            'UPDATE folders SET name = ?, color = ? WHERE id = ?',
            [name, color, id]
        );
    }

    static async updateOrder(id, sortOrder) {
        await db.execute('UPDATE folders SET sort_order = ? WHERE id = ?', [sortOrder, id]);
    }

    static async delete(id) {
        await db.execute('DELETE FROM folders WHERE id = ?', [id]);
    }
}

module.exports = Folder;