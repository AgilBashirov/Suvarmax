/**
 * Admin Nav PDF API smoke test (login → admin/data → upload → PUT site → public /api/site).
 * Run: node scripts/test-nav-pdf-admin.mjs
 * Expects server on PORT (default 3000) and valid admin in data/site-data.json.
 */
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const PORT = process.env.PORT || 3000;
const BASE = `http://127.0.0.1:${PORT}`;

const MIN_PDF = Buffer.from(
  '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 3 3]/Parent 2 0 R>>endobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000052 00000 n \n0000000101 00000 n \ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n178\n%%EOF\n'
);

function cookieFromResponse(res, name) {
  const h = res.headers.get('set-cookie');
  if (!h) return '';
  const m = h.match(new RegExp(`${name}=([^;]+)`));
  return m ? `${name}=${m[1]}` : '';
}

async function main() {
  let cookie = '';

  const loginRes = await fetch(`${BASE}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' }),
  });
  const loginJson = await loginRes.json();
  if (!loginRes.ok || !loginJson.ok) {
    console.error('FAIL login', loginRes.status, loginJson);
    process.exit(1);
  }
  cookie = cookieFromResponse(loginRes, 'suvarmax_admin');
  if (!cookie) {
    console.error('FAIL no suvarmax_admin cookie');
    process.exit(1);
  }
  console.log('OK login');

  const dataRes = await fetch(`${BASE}/api/admin/data`, { headers: { Cookie: cookie } });
  const dataJson = await dataRes.json();
  if (!dataRes.ok || !dataJson.site) {
    console.error('FAIL admin/data', dataRes.status);
    process.exit(1);
  }
  const np = dataJson.site.navPdf || {};
  console.log('OK admin/data navPdf keys:', Object.keys(np).join(', ') || '(empty)');
  if (!('pathAz' in np)) {
    console.warn('WARN server cavabında pathAz yoxdur — bəlkə köhnə proses işləyir; serveri yenidən başladın.');
  }

  const fd = new FormData();
  fd.append('file', new Blob([MIN_PDF], { type: 'application/pdf' }), 'smoke.pdf');
  const upRes = await fetch(`${BASE}/api/admin/upload/pdf`, {
    method: 'POST',
    headers: { Cookie: cookie },
    body: fd,
  });
  const upJson = await upRes.json();
  if (!upRes.ok || !upJson.ok || !upJson.path) {
    console.error('FAIL upload/pdf', upRes.status, upJson);
    process.exit(1);
  }
  console.log('OK upload/pdf →', upJson.path);

  const siteFull = { ...dataJson.site, navPdf: { ...np, pathAz: upJson.path, pathRu: '', pathEn: '' } };
  delete siteFull.navPdf.path;
  const putRes = await fetch(`${BASE}/api/admin/site`, {
    method: 'PUT',
    headers: { Cookie: cookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({ site: siteFull }),
  });
  const putJson = await putRes.json();
  if (!putRes.ok || !putJson.ok) {
    console.error('FAIL PUT site', putRes.status, putJson);
    process.exit(1);
  }
  const savedNp = putJson.site && putJson.site.navPdf;
  console.log('OK PUT site navPdf.pathAz =', savedNp && savedNp.pathAz);

  const pubAz = await fetch(`${BASE}/api/site?lang=az`).then((r) => r.json());
  const azNp = pubAz.site && pubAz.site.navPdf;
  if (!azNp || !azNp.url) {
    console.error('FAIL public az site.navPdf', azNp, '(bütün cavab:', Object.keys(pubAz).join(','), ')');
    process.exit(1);
  }
  console.log('OK GET /api/site?lang=az site.navPdf.url =', azNp.url);

  const pubRu = await fetch(`${BASE}/api/site?lang=ru`).then((r) => r.json());
  const ruNp = pubRu.site && pubRu.site.navPdf;
  if (ruNp !== null) {
    console.error('FAIL public ru site.navPdf should be null without pathRu, got:', ruNp);
    process.exit(1);
  }
  console.log('OK GET /api/site?lang=ru site.navPdf is null (no RU file)');

  console.log('\nAll Nav PDF admin API checks passed.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
