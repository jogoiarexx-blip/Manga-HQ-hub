import fs from 'node:fs';

const VERSION = '0.3.5';
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
assert(sw.includes(`const APP_VERSION = '${VERSION}'`), 'service worker version');
assert(sw.includes('`./js/app.js?v=${APP_VERSION}`'), 'service worker precaches versioned JS');
assert(sw.includes('`./css/app.css?v=${APP_VERSION}`'), 'service worker precaches versioned CSS');
assert(sw.includes('`./css/reader.css?v=${APP_VERSION}`'), 'service worker precaches reader CSS');
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
assert(index.includes(`config.js?v=${VERSION}`), 'versioned config.js');
assert(index.includes(`Manga-HQ-hub v${VERSION}`), 'visible title version');
assert(index.includes('external-acervo-2'), 'Acervo 2 source option is present');
assert(app.includes('function renderSourceOptions'), 'dynamic source selector is present');
assert(app.includes('Promise.all(jobs)'), 'external catalogs load in parallel');
assert(app.includes('failedSourceIds'), 'failed external source fallback is present');
assert(sw.includes('REMOTE_IMAGE_CACHE'), 'remote image cache is present');
assert(sw.includes('RAW_GITHUB_ORIGIN'), 'raw GitHub routing is present');
assert(index.includes('alphabetIndex'), 'alphabet navigation exists');
assert(app.includes('function jumpToCatalogLetter'), 'alphabet jump logic exists');
assert(app.includes('function renderAlphabeticalCards'), 'alphabet sections exist');
assert(app.includes("classList.toggle('mobile-fullbleed'"), 'mobile full-bleed reader is wired');
assert(readerCss.includes('.reader.mobile-fullbleed'), 'mobile full-bleed CSS exists');
assert(app.includes('function updateAlphabetFromScroll'), 'alphabet scroll tracking exists');
assert(app.includes('function setActiveAlphabetLetter'), 'alphabet active state exists');
assert(app.includes('function toggleReaderChrome'), 'reader chrome toggle exists');
assert(app.includes('function scheduleReaderChromeHide'), 'reader chrome auto-hide exists');
assert(readerCss.includes('.reader-chrome-hidden'), 'reader chrome hidden CSS exists');
assert(appCss.includes('.alphabet-btn.active'), 'active alphabet button CSS exists');
assert(manifest.name === 'Manga-HQ-hub', 'PWA manifest name');

if (!process.exitCode) console.log('Smoke validation OK');
