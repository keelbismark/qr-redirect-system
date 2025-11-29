// src/services/QRStyleService.js
const QRCode = require('qrcode');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;

class QRStyleService {

    static async generate(url, options = {}) {
        const {
            size = 1000, // Генерируем в высоком качестве по умолчанию
            margin = 40,
            style = 'square',
            eyeStyle = 'square',
            color = '#000000',
            bg = '#FFFFFF',
            logoPath = null,
            format = 'png'
        } = options;

        // 1. Матрица
        const qrData = await QRCode.create(url, { errorCorrectionLevel: 'H' });
        const modules = qrData.modules;
        const count = modules.size;

        // 2. Размеры
        const contentSize = size - (margin * 2);
        const cellSize = contentSize / count;

        let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">`;
        
        // Фон
        svg += `<rect width="100%" height="100%" fill="${bg}"/>`;

        const isEye = (r, c) => {
            if (r < 7 && c < 7) return true;
            if (r < 7 && c >= count - 7) return true;
            if (r >= count - 7 && c < 7) return true;
            return false;
        };

        let pathData = '';
        let eyeData = '';

        // Хелперы
        const drawRect = (x, y, w, h) => `M${x},${y}h${w}v${h}h-${w}z`;
        const drawCircle = (cx, cy, r) => `M${cx},${cy} m-${r},0 a${r},${r} 0 1,0 ${r*2},0 a${r},${r} 0 1,0 -${r*2},0`;
        const drawRounded = (x, y, s, r) => `M${x+r},${y} h${s-2*r} a${r},${r} 0 0 1 ${r},${r} v${s-2*r} a${r},${r} 0 0 1 -${r},${r} h-${s-2*r} a${r},${r} 0 0 1 -${r},-${r} v-${s-2*r} a${r},${r} 0 0 1 ${r},-${r} z`;

        // 3. Модули
        for (let r = 0; r < count; r++) {
            for (let c = 0; c < count; c++) {
                if (!modules.get(r, c) || isEye(r, c)) continue;

                const x = margin + c * cellSize;
                const y = margin + r * cellSize;

                if (style === 'liquid') {
                    const cx = x + cellSize / 2;
                    const cy = y + cellSize / 2;
                    const rad = cellSize / 2;
                    // Круг + перекрытия
                    pathData += drawCircle(cx, cy, rad + 0.2);
                    if (c < count - 1 && modules.get(r, c + 1) && !isEye(r, c + 1)) pathData += drawRect(cx, y, cellSize, cellSize);
                    if (r < count - 1 && modules.get(r + 1, c) && !isEye(r + 1, c)) pathData += drawRect(x, cy, cellSize, cellSize);
                } 
                else if (style === 'dots') {
                    const cx = x + cellSize / 2;
                    const cy = y + cellSize / 2;
                    pathData += drawCircle(cx, cy, cellSize * 0.35);
                } 
                else if (style === 'rounded') {
                    pathData += drawRounded(x, y, cellSize, cellSize * 0.35);
                } 
                else if (style === 'classy') {
                    pathData += drawRounded(x, y, cellSize, cellSize * 0.1); // Лёгкое скругление
                }
                else { // square
                    pathData += drawRect(x, y, cellSize + 0.2, cellSize + 0.2);
                }
            }
        }

        // 4. Глаза
        const eyes = [{ r: 0, c: 0 }, { r: 0, c: count - 7 }, { r: count - 7, c: 0 }];
        
        for (const eye of eyes) {
            const x = margin + eye.c * cellSize;
            const y = margin + eye.r * cellSize;
            const s = cellSize * 7;

            if (eyeStyle === 'circle') {
                const cx = x + s/2, cy = y + s/2, rOut = s/2, rIn = s/2 - cellSize;
                eyeData += `M${cx},${cy} m-${rOut},0 a${rOut},${rOut} 0 1,0 ${rOut*2},0 a${rOut},${rOut} 0 1,0 -${rOut*2},0 M${cx},${cy} m-${rIn},0 a${rIn},${rIn} 0 1,1 ${rIn*2},0 a${rIn},${rIn} 0 1,1 -${rIn*2},0 `;
                eyeData += drawCircle(cx, cy, cellSize * 1.5);
            } else if (eyeStyle === 'rounded') {
                // Хак с маской через наложение слоев в SVG
                svg += `<rect x="${x}" y="${y}" width="${s}" height="${s}" rx="${cellSize*2}" fill="${color}"/>`;
                svg += `<rect x="${x+cellSize}" y="${y+cellSize}" width="${s-2*cellSize}" height="${s-2*cellSize}" rx="${cellSize}" fill="${bg}"/>`;
                svg += `<rect x="${x+2*cellSize}" y="${y+2*cellSize}" width="${s-4*cellSize}" height="${s-4*cellSize}" rx="${cellSize}" fill="${color}"/>`;
            } else {
                eyeData += drawRect(x, y, s, cellSize); // Top
                eyeData += drawRect(x, y + s - cellSize, s, cellSize); // Bottom
                eyeData += drawRect(x, y, cellSize, s); // Left
                eyeData += drawRect(x + s - cellSize, y, cellSize, s); // Right
                eyeData += drawRect(x + 2*cellSize, y + 2*cellSize, 3*cellSize, 3*cellSize); // Center
            }
        }

        svg += `<path d="${pathData}" fill="${color}"/>`;
        svg += `<path d="${eyeData}" fill="${color}"/>`;
        svg += `</svg>`;

        if (format === 'svg') return svg;

        let img = sharp(Buffer.from(svg)).png();

        // Логотип
        if (logoPath) {
            const logoSize = Math.round(size * 0.22);
            const bgSize = logoSize + 20;
            const bgSvg = `<svg width="${bgSize}" height="${bgSize}"><rect x="0" y="0" width="${bgSize}" height="${bgSize}" rx="16" fill="${bg}"/></svg>`;
            
            const logoBuffer = await sharp(logoPath)
                .resize(logoSize, logoSize, { fit: 'contain', background: {r:0,g:0,b:0,alpha:0} })
                .toBuffer();

            img = img.composite([
                { input: Buffer.from(bgSvg), gravity: 'center' },
                { input: logoBuffer, gravity: 'center' }
            ]);
        }

        if (format === 'base64') {
            const buffer = await img.toBuffer();
            return 'data:image/png;base64,' + buffer.toString('base64');
        }

        return img.toBuffer();
    }

    static async saveLogo(file) {
        const uploadDir = path.join(process.env.UPLOAD_DIR || './uploads', 'logos');
        await fs.mkdir(uploadDir, { recursive: true });
        const filename = `logo_${Date.now()}.png`;
        const filepath = path.join(uploadDir, filename);
        await sharp(file.buffer).resize(300, 300, { fit: 'contain' }).png().toFile(filepath);
        return filepath;
    }
}

module.exports = QRStyleService;