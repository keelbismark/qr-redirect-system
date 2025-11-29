const crypto = require('crypto');

function generateFingerprint(ip, userAgent) {
    const data = `${ip}|${userAgent}`;
    return crypto.createHash('md5').update(data).digest('hex');
}

module.exports = { generateFingerprint };