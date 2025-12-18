
const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const filepath = path.join(dir, file);
        const stats = fs.statSync(filepath);
        if (stats.isDirectory()) {
            walk(filepath, callback);
        } else if (stats.isFile() && file.endsWith('.js')) {
            callback(filepath);
        }
    });
}

const distDir = path.join(process.cwd(), 'api', 'dist');
console.log('Scanning ' + distDir);

walk(distDir, (filepath) => {
    const content = fs.readFileSync(filepath, 'utf8');
    // Match 'from ".../errorHandler"' or 'require(".../errorHandler")' WITHOUT .js ending
    // Regex: look for errorHandler followed by quote, NOT by .js
    // But regex lookahead might be tricky if not careful.
    // Simple check: index of "errorHandler'" or 'errorHandler"'

    const lines = content.split('\n');
    lines.forEach((line, index) => {
        if (line.includes('middleware/errorHandler')) {
            if (!line.includes('middleware/errorHandler.js')) {
                console.log(`FOUND BAD IMPORT in ${filepath}:${index + 1}`);
                console.log(line.trim());
            }
        }
    });
});
