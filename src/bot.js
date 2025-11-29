// src/bot.js
require('dotenv').config();

const TelegramBot = require('node-telegram-bot-api');
const db = require('./config/database');
const Redirect = require('./models/Redirect');
const ClickLog = require('./models/ClickLog');

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
    console.log('⚠️ TELEGRAM_BOT_TOKEN не установлен, бот не запущен');
    process.exit(0);
}

const bot = new TelegramBot(token, { polling: true });

console.log('🤖 Telegram бот запущен');

// /start
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, `
👋 Привет! Я бот для управления QR-ссылками.

Команды:
/link <url> — создать новую ссылку
/stats <slug> — статистика по ссылке
/list — список ваших ссылок
/connect <email> — привязать аккаунт

Пример: /link https://example.com
    `);
});

// /connect
bot.onText(/\/connect (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const email = match[1].trim();

    try {
        const [users] = await db.execute('SELECT id FROM users WHERE email = ?', [email]);
        if (users.length === 0) {
            return bot.sendMessage(chatId, '❌ Пользователь с таким email не найден');
        }

        await db.execute(
            'INSERT INTO telegram_users (user_id, chat_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE user_id = ?',
            [users[0].id, chatId, users[0].id]
        );

        bot.sendMessage(chatId, '✅ Аккаунт привязан! Теперь вы можете управлять ссылками.');
    } catch (error) {
        bot.sendMessage(chatId, '❌ Ошибка привязки');
    }
});

// Получить userId по chatId
async function getUserId(chatId) {
    const [rows] = await db.execute('SELECT user_id FROM telegram_users WHERE chat_id = ?', [chatId]);
    return rows[0]?.user_id || null;
}

// /link
bot.onText(/\/link (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const url = match[1].trim();

    const userId = await getUserId(chatId);
    if (!userId) {
        return bot.sendMessage(chatId, '❌ Сначала привяжите аккаунт: /connect ваш@email.com');
    }

    try {
        new URL(url);
    } catch {
        return bot.sendMessage(chatId, '❌ Некорректный URL');
    }

    try {
        // Генерируем случайный slug
        const slug = Math.random().toString(36).substring(2, 8);

        const redirect = await Redirect.create({
            userId,
            slug,
            targetUrl: url,
            comment: 'Создано через Telegram'
        });

        const fullUrl = `${process.env.BASE_URL}/qr/${slug}`;
        bot.sendMessage(chatId, `✅ Ссылка создана!\n\n🔗 ${fullUrl}\n\nИспользуйте /stats ${slug} для просмотра статистики`);
    } catch (error) {
        bot.sendMessage(chatId, '❌ Ошибка создания ссылки');
    }
});

// /stats
bot.onText(/\/stats (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const slug = match[1].trim();

    const userId = await getUserId(chatId);
    if (!userId) {
        return bot.sendMessage(chatId, '❌ Сначала привяжите аккаунт');
    }

    try {
        const redirect = await Redirect.findBySlug(slug);
        if (!redirect || redirect.user_id !== userId) {
            return bot.sendMessage(chatId, '❌ Ссылка не найдена');
        }

        const stats = await ClickLog.getStats(redirect.id, 30);

        bot.sendMessage(chatId, `
📊 Статистика: /qr/${slug}

👆 Всего переходов: ${stats.totalClicks}
👤 Уникальных: ${stats.uniqueClicks}
📅 За 30 дней: ${stats.periodClicks}

📱 Устройства:
${stats.byDevice.map(d => `  ${d.device_type}: ${d.count}`).join('\n') || '  Нет данных'}
        `);
    } catch (error) {
        bot.sendMessage(chatId, '❌ Ошибка получения статистики');
    }
});

// /list
bot.onText(/\/list/, async (msg) => {
    const chatId = msg.chat.id;

    const userId = await getUserId(chatId);
    if (!userId) {
        return bot.sendMessage(chatId, '❌ Сначала привяжите аккаунт');
    }

    try {
        const redirects = await Redirect.getByUser(userId, { limit: 10 });

        if (redirects.length === 0) {
            return bot.sendMessage(chatId, '📭 У вас пока нет ссылок');
        }

        const list = redirects.map(r => 
            `🔗 /qr/${r.slug} — ${r.click_count} переходов`
        ).join('\n');

        bot.sendMessage(chatId, `📋 Ваши ссылки:\n\n${list}`);
    } catch (error) {
        bot.sendMessage(chatId, '❌ Ошибка получения списка');
    }
});