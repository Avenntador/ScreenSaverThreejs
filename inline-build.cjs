const fs = require('fs');
const path = require('path');

// Функция для получения MIME типа
function getMimeType(ext) {
    const mimeTypes = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.webp': 'image/webp',
        '.ico': 'image/x-icon'
    };
    return mimeTypes[ext] || 'application/octet-stream';
}

// Функция для инлайна текстур в JS код
function inlineTexturesInJS(jsContent) {
    return jsContent.replace(
        /loader\.load\(['"]([^'"]+\.(jpg|png|jpeg|gif|webp))['"]\)/g,
        (match, texturePath) => {
            console.log(`Found texture reference: ${texturePath}`);

            let fullTexturePath;

            // Проверяем разные возможные пути
            if (fs.existsSync(path.join(__dirname, 'dist', texturePath))) {
                fullTexturePath = path.join(__dirname, 'dist', texturePath);
            } else if (fs.existsSync(path.join(__dirname, 'public', texturePath))) {
                fullTexturePath = path.join(__dirname, 'public', texturePath);
            } else if (fs.existsSync(path.join(__dirname, texturePath))) {
                fullTexturePath = path.join(__dirname, texturePath);
            } else {
                console.warn(`Texture not found: ${texturePath}`);
                return match;
            }

            try {
                const textureBuffer = fs.readFileSync(fullTexturePath);
                const textureExt = path.extname(texturePath).toLowerCase();
                const mimeType = getMimeType(textureExt);
                const dataURL = `data:${mimeType};base64,${textureBuffer.toString('base64')}`;

                console.log(`Inlined texture: ${texturePath}`);
                return `loader.load('${dataURL}')`;
            } catch (error) {
                console.error(`Error processing texture ${texturePath}:`, error);
                return match;
            }
        }
    );
}

// Функция для инлайна текстур в импортах
function inlineTextureImports(jsContent) {
    return jsContent.replace(
        /import\s+(\w+)\s+from\s+['"]([^'"]+\.(jpg|png|jpeg|gif|webp))['"]/g,
        (match, varName, texturePath) => {
            console.log(`Found texture import: ${texturePath}`);

            let fullTexturePath;

            if (fs.existsSync(path.join(__dirname, 'dist', texturePath))) {
                fullTexturePath = path.join(__dirname, 'dist', texturePath);
            } else if (fs.existsSync(path.join(__dirname, 'public', texturePath))) {
                fullTexturePath = path.join(__dirname, 'public', texturePath);
            } else if (fs.existsSync(path.join(__dirname, texturePath))) {
                fullTexturePath = path.join(__dirname, texturePath);
            } else {
                console.warn(`Texture not found for import: ${texturePath}`);
                return match;
            }

            try {
                const textureBuffer = fs.readFileSync(fullTexturePath);
                const textureExt = path.extname(texturePath).toLowerCase();
                const mimeType = getMimeType(textureExt);
                const dataURL = `data:${mimeType};base64,${textureBuffer.toString('base64')}`;

                console.log(`Inlined imported texture: ${texturePath}`);
                return `const ${varName} = '${dataURL}'`;
            } catch (error) {
                console.error(`Error processing imported texture ${texturePath}:`, error);
                return match;
            }
        }
    );
}

// Функция для инлайна CSS
function inlineCSS(htmlContent) {
    return htmlContent.replace(
        /<link rel="stylesheet" href="([^"]+)">/g,
        (match, cssPath) => {
            const fullCssPath = path.join(__dirname, 'dist', cssPath);
            if (fs.existsSync(fullCssPath)) {
                try {
                    const cssContent = fs.readFileSync(fullCssPath, 'utf8');
                    return `<style>${cssContent}</style>`;
                } catch (error) {
                    console.error(`Error processing CSS ${cssPath}:`, error);
                    return match;
                }
            }
            console.warn(`CSS not found: ${cssPath}`);
            return match;
        }
    );
}

// Функция для инлайна JS с текстурами
function inlineJS(htmlContent) {
    return htmlContent.replace(
        /<script type="module"[^>]*src="([^"]+)"[^>]*><\/script>/g,
        (match, jsPath) => {
            const fullJsPath = path.join(__dirname, 'dist', jsPath);
            if (fs.existsSync(fullJsPath)) {
                try {
                    let jsContent = fs.readFileSync(fullJsPath, 'utf8');

                    // Инлайним текстуры в JS коде
                    jsContent = inlineTexturesInJS(jsContent);
                    jsContent = inlineTextureImports(jsContent);

                    return `<script type="module">${jsContent}</script>`;
                } catch (error) {
                    console.error(`Error processing JS ${jsPath}:`, error);
                    return match;
                }
            }
            console.warn(`JS not found: ${jsPath}`);
            return match;
        }
    );
}

// Основная функция
function buildScreensaver() {
    console.log('Building single HTML screensaver...');

    // Читаем собранный HTML
    const htmlPath = path.join(__dirname, 'dist', 'index.html');
    if (!fs.existsSync(htmlPath)) {
        console.error('Error: dist/index.html not found. Run "npm run build" first.');
        process.exit(1);
    }

    let htmlContent = fs.readFileSync(htmlPath, 'utf8');

    console.log('Inlining CSS...');
    htmlContent = inlineCSS(htmlContent);

    console.log('Inlining JS and textures...');
    htmlContent = inlineJS(htmlContent);

    // Удаляем preload и другие ненужные теги
    htmlContent = htmlContent.replace(/<link rel="modulepreload"[^>]*>/g, '');
    htmlContent = htmlContent.replace(/<link rel="preload"[^>]*>/g, '');
    htmlContent = htmlContent.replace(/<link rel="icon"[^>]*>/g, '');

    // Добавляем обработчики выхода для скринсейвера
    const exitScript = `
<script>
// Обработчики выхода для скринсейвера
// window.addEventListener('keydown', (e) => {
//   if (e.key === 'Escape' || e.ctrlKey || e.altKey) {
//     window.close();
//   }
// });
// window.addEventListener('click', () => window.close());
// window.addEventListener('mousemove', () => window.close());
// window.addEventListener('touchstart', () => window.close());

// Переопределяем TextureLoader для отладки
const originalLoad = THREE.TextureLoader.prototype.load;
THREE.TextureLoader.prototype.load = function(url, onLoad, onProgress, onError) {
  console.log('Loading texture:', url);
  return originalLoad.call(this, url, onLoad, onProgress, onError);
};
</script>
`;

    htmlContent = htmlContent.replace('</body>', `${exitScript}</body>`);

    // Сохраняем результат
    const outputPath = path.join(__dirname, 'dist', 'screensaver.html');
    fs.writeFileSync(outputPath, htmlContent);

    console.log('✅ Screensaver HTML created successfully!');
    console.log('📁 File:', outputPath);
    console.log('🎯 All textures should be inlined now!');
}

// Запускаем сборку
buildScreensaver();