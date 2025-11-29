class ExportService {
    static async toCSV(data, columns) {
        const headers = columns.map(c => c.label).join(',');
        const rows = data.map(row => 
            columns.map(c => {
                let val = row[c.key];
                if (val === null || val === undefined) val = '';
                if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
                    val = '"' + val.replace(/"/g, '""') + '"';
                }
                return val;
            }).join(',')
        );

        return '\uFEFF' + headers + '\n' + rows.join('\n'); // BOM для Excel
    }

    static getClicksColumns() {
        return [
            { key: 'clicked_at', label: 'Дата и время' },
            { key: 'ip_address', label: 'IP' },
            { key: 'country_name', label: 'Страна' },
            { key: 'city', label: 'Город' },
            { key: 'device_type', label: 'Устройство' },
            { key: 'browser', label: 'Браузер' },
            { key: 'os', label: 'ОС' },
            { key: 'referrer', label: 'Источник' }
        ];
    }

    static getRedirectsColumns() {
        return [
            { key: 'slug', label: 'Slug' },
            { key: 'target_url', label: 'URL' },
            { key: 'comment', label: 'Комментарий' },
            { key: 'click_count', label: 'Переходы' },
            { key: 'is_active', label: 'Активна' },
            { key: 'created_at', label: 'Создана' }
        ];
    }
}

module.exports = ExportService;