/**
 * Suvarmax — JSON məlumat + statik fayllar + admin API
 * Admin auth: JWT (12 saat) + httpOnly cookie
 * İşə salmaq: npm start
 *
 * İstehsal: JWT_SECRET mühit dəyişəni mütləq təyin edin.
 */
const express = require('express');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const DATA_PATH = path.join(ROOT, 'data', 'site-data.json');
const IMAGES_DIR = path.join(ROOT, 'assets', 'images');

const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'suvarmax-dev-jwt-deyisin';
const JWT_EXPIRES = '12h';
const JWT_MAX_AGE_MS = 12 * 60 * 60 * 1000;
const COOKIE_NAME = 'suvarmax_admin';

function readData() {
  const raw = fs.readFileSync(DATA_PATH, 'utf8');
  return JSON.parse(raw);
}

function writeData(data) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf8');
}

function nextWorkId(works) {
  if (!works.length) return 1;
  return Math.max(...works.map((w) => Number(w.id) || 0)) + 1;
}

/** Yalnız assets/images üçün; path traversal yox */
function resolveSafeImageFile(relPath) {
  if (typeof relPath !== 'string' || !relPath.trim()) return null;
  const normalized = relPath.replace(/\\/g, '/').trim();
  if (normalized.includes('..')) return null;
  const lower = normalized.toLowerCase();
  if (!lower.startsWith('assets/images/')) return null;
  const abs = path.join(ROOT, ...normalized.split('/'));
  const resolved = path.resolve(abs);
  const imagesRoot = path.resolve(IMAGES_DIR);
  if (resolved !== imagesRoot && !resolved.startsWith(imagesRoot + path.sep)) {
    return null;
  }
  return resolved;
}

function deleteImageFileIfExists(absPath) {
  if (!absPath) return;
  try {
    if (fs.existsSync(absPath) && fs.statSync(absPath).isFile()) {
      fs.unlinkSync(absPath);
    }
  } catch (e) {
    console.warn('Şəkil faylı silinmədi:', absPath, e.message);
  }
}

function countWorksUsingImagePath(data, pathStr) {
  let n = 0;
  for (const w of data.works || []) {
    if ((w.images || []).includes(pathStr)) n += 1;
  }
  return n;
}

/** Multer yükləməsi kimi görünən fayllar (rəqəm-hyphen ilə başlayır) — logo.svg və s. silinmir */
function isLikelyUploadedWorkImage(relPath) {
  const base = path.basename(String(relPath || ''));
  return /^\d+-/.test(base);
}

function tryDeleteOrphanWorkImage(data, relPath) {
  if (!isLikelyUploadedWorkImage(relPath)) return;
  if (countWorksUsingImagePath(data, relPath) > 0) return;
  deleteImageFileIfExists(resolveSafeImageFile(relPath));
}

/** Footer sosial ikonları üçün admin yükləməsində defolt SVG rəngi */
const SOCIAL_ICON_DEFAULT_FILL = '#e5e7eb';

/** Sosial sətri silinəndə diskdən silinməyən standart ikonlar */
const PROTECTED_SOCIAL_ICON_PATHS = new Set(
  [
    'assets/images/social/facebook.svg',
    'assets/images/social/instagram.svg',
    'assets/images/social/linkedin.svg',
  ].map((p) => p.replace(/\\/g, '/').toLowerCase())
);

