import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const sourceIcon = path.join(process.cwd(), 'public', 'icons', 'icon128.png');
const destDir = path.join(process.cwd(), 'public', 'icons');

async function generateIcons() {
    if (!fs.existsSync(sourceIcon)) {
        console.error('Source icon not found:', sourceIcon);
        process.exit(1);
    }

    const sizes = [16, 32, 48];

    for (const size of sizes) {
        const destPath = path.join(destDir, `icon${size}.png`);
        console.log(`Generating ${size}x${size} icon...`);
        try {
            await sharp(sourceIcon)
                .resize(size, size)
                .toFile(destPath);
            console.log(`Created ${destPath}`);
        } catch (error) {
            console.error(`Error generating ${size}x${size} icon:`, error);
        }
    }
}

generateIcons().catch(console.error);
