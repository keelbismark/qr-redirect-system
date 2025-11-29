const geoip = require('geoip-lite');

class GeoService {
    static lookup(ip) {
        // Пропускаем локальные IP
        if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
            return { country_code: null, country_name: null, city: null };
        }

        const geo = geoip.lookup(ip);
        
        if (!geo) {
            return { country_code: null, country_name: null, city: null };
        }

        return {
            country_code: geo.country || null,
            country_name: this.getCountryName(geo.country) || null,
            city: geo.city || null
        };
    }

    static getCountryName(code) {
        const countries = {
            'RU': 'Россия', 'UA': 'Украина', 'BY': 'Беларусь', 'KZ': 'Казахстан',
            'US': 'США', 'DE': 'Германия', 'FR': 'Франция', 'GB': 'Великобритания',
            'CN': 'Китай', 'JP': 'Япония', 'KR': 'Южная Корея', 'IN': 'Индия',
            'BR': 'Бразилия', 'CA': 'Канада', 'AU': 'Австралия', 'IT': 'Италия',
            'ES': 'Испания', 'NL': 'Нидерланды', 'PL': 'Польша', 'TR': 'Турция',
            'UZ': 'Узбекистан', 'GE': 'Грузия', 'AM': 'Армения', 'AZ': 'Азербайджан'
        };
        return countries[code] || code;
    }
}

module.exports = GeoService;