/** Yüklənmiş SVG-ni footer üçün defolt rəngə (#e5e7eb) gətirir (PNG toxunulmur) */
function normalizeUploadedSocialSvg(absPath) {
  if (!absPath || !fs.existsSync(absPath)) return;
  if (path.extname(absPath).toLowerCase() !== '.svg') return;
  let s;
  try {
    s = fs.readFileSync(absPath, 'utf8');
  } catch (e) {
    console.warn('SVG oxunmadı:', absPath, e.message);
    return;
  }
  if (!/<svg[\s>]/i.test(s)) return;

  const F = SOCIAL_ICON_DEFAULT_FILL;
  const skipCssVal = (v) => {
    const t = String(v).trim().toLowerCase();
    return t === 'none' || t === 'transparent' || t.startsWith('url(');
  };

  /** <style> içindəki fill/stroke */
  s = s.replace(/<style(\b[^>]*)>([\s\S]*?)<\/style>/gi, (full, attrs, inner) => {
    let c = inner.replace(/fill\s*:\s*([^};]+)/gi, (m, val) =>
      skipCssVal(val) ? m : `fill: ${F}`
    );
    c = c.replace(/stroke\s*:\s*([^};]+)/gi, (m, val) =>
      skipCssVal(val) ? m : `stroke: ${F}`
    );
    return `<style${attrs}>${c}</style>`;
  });

  /** atribut: fill="..." və ya fill='...' */
  s = s.replace(/\bfill\s*=\s*["']([^"']*)["']/gi, (m, val) =>
    skipCssVal(val) ? m : `fill="${F}"`
  );
  /** atribut: dırnaqsız fill=#000 */
  s = s.replace(/\bfill\s*=\s*([^\s>"']+)/gi, (m, val) =>
    skipCssVal(val) ? m : `fill="${F}"`
  );

  s = s.replace(/\bstroke\s*=\s*["']([^"']*)["']/gi, (m, val) =>
    skipCssVal(val) ? m : `stroke="${F}"`
  );
  s = s.replace(/\bstroke\s*=\s*([^\s>"']+)/gi, (m, val) =>
    skipCssVal(val) ? m : `stroke="${F}"`
  );

  /** inline style="...:...;..." */
  s = s.replace(/fill:\s*([^;}"']+)/gi, (m, val) => {
    const t = String(val).trim().toLowerCase();
    if (t.startsWith('url(')) return m;
    if (skipCssVal(val)) return m;
    return `fill: ${F}`;
  });
  s = s.replace(/stroke:\s*([^;}"']+)/gi, (m, val) => {
    const t = String(val).trim().toLowerCase();
    if (t.startsWith('url(')) return m;
    if (skipCssVal(val)) return m;
    return `stroke: ${F}`;
  });

  /** Kökdə fill yoxdursa — miras rəng (qara) əvəzinə defolt */
  s = s.replace(/<svg(\s[^>]*)>/i, (full, attrs) => {
    if (/\bfill\s*=/i.test(attrs)) return full;
    return `<svg${attrs} fill="${F}">`;
  });

  try {
    fs.writeFileSync(absPath, s, 'utf8');
  } catch (e) {
    console.warn('SVG yazılmadı:', absPath, e.message);
  }
}

/** Sosial siyahıdan çıxan yerli ikon faylını silir (standart 3 faylı qoruyur) */
function tryDeleteOrphanSocialIcon(relPath) {
  if (!relPath || /^https?:\/\//i.test(String(relPath))) return;
  const norm = String(relPath).replace(/\\/g, '/').replace(/^\//, '').trim();
  const lower = norm.toLowerCase();
  if (!lower.startsWith('assets/images/social/')) return;
  if (PROTECTED_SOCIAL_ICON_PATHS.has(lower)) return;
  deleteImageFileIfExists(resolveSafeImageFile(norm));
}

const DEFAULT_SITE = {
  partnersTitle: 'Partnyorlarımız',
  partnersSubtitle: 'Bizimlə əməkdaşlıq edən etibarlı partnyorlarımız',
  partners: [
    { id: 1, name: 'LandPro', url: 'https://landpro.az' },
    { id: 2, name: 'ParkLand', url: 'https://parkland.az' },
    { id: 3, name: 'Green Garden', url: 'https://greengarden.az' },
  ],
  contact: {
    phoneTel: '+994556485658',
    phoneLabel: '+994 55 648 56 58',
    email: 'info@suvarmax.az',
    address: 'Bakı, Azərbaycan',
  },
  social: [
    { id: 1, name: 'Facebook', url: 'https://www.facebook.com/', icon: 'assets/images/social/facebook.svg' },
    {
      id: 2,
      name: 'Instagram',
      url: 'https://www.instagram.com/suvarmax',
      icon: 'assets/images/social/instagram.svg',
    },
    { id: 3, name: 'LinkedIn', url: 'https://www.linkedin.com/', icon: 'assets/images/social/linkedin.svg' },
  ],
  /** Admin paneldə doldurulur; ictimai /api/site-də göndərilmir */
  telegramBotToken: '',
  telegramChatId: '',
};

function sanitizePartnersList(arr) {
  if (!Array.isArray(arr)) return [];
  return arr
    .map((p, i) => ({
      id: Number(p.id) > 0 ? Number(p.id) : i + 1,
      name: String(p.name || '').trim().slice(0, 120),
      url: String(p.url || '').trim().slice(0, 500) || '#',
    }))
    .filter((p) => p.name);
}

function sanitizeSocialList(arr) {
  if (!Array.isArray(arr)) return [];
  return arr
    .map((p, i) => ({
      id: Number(p.id) > 0 ? Number(p.id) : i + 1,
      name: String(p.name || '').trim().slice(0, 80),
      url: String(p.url || '').trim().slice(0, 500) || '#',
      icon: String(p.icon || '').trim().slice(0, 800),
    }))
    .filter((p) => p.name && p.icon);
}

function getSite(data) {
  const s = data && data.site;
  if (!s || typeof s !== 'object') {
    return JSON.parse(JSON.stringify(DEFAULT_SITE));
  }
  const partners = Array.isArray(s.partners) ? sanitizePartnersList(s.partners) : null;
  const social = Array.isArray(s.social) ? sanitizeSocialList(s.social) : null;
  const contact = { ...DEFAULT_SITE.contact, ...(s.contact && typeof s.contact === 'object' ? s.contact : {}) };
  return {
    partnersTitle: String(s.partnersTitle || DEFAULT_SITE.partnersTitle).slice(0, 200),
    partnersSubtitle: String(s.partnersSubtitle || DEFAULT_SITE.partnersSubtitle).slice(0, 500),
    partners: partners && partners.length ? partners : JSON.parse(JSON.stringify(DEFAULT_SITE.partners)),
    contact: {
      phoneTel: String(contact.phoneTel || '').slice(0, 40),
      phoneLabel: String(contact.phoneLabel || '').slice(0, 80),
      email: String(contact.email || '').slice(0, 120),
      address: String(contact.address || '').slice(0, 300),
    },
    social: social && social.length ? social : JSON.parse(JSON.stringify(DEFAULT_SITE.social)),
  };
}

function buildSiteFromPayload(s, previousSite = {}) {
  if (!s || typeof s !== 'object') return null;
  const partners = sanitizePartnersList(s.partners || []);
  const social = sanitizeSocialList(s.social || []);
  const c = s.contact || {};
  const prev = previousSite && typeof previousSite === 'object' ? previousSite : {};
  const tokenIn = s.telegramBotToken !== undefined ? s.telegramBotToken : prev.telegramBotToken;
  const chatIn = s.telegramChatId !== undefined ? s.telegramChatId : prev.telegramChatId;
  return {
    partnersTitle: String(s.partnersTitle || DEFAULT_SITE.partnersTitle).slice(0, 200),
    partnersSubtitle: String(s.partnersSubtitle || DEFAULT_SITE.partnersSubtitle).slice(0, 500),
    partners,
    contact: {
      phoneTel: String(c.phoneTel || DEFAULT_SITE.contact.phoneTel).slice(0, 40),
      phoneLabel: String(c.phoneLabel || DEFAULT_SITE.contact.phoneLabel).slice(0, 80),
      email: String(c.email || DEFAULT_SITE.contact.email).slice(0, 120),
      address: String(c.address || DEFAULT_SITE.contact.address).slice(0, 300),
    },
    social,
    telegramBotToken: String(tokenIn || '').trim().slice(0, 220),
    telegramChatId: String(chatIn || '').trim().slice(0, 50),
  };
}

function allLocalSiteMediaPaths(site) {
  const set = new Set();
  (site.social || []).forEach((x) => {
    if (x.icon && !/^https?:\/\//i.test(x.icon)) set.add(x.icon);
  });
  return set;
}

function deleteRemovedSiteMedia(oldSite, newSite) {
  const oldP = allLocalSiteMediaPaths(oldSite);
  const newP = allLocalSiteMediaPaths(newSite);
  oldP.forEach((p) => {
    if (!newP.has(p)) tryDeleteOrphanSocialIcon(p);
  });
}

function parseAdminFromRequest(req) {
  let token = req.cookies && req.cookies[COOKIE_NAME];
  if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.slice(7).trim();
  }
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (typeof payload.sub === 'string' && payload.sub.length > 0) {
      return payload.sub;
    }
    return null;
  } catch {
    return null;
  }
}

function requireAdmin(req, res, next) {
  const username = parseAdminFromRequest(req);
  if (!username) {
    return res.status(401).json({ ok: false, error: 'Giriş tələb olunur və ya sessiya bitib' });
  }
  req.adminUsername = username;
  next();
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(IMAGES_DIR)) {
      fs.mkdirSync(IMAGES_DIR, { recursive: true });
    }
    cb(null, IMAGES_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9-_]/g, '_') || 'image';
    cb(null, `${Date.now()}-${base}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 12 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /^image\//.test(file.mimetype);
    if (ok) cb(null, true);
    else cb(new Error('Yalnız şəkil faylları qəbul olunur'));
  },
});

function makeSubdirMulter(subDir) {
  const st = multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = path.join(IMAGES_DIR, subDir);
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname) || '.png';
      const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9-_]/g, '_') || 'file';
      cb(null, `${Date.now()}-${base}${ext}`);
    },
  });
  return multer({
    storage: st,
    limits: { fileSize: 8 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      const ok = /^image\//.test(file.mimetype);
      if (ok) cb(null, true);
      else cb(new Error('Yalnız şəkil faylı'));
    },
  });
}

const uploadSocial = makeSubdirMulter('social');

const app = express();

app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());

/** İctimai: partnyor, əlaqə, sosial (Telegram token/chat ID daxil deyil) */
app.get('/api/site', (req, res) => {
  try {
    const data = readData();
    res.json({ site: getSite(data) });
  } catch (e) {
    res.status(500).json({ ok: false, error: 'Oxunmadı' });
  }
});

function getSiteForAdmin(data) {
  const base = getSite(data);
  const raw = (data && data.site) || {};
  return {
    ...base,
    telegramBotToken: String(raw.telegramBotToken || ''),
    telegramChatId: String(raw.telegramChatId || ''),
  };
}

/** Telegram Bot API cavabından qısa xəta mətni (diaqnostika üçün) */
function telegramErrorHint(tgJson) {
  if (!tgJson || tgJson.ok) return '';
  const d = String(tgJson.description || '').trim();
  return d ? d.slice(0, 280) : '';
}

async function telegramSendMessage(token, chatId, text) {
  const tgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
    }),
  });
  const tgJson = await tgRes.json().catch(() => ({}));
  return { tgRes, tgJson };
}

/** İctimai əlaqə formu → Telegram (token yalnız serverdə) */
app.post('/api/contact', async (req, res) => {
  try {
    const body = req.body || {};
    const name = String(body.name || '').trim();
    const phone = String(body.phone || '').trim();
    const email = String(body.email || '').trim();
    const message = String(body.message || '').trim();
    if (!name) {
      return res.status(400).json({ ok: false, error: 'Ad Soyad mütləqdir' });
    }
    if (!phone) {
      return res.status(400).json({ ok: false, error: 'Telefon mütləqdir' });
    }
    const data = readData();
    const raw = data.site || {};
    const token = String(raw.telegramBotToken || '').trim();
    const chatId = String(raw.telegramChatId || '').trim();
    if (!token || !chatId) {
      return res.status(503).json({
        ok: false,
        error: 'Mesaj qəbulu hazır deyil. Admin paneldə Telegram bot parametrlərini doldurun.',
      });
    }
    const text =
      `Yeni Sorğu - Suvarmax\n\n` +
      `Ad Soyad: ${name}\n` +
      `Email: ${email || '—'}\n` +
      `Telefon: ${phone}\n\n` +
      `Mesaj:\n${message || '—'}\n\n` +
      `Tarix: ${new Date().toLocaleString('az-AZ')}`;
    const { tgJson } = await telegramSendMessage(token, chatId, text);
    if (!tgJson.ok) {
      console.warn('Telegram sendMessage (contact):', tgJson);
      const hint = telegramErrorHint(tgJson);
      return res.status(502).json({
        ok: false,
        error: hint
          ? `Telegram: ${hint}`
          : 'Mesaj göndərilmədi. Bot token və Chat ID-ni yoxlayın; qrup üçün bota /start yazın və botu qrupa əlavə edin.',
      });
    }
    res.json({ ok: true });
  } catch (e) {
    console.error('api/contact', e);
    res.status(500).json({
      ok: false,
      error:
        e && e.code === 'ENOTFOUND'
          ? 'Server internetə çıxa bilmir (DNS). Proxy/firewall yoxlayın.'
          : 'Server xətası',
    });
  }
});

/**
 * Admin: saxlanmış və ya gövdədə göndərilən token/chat ilə test mesajı
 * Body (istəyə bağlı): { telegramBotToken?, telegramChatId? } — boşdursa JSON faylından oxunur
 */
app.post('/api/admin/telegram-test', requireAdmin, async (req, res) => {
  try {
    const body = req.body || {};
    const data = readData();
    const raw = data.site || {};
    let token = String(body.telegramBotToken != null ? body.telegramBotToken : raw.telegramBotToken || '').trim();
    let chatId = String(body.telegramChatId != null ? body.telegramChatId : raw.telegramChatId || '').trim();
    token = token.slice(0, 220);
    chatId = chatId.slice(0, 50);
    if (!token || !chatId) {
      return res.status(400).json({
        ok: false,
        error: 'Token və Chat ID daxil edin və ya əvvəlcə Saxla ilə yazın.',
      });
    }
    const text =
      `Suvarmax — test mesajı (admin panel)\n` +
      `İstifadəçi: ${req.adminUsername}\n` +
      `Vaxt: ${new Date().toLocaleString('az-AZ')}`;
    const { tgJson } = await telegramSendMessage(token, chatId, text);
    if (!tgJson.ok) {
      console.warn('Telegram sendMessage (test):', tgJson);
      const hint = telegramErrorHint(tgJson);
      return res.status(502).json({
        ok: false,
        error: hint || 'Telegram API xətası',
      });
    }
    res.json({ ok: true });
  } catch (e) {
    console.error('api/admin/telegram-test', e);
    res.status(500).json({ ok: false, error: e.message || 'Server xətası' });
  }
});

/** İctimai: işlər (səhifələmə: ?page=1&limit=9) */
app.get('/api/works', (req, res) => {
  try {
    const data = readData();
    const all = data.works || [];
    const total = all.length;
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit), 10) || 9));
    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
    let page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
    if (totalPages > 0 && page > totalPages) {
      page = totalPages;
    }
    const start = (page - 1) * limit;
    const works = all.slice(start, start + limit);
    res.json({
      works,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: 'Məlumat oxunmadı' });
  }
});

app.get('/api/works/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    const data = readData();
    const work = (data.works || []).find((w) => Number(w.id) === id);
    if (!work) return res.status(404).json({ ok: false, error: 'Tapılmadı' });
    res.json({ work });
  } catch (e) {
    res.status(500).json({ ok: false, error: 'Xəta' });
  }
});

app.post('/api/login', (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ ok: false, error: 'İstifadəçi adı və şifrə daxil edin' });
    }
    const data = readData();
    const admins = data.admins || [];
    const match = admins.find((a) => a.username === username && a.password === password);
    if (!match) {
      return res.status(401).json({ ok: false, error: 'Yanlış məlumat' });
    }

    const token = jwt.sign(
      { sub: String(username).trim(), typ: 'admin' },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );

    const secureCookie = process.env.NODE_ENV === 'production' || process.env.COOKIE_SECURE === '1';
    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: secureCookie,
      sameSite: 'lax',
      maxAge: JWT_MAX_AGE_MS,
      path: '/',
    });

    res.json({
      ok: true,
      expiresInSeconds: Math.floor(JWT_MAX_AGE_MS / 1000),
      expiresInHours: 12,
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: 'Giriş xətası' });
  }
});

app.post('/api/logout', (req, res) => {
  const secureCookie = process.env.NODE_ENV === 'production' || process.env.COOKIE_SECURE === '1';
  res.clearCookie(COOKIE_NAME, {
    path: '/',
    httpOnly: true,
    secure: secureCookie,
    sameSite: 'lax',
  });
  res.json({ ok: true });
});

app.get('/api/admin/me', (req, res) => {
  const username = parseAdminFromRequest(req);
  if (!username) {
    return res.json({ ok: false, loggedIn: false });
  }
  res.json({ ok: true, loggedIn: true, username });
});

/** Admin: tam JSON (işlər + adminlər) */
app.get('/api/admin/data', requireAdmin, (req, res) => {
  try {
    const data = readData();
    res.json({
      works: data.works || [],
      admins: data.admins || [],
      site: getSiteForAdmin(data),
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: 'Oxuna bilmədi' });
  }
});

app.put('/api/admin/site', requireAdmin, (req, res) => {
  try {
    const incoming = req.body && req.body.site;
    const data = readData();
    const previousRaw = data.site && typeof data.site === 'object' ? data.site : {};
    const newSite = buildSiteFromPayload(incoming, previousRaw);
    if (!newSite) {
      return res.status(400).json({ ok: false, error: 'site obyekti tələb olunur' });
    }
    const oldSite = getSite(data);
    data.site = newSite;
    deleteRemovedSiteMedia(oldSite, newSite);
    writeData(data);
    res.json({ ok: true, site: newSite });
  } catch (e) {
    res.status(500).json({ ok: false, error: 'Saxlanılmadı' });
  }
});

app.post('/api/admin/upload/social', requireAdmin, uploadSocial.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ ok: false, error: 'Fayl seçin' });
    }
    if (req.file.path) {
      normalizeUploadedSocialSvg(req.file.path);
    }
    res.json({ ok: true, path: `assets/images/social/${req.file.filename}` });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || 'Yükləmə xətası' });
  }
});

app.post('/api/admin/upload', requireAdmin, upload.array('files', 20), (req, res) => {
  try {
    const paths = (req.files || []).map((f) => `assets/images/${f.filename}`);
    res.json({ ok: true, paths });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || 'Yükləmə xətası' });
  }
});

app.post('/api/admin/works', requireAdmin, (req, res) => {
  try {
    const { title, description, images } = req.body || {};
    if (!title || !String(title).trim()) {
      return res.status(400).json({ ok: false, error: 'Başlıq tələb olunur' });
    }
    const imgs = Array.isArray(images) ? images.filter(Boolean) : [];
    if (!imgs.length) {
      return res.status(400).json({ ok: false, error: 'Ən azı bir şəkil yolu tələb olunur' });
    }
    const data = readData();
    data.works = data.works || [];
    const id = nextWorkId(data.works);
    data.works.push({
      id,
      title: String(title).trim(),
      description: String(description || '').trim(),
      images: imgs,
    });
    writeData(data);
    res.json({ ok: true, work: data.works[data.works.length - 1] });
  } catch (e) {
    res.status(500).json({ ok: false, error: 'Yaradılmadı' });
  }
});

app.put('/api/admin/works/:id', requireAdmin, (req, res) => {
  try {
    const id = Number(req.params.id);
    const { title, description, images } = req.body || {};
    const data = readData();
    data.works = data.works || [];
    const idx = data.works.findIndex((w) => Number(w.id) === id);
    if (idx === -1) return res.status(404).json({ ok: false, error: 'Tapılmadı' });
    if (title != null) data.works[idx].title = String(title).trim();
    if (description != null) data.works[idx].description = String(description).trim();
    let removedPaths = [];
    if (images != null) {
      const imgs = Array.isArray(images) ? images.filter(Boolean) : [];
      if (!imgs.length) {
        return res.status(400).json({ ok: false, error: 'Ən azı bir şəkil qalmalıdır' });
      }
      const oldImages = data.works[idx].images || [];
      removedPaths = oldImages.filter((p) => !imgs.includes(p));
      data.works[idx].images = imgs;
    }
    writeData(data);
    for (const p of removedPaths) {
      tryDeleteOrphanWorkImage(data, p);
    }
    res.json({ ok: true, work: data.works[idx] });
  } catch (e) {
    res.status(500).json({ ok: false, error: 'Yenilənmədi' });
  }
});

app.delete('/api/admin/works/:id', requireAdmin, (req, res) => {
  try {
    const id = Number(req.params.id);
    const data = readData();
    data.works = data.works || [];
    const work = data.works.find((w) => Number(w.id) === id);
    if (!work) {
      return res.status(404).json({ ok: false, error: 'Tapılmadı' });
    }
    const imagePaths = [...(work.images || [])];
    data.works = data.works.filter((w) => Number(w.id) !== id);
    writeData(data);
    for (const p of imagePaths) {
      tryDeleteOrphanWorkImage(data, p);
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: 'Silinmədi' });
  }
});

app.post('/api/admin/admins', requireAdmin, (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password || !String(username).trim()) {
      return res.status(400).json({ ok: false, error: 'İstifadəçi adı və şifrə tələb olunur' });
    }
    const data = readData();
    data.admins = data.admins || [];
    if (data.admins.some((a) => a.username === username)) {
      return res.status(400).json({ ok: false, error: 'Bu istifadəçi adı artıq var' });
    }
    data.admins.push({ username: String(username).trim(), password: String(password) });
    writeData(data);
    res.json({ ok: true, admins: data.admins });
  } catch (e) {
    res.status(500).json({ ok: false, error: 'Əlavə olunmadı' });
  }
});

app.put('/api/admin/admins/:username', requireAdmin, (req, res) => {
  try {
    const username = decodeURIComponent(req.params.username);
    const { password } = req.body || {};
    if (!password || !String(password).trim()) {
      return res.status(400).json({ ok: false, error: 'Yeni şifrə daxil edin' });
    }
    const data = readData();
    data.admins = data.admins || [];
    const admin = data.admins.find((a) => a.username === username);
    if (!admin) {
      return res.status(404).json({ ok: false, error: 'İstifadəçi tapılmadı' });
    }
    admin.password = String(password);
    writeData(data);
    res.json({ ok: true, admins: data.admins });
  } catch (e) {
    res.status(500).json({ ok: false, error: 'Şifrə yenilənmədi' });
  }
});

app.delete('/api/admin/admins/:username', requireAdmin, (req, res) => {
  try {
    const username = decodeURIComponent(req.params.username);
    const data = readData();
    data.admins = data.admins || [];
    if (data.admins.length <= 1) {
      return res.status(400).json({ ok: false, error: 'Son admin silinə bilməz' });
    }
    if (username === req.adminUsername) {
      return res.status(400).json({ ok: false, error: 'Öz hesabınızı bu əməliyyatla silməyin; əvvəlcə çıxın' });
    }
    const len = data.admins.length;
    data.admins = data.admins.filter((a) => a.username !== username);
    if (data.admins.length === len) {
      return res.status(404).json({ ok: false, error: 'Tapılmadı' });
    }
    writeData(data);
    res.json({ ok: true, admins: data.admins });
  } catch (e) {
    res.status(500).json({ ok: false, error: 'Silinmədi' });
  }
});

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ ok: false, error: err.message });
  }
  if (err) {
    return res.status(400).json({ ok: false, error: err.message || 'Xəta' });
  }
  next();
});

app.use(express.static(ROOT));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Suvarmax server: http://localhost:${PORT}`);
});
