const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.join(__dirname, '..');

function readFile(relativePath) {
    return fs.readFileSync(path.join(REPO_ROOT, relativePath), 'utf8');
}

function walkJavaScriptFiles(startRelativePath) {
    const startPath = path.join(REPO_ROOT, startRelativePath);
    const files = [];

    function walk(currentPath) {
        const entries = fs.readdirSync(currentPath, { withFileTypes: true });

        for (const entry of entries) {
            const absolutePath = path.join(currentPath, entry.name);
            const relativePath = path.relative(REPO_ROOT, absolutePath).replace(/\\/g, '/');

            if (entry.isDirectory()) {
                if (entry.name === 'node_modules' || entry.name === '.git') continue;
                walk(absolutePath);
                continue;
            }

            if (entry.isFile() && entry.name.endsWith('.js')) {
                files.push(relativePath);
            }
        }
    }

    walk(startPath);
    return files.sort();
}

function getRuntimeJavaScriptFiles() {
    return [
        'index.js',
        ...walkJavaScriptFiles('src')
    ].sort();
}

function hasRequireOf(source, target) {
    const escaped = target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`require\\(\\s*['\"]${escaped}['\"]\\s*\\)`);
    return pattern.test(source);
}

test('index.js importa somente o entrypoint canônico combatActive', () => {
    const source = readFile('index.js');

    assert.match(
        source,
        /const\s+combat\s*=\s*require\(['"]\.\/src\/handlers\/combatActive['"]\)/,
        'index.js deve importar ./src/handlers/combatActive'
    );

    assert.doesNotMatch(source, /\.\/src\/handlers\/combatSoulFixed/);
    assert.doesNotMatch(source, /\.\/src\/handlers\/combatFixed/);
    assert.doesNotMatch(source, /\.\/src\/handlers\/combat['"]/);
});

test('imports diretos dos handlers legados de combate ficam restritos à cadeia permitida', () => {
    const allowedImports = new Map([
        ['src/handlers/combatActive.js', new Set(['./combatFixed'])],
        ['src/handlers/combatSoulFixed.js', new Set(['./combatFixed'])],
        ['src/handlers/combatFixed.js', new Set(['./combat'])]
    ]);

    const legacyTargets = [
        './combatSoulFixed',
        './combatFixed',
        './combat',
        './src/handlers/combatSoulFixed',
        './src/handlers/combatFixed',
        './src/handlers/combat',
        '../handlers/combatSoulFixed',
        '../handlers/combatFixed',
        '../handlers/combat'
    ];

    const offenders = [];

    for (const file of getRuntimeJavaScriptFiles()) {
        const source = readFile(file);
        const allowedForFile = allowedImports.get(file) || new Set();

        for (const target of legacyTargets) {
            if (!hasRequireOf(source, target)) continue;
            if (allowedForFile.has(target)) continue;

            offenders.push(`${file} -> ${target}`);
        }
    }

    assert.deepEqual(
        offenders,
        [],
        `Imports diretos de handlers legados de combate encontrados: ${offenders.join(', ')}`
    );
});

test('combatActive continua sendo o único ponto estável para o runtime do combate', () => {
    const activeSource = readFile('src/handlers/combatActive.js');
    const policySource = readFile('docs/COMBAT_ACTIVE_ENTRYPOINT.md');

    assert.match(activeSource, /const\s+combatFixed\s*=\s*require\(['"]\.\/combatFixed['"]\)/);
    assert.doesNotMatch(activeSource, /require\(['"]\.\/combatSoulFixed['"]\)/);
    assert.match(policySource, /combatActive -> combatFixed -> combat/);
    assert.match(policySource, /combatSoulFixed\.js.*legado temporário/i);
    assert.match(policySource, /não trocar handler ativo sem teste/i);
});
