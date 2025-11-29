const QRCode = require('qrcode');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;

class QRService {
    static async generate(url, options = {}) {
        const {
            size = 300,
            darkColor = '#000000',
            lightColor = '#FFFFFF',
            margin = 2,
            format = 'png',
            logoPath = null
        } = options;

        const qrOptions = {
            width: Math.min(Math.max(size, 100), 1000),
            margin,
            color: { dark: darkColor, light: lightColor },
            errorCorrectionLevel: logoPath ? 'H' : 'M'
        };

        if (format === 'svg') {
            return QRCode.toString(url, { ...qrOptions, type: 'svg' });
        }

        // Генерируем QR как Buffer
        let qrBuffer = await QRCode.toBuffer(url, qrOptions);

        // Если есть логотип, накладываем его
        if (logoPath) {
            qrBuffer = await this.addLogo(qrBuffer, logoPath, qrOptions.width);
        }

        if (format === 'base64') {
            return 'data:image/png;base64,' + qrBuffer.toString('base64');
        }

        return qrBuffer;
    }

    static async addLogo(qrBuffer, logoPath, size) {
        try {
            const logoSize = Math.floor(size * 0.25); // Логотип 25% от размера QR
            const logoPosition = Math.floor((size - logoSize) / 2);

            // Подготавливаем логотип
            const logo = await sharp(logoPath)
                .resize(logoSize, logoSize, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
                .png()
                .toBuffer();

            // Накладываем логотип на QR
            return sharp(qrBuffer)
                .composite([{
                    input: logo,
                    left: logoPosition,
                    top: logoPosition
                }])
                .png()
                .toBuffer();
        } catch (error) {
            console.error('Ошибка добавления логотипа:', error);
            return qrBuffer; // Возвращаем QR без логотипа
        }
    }

    static async saveLogo(file) {
        const uploadDir = path.join(process.env.UPLOAD_DIR || './uploads', 'logos');
        await fs.mkdir(uploadDir, { recursive: true });

        const filename = `logo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.png`;
        const filepath = path.join(uploadDir, filename);

        // Оптимизируем и сохраняем
        await sharp(file.buffer)
            .resize(200, 200, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
            .png()
            .toFile(filepath);

        return filepath;
    }
}

module.exports = QRService;