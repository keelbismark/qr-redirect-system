const db = require('../config/database');
const { hashPassword, comparePassword } = require('../middleware/auth');

class User {
    static async findById(id) {
        const [rows] = await db.execute(
            'SELECT id, email, name, role, created_at FROM users WHERE id = ?',
            [id]
        );
        return rows[0] || null;
    }

    static async findByEmail(email) {
        const [rows] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
        return rows[0] || null;
    }

    static async create({ email, password, name, role = 'editor' }) {
        const hash = await hashPassword(password);
        const [result] = await db.execute(
            'INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)',
            [email, hash, name, role]
        );
        return { id: result.insertId, email, name, role };
    }

    static async updatePassword(id, newPassword) {
        const hash = await hashPassword(newPassword);
        await db.execute('UPDATE users SET password_hash = ? WHERE id = ?', [hash, id]);
    }

    static async getAll() {
        const [rows] = await db.execute(
            'SELECT id, email, name, role, created_at FROM users ORDER BY created_at DESC'
        );
        return rows;
    }

    static async delete(id) {
        await db.execute('DELETE FROM users WHERE id = ?', [id]);
    }
}

module.exports = User;