
import fs from 'fs';
import path from 'path';

function walk(dir, callback) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const filepath = path.join(dir, file);
        try {
            const stats = fs.statSync(filepath);
            if (stats.isDirectory()) {
                walk(filepath, callback);
            } else if (stats.isFile() && file.endsWith('.js')) {
                callback(filepath);
            }
        } catch (e) { }
    });
}

const distDir = path.join(process.cwd(), 'api', 'dist');
console.log('Scanning ' + distDir);

walk(distDir, (filepath) => {
    const content = fs.readFileSync(filepath, 'utf8');
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
