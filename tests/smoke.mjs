import fs from 'node:fs';

const VERSION = '0.3.4';
const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const assert = (condition, message) => {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exitCode = 1;
  }
};

const app = read('js/app.js');
const css = read('css/app.css');
const readerCss = read('css/reader.css');
const index = read('index.html');
const config = read('config.js');
const sw = read('sw.js');
const manifest = JSON.parse(read('manifest.webmanifest'));
const pkg = JSON.parse(read('package.json'));

assert(pkg.version === VERSION, 'package.json version');
assert(config.includes(`appVersion: '${VERSION}'`), 'config version');
assert(index.includes(`app.js?v=${VERSION}`), 'versioned app.js');
assert(index.includes(`app.css?v=${VERSION}`), 'versioned app.css');
assert(index.includes(`reader.css?v=${VERSION}`), 'versioned reader.css');
assert(sw.includes(`v${VERSION}`), 'service worker cache version');
assert(sw.includes(`app.js?v=${VERSION}`), 'service worker precaches versioned JS');
assert(sw.includes(`app.css?v=${VERSION}`), 'service worker precaches versioned CSS');
assert(sw.includes(`reader.css?v=${VERSION}`), 'service worker precaches reader CSS');
assert(!css.includes('\\\\n') && !readerCss.includes('\\\\n'), 'CSS must not contain literal \\n sequences');
assert(!app.includes('LOCAL_RUNTIME_URLS'), 'no references to missing local vendor runtimes');
assert(app.includes("import('./modules/offline-webp.js')"), 'WebP offline module wired');
assert(index.includes('Content-Security-Policy'), 'CSP meta is present');
assert(index.includes('https://raw.githubusercontent.com'), 'CSP allows external raw GitHub PDF/cover assets');
assert(index.includes('keepZoomSelect'), 'keep zoom preference is present');
assert(app.includes('function zoomAtPoint'), 'point-centered zoom helper is present');
assert(app.includes('function flipbookLayoutClass'), 'flipbook single-page layout helper is present');
assert(app.includes('readerHistoryActive'), 'reader history integration is present');
assert(app.includes('verticalOffsetRatio'), 'vertical exact progress is present');
assert(app.includes('function queuePagePrefetch'), 'controlled prefetch queue is present');
assert(app.includes('pageTransitioning'), 'page navigation coalescing is present');
assert(app.includes('fileUrl'), 'external PDF fileUrl support is present');
assert(manifest.name === 'Manga-HQ-hub', 'PWA manifest name');

if (!process.exitCode) console.log('Smoke validation OK');
