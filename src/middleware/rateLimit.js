const rateLimit = require('express-rate-limit');

// Общий лимит
const generalLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 100,
    message: { error: 'Слишком много запросов' }
});

// Лимит на редиректы (защита от спама)
const redirectLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 60,
    message: { error: 'Слишком много переходов' },
    keyGenerator: (req) => req.ip
});

// Лимит на авторизацию
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: 'Слишком много попыток входа' }
});

module.exports = { generalLimiter, redirectLimiter, authLimiter };