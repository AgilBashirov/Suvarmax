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
const DEFAULT_PAGES_HOME_PATH = path.join(ROOT, 'data', 'default-pages-home.json');
const STATIC_HOME_BY_LOCALE_PATH = path.join(ROOT, 'data', 'static-home-by-locale.json');

const LOCALES = ['az', 'ru', 'en'];
const DEFAULT_LOCALE = 'az';

let DEFAULT_PAGES_HOME = {};
try {
  DEFAULT_PAGES_HOME = JSON.parse(fs.readFileSync(DEFAULT_PAGES_HOME_PATH, 'utf8'));
} catch (e) {
  console.warn('default-pages-home.json oxunmadı:', e.message);
}

/** Admin-də redaktə olunmur: meta, nav, hero, düymələr, footer, işlər səhifəsi və s. — yalnız services/about DB-də */
let STATIC_HOME_BY_LOCALE = {};
try {
  STATIC_HOME_BY_LOCALE = JSON.parse(fs.readFileSync(STATIC_HOME_BY_LOCALE_PATH, 'utf8'));
} catch (e) {
  console.warn('static-home-by-locale.json oxunmadı:', e.message);
}

const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'suvarmax-dev-jwt-deyisin';
const JWT_EXPIRES = '12h';
const JWT_MAX_AGE_MS = 12 * 60 * 60 * 1000;
const COOKIE_NAME = 'suvarmax_admin';

function readData() {
  const raw = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  const { data, changed } = upgradeDatabaseIfNeeded(raw);
  if (changed) {
    writeData(data);
  }
  return data;
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
  partnersSubtitle: 'Bizimlə əməkdaşlıq edən etibarlı brendlər və təchizatçılar',
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
};

function upgradeDatabaseIfNeeded(data) {
  let changed = false;
  const d = data;
  if (!Array.isArray(d.works)) d.works = [];
  d.works = d.works.map((w) => {
    if (!w || typeof w !== 'object') return w;
    const w2 = { ...w };
    const hasLegacy = w2.title != null || w2.description != null;
    if (hasLegacy) {
      w2.i18n = w2.i18n && typeof w2.i18n === 'object' ? { ...w2.i18n } : {};
      if (!w2.i18n[DEFAULT_LOCALE]) {
        w2.i18n[DEFAULT_LOCALE] = {
          title: String(w2.title != null ? w2.title : '').trim(),
          description: String(w2.description != null ? w2.description : '').trim(),
        };
      }
      delete w2.title;
      delete w2.description;
      changed = true;
    }
    return w2;
  });

  const site = d.site;
  if (site && typeof site === 'object' && (!site.locales || typeof site.locales !== 'object')) {
    const legacy = { ...site };
    d.site = {
      telegramBotToken: String(legacy.telegramBotToken || '').trim().slice(0, 220),
      telegramChatId: String(legacy.telegramChatId || '').trim().slice(0, 50),
      locales: {
        az: {
          partnersTitle: legacy.partnersTitle,
          partnersSubtitle: legacy.partnersSubtitle,
          partners: legacy.partners,
          contact: legacy.contact,
          social: legacy.social,
          pages: legacy.pages && typeof legacy.pages === 'object' ? legacy.pages : { home: {} },
        },
        ru: { pages: { home: {} } },
        en: { pages: { home: {} } },
      },
    };
    changed = true;
  }
  return { data: d, changed };
}

function normalizeLocaleParam(s) {
  const x = String(s || '')
    .toLowerCase()
    .trim()
    .slice(0, 5);
  return LOCALES.includes(x) ? x : null;
}

function parseLangFromReq(req) {
  const q = normalizeLocaleParam(req.query && req.query.lang);
  if (q) return q;
  const hdr = req.headers && req.headers['accept-language'];
  if (hdr) {
    const first = String(hdr)
      .split(',')[0]
      .split('-')[0]
      .toLowerCase()
      .trim();
    if (LOCALES.includes(first)) return first;
  }
  return DEFAULT_LOCALE;
}

function mergeHomeLayer(left, right) {
  if (!right || typeof right !== 'object') return left;
  if (Array.isArray(right)) {
    if (!right.length) return left;
    if (!Array.isArray(left)) return right;
    return right.map((r, i) => {
      if (r && typeof r === 'object' && !Array.isArray(r) && left[i] && typeof left[i] === 'object') {
        return mergeHomeLayer(left[i], r);
      }
      const rs = r != null ? String(r).trim() : '';
      return rs !== '' ? r : left[i];
    });
  }
  const out = { ...left };
  for (const k of Object.keys(right)) {
    const rv = right[k];
    const lv = left[k];
    if (rv && typeof rv === 'object' && !Array.isArray(rv)) {
      out[k] = mergeHomeLayer(lv && typeof lv === 'object' ? lv : {}, rv);
    } else {
      const rs = rv != null ? String(rv).trim() : '';
      if (rs !== '') out[k] = rv;
      else if (lv !== undefined) out[k] = lv;
    }
  }
  return out;
}

function mergeHomeServicesAboutForPublic(norm, lang) {
  const defRoot = DEFAULT_PAGES_HOME && typeof DEFAULT_PAGES_HOME === 'object' ? DEFAULT_PAGES_HOME : {};
  const azH = (norm.locales.az.pages && norm.locales.az.pages.home) || {};
  const locSlice = norm.locales[lang] || norm.locales[DEFAULT_LOCALE];
  const locH = (locSlice.pages && locSlice.pages.home) || {};
  const defS = defRoot.services && typeof defRoot.services === 'object' ? defRoot.services : {};
  const defA = defRoot.about && typeof defRoot.about === 'object' ? defRoot.about : {};
  const azS = azH.services && typeof azH.services === 'object' ? azH.services : {};
  const azA = azH.about && typeof azH.about === 'object' ? azH.about : {};
  const locS = locH.services && typeof locH.services === 'object' ? locH.services : {};
  const locA = locH.about && typeof locH.about === 'object' ? locH.about : {};
  return {
    services: mergeHomeLayer(mergeHomeLayer(defS, azS), locS),
    about: mergeHomeLayer(mergeHomeLayer(defA, azA), locA),
  };
}

function mergeHomeForPublic(norm, lang) {
  const L = LOCALES.includes(lang) ? lang : DEFAULT_LOCALE;
  const byLoc = STATIC_HOME_BY_LOCALE && typeof STATIC_HOME_BY_LOCALE === 'object' ? STATIC_HOME_BY_LOCALE : {};
  const shellSrc = byLoc[L] || byLoc[DEFAULT_LOCALE] || {};
  const shell = JSON.parse(JSON.stringify(shellSrc));
  const sa = mergeHomeServicesAboutForPublic(norm, L);
  return { ...shell, ...sa };
}

function pickStr(tr, az, defVal, maxLen) {
  const t = String(tr || '').trim();
  if (t) return t.slice(0, maxLen);
  const a = String(az || '').trim();
  if (a) return a.slice(0, maxLen);
  return String(defVal || '').slice(0, maxLen);
}

/** Partnyor bölmə başlığı/alt başlığı — data/static-home-by-locale.json */
function staticPartnersHeadings(lang) {
  const L = LOCALES.includes(lang) ? lang : DEFAULT_LOCALE;
  const byLoc = STATIC_HOME_BY_LOCALE && typeof STATIC_HOME_BY_LOCALE === 'object' ? STATIC_HOME_BY_LOCALE : {};
  const shell = byLoc[L] || byLoc[DEFAULT_LOCALE] || {};
  const ps = shell.partnersSection && typeof shell.partnersSection === 'object' ? shell.partnersSection : {};
  const title = String(ps.title != null ? ps.title : '').trim().slice(0, 200);
  const subtitle = String(ps.subtitle != null ? ps.subtitle : '').trim().slice(0, 500);
  return {
    partnersTitle: title || DEFAULT_SITE.partnersTitle,
    partnersSubtitle: subtitle || DEFAULT_SITE.partnersSubtitle,
  };
}

function resolvePublicLocaleSlice(norm, lang) {
  const az = norm.locales.az || {};
  const tr = norm.locales[lang] || az;
  const defP = JSON.parse(JSON.stringify(DEFAULT_SITE.partners));
  const defS = JSON.parse(JSON.stringify(DEFAULT_SITE.social));
  /** Partnyor siyahısı dillərə görə ayrılmır — yalnız AZ dilindəki slice */
  const partners = az.partners && az.partners.length ? az.partners : defP;
  /** Sosial footer siyahısı dillərə görə ayrılmır — yalnız AZ dilindəki slice */
  const social = az.social && az.social.length ? az.social : defS;
  const cTr = tr.contact || {};
  const cAz = az.contact || {};
  const cDef = DEFAULT_SITE.contact;
  const ph = staticPartnersHeadings(lang);
  return {
    partnersTitle: ph.partnersTitle,
    partnersSubtitle: ph.partnersSubtitle,
    partners,
    contact: {
      phoneTel: pickStr(cTr.phoneTel, cAz.phoneTel, cDef.phoneTel, 40),
      phoneLabel: pickStr(cTr.phoneLabel, cAz.phoneLabel, cDef.phoneLabel, 80),
      email: pickStr(cTr.email, cAz.email, cDef.email, 120),
      address: pickStr(cTr.address, cAz.address, cDef.address, 300),
    },
    social,
    pages: { home: mergeHomeForPublic(norm, lang) },
  };
}

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

/** Yalnız admin-dən idarə olunan bölmələr saxlanılır; qalanı data/static-home-by-locale.json-dadır */
function pickEditableHomeFromSlice(home) {
  if (!home || typeof home !== 'object') return {};
  const out = {};
  if (home.services && typeof home.services === 'object') out.services = home.services;
  if (home.about && typeof home.about === 'object') out.about = home.about;
  return out;
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

function sanitizeLocaleSlice(slice) {
  const s = slice && typeof slice === 'object' ? slice : {};
  const partners = sanitizePartnersList(s.partners || []);
  const social = sanitizeSocialList(s.social || []);
  const contact = { ...DEFAULT_SITE.contact, ...(s.contact && typeof s.contact === 'object' ? s.contact : {}) };
  const pages = s.pages && typeof s.pages === 'object' ? s.pages : {};
  const homeRaw = pages.home && typeof pages.home === 'object' ? pages.home : {};
  const home = pickEditableHomeFromSlice(homeRaw);
  return {
    /** Başlıqlar statik fayldadır; bazada saxlanmır */
    partnersTitle: '',
    partnersSubtitle: '',
    partners,
    contact: {
      phoneTel: String(contact.phoneTel || '').slice(0, 40),
      phoneLabel: String(contact.phoneLabel || '').slice(0, 80),
      email: String(contact.email || '').slice(0, 120),
      address: String(contact.address || '').slice(0, 300),
    },
    social,
    pages: { home },
  };
}

function normalizeSiteStorage(raw) {
  if (!raw || typeof raw !== 'object') {
    return {
      telegramBotToken: '',
      telegramChatId: '',
      locales: Object.fromEntries(LOCALES.map((loc) => [loc, sanitizeLocaleSlice({})])),
    };
  }
  const telegramBotToken = String(raw.telegramBotToken || '').trim().slice(0, 220);
  const telegramChatId = String(raw.telegramChatId || '').trim().slice(0, 50);
  const locRaw = raw.locales && typeof raw.locales === 'object' ? raw.locales : null;
  const locales = {};
  if (!locRaw) {
    const legacy = { ...raw };
    const azSlice = {
      partnersTitle: legacy.partnersTitle,
      partnersSubtitle: legacy.partnersSubtitle,
      partners: legacy.partners,
      contact: legacy.contact,
      social: legacy.social,
      pages: legacy.pages && typeof legacy.pages === 'object' ? legacy.pages : { home: {} },
    };
    for (const loc of LOCALES) {
      locales[loc] = sanitizeLocaleSlice(loc === DEFAULT_LOCALE ? azSlice : {});
    }
  } else {
    for (const loc of LOCALES) {
      locales[loc] = sanitizeLocaleSlice(locRaw[loc] || {});
    }
  }
  return { telegramBotToken, telegramChatId, locales };
}

function deepMergeLocaleSlices(base, over) {
  const a = base && typeof base === 'object' ? base : {};
  const b = over && typeof over === 'object' ? over : {};
  const out = { ...a, ...b };
  if (b.contact && typeof b.contact === 'object') {
    out.contact = { ...(a.contact || {}), ...b.contact };
  }
  if (b.pages && typeof b.pages === 'object') {
    const ah = a.pages && a.pages.home && typeof a.pages.home === 'object' ? a.pages.home : {};
    const bh = b.pages.home && typeof b.pages.home === 'object' ? b.pages.home : {};
    out.pages = { ...(a.pages || {}), ...b.pages, home: mergeHomeLayer(ah, bh) };
  } else if (a.pages) {
    out.pages = { ...a.pages };
  }
  if (b.partners !== undefined) out.partners = b.partners;
  if (b.social !== undefined) out.social = b.social;
  if (b.partnersTitle !== undefined) out.partnersTitle = b.partnersTitle;
  if (b.partnersSubtitle !== undefined) out.partnersSubtitle = b.partnersSubtitle;
  return out;
}

function extractLegacyFlatSiteSlice(s) {
  if (!s || typeof s !== 'object') return {};
  return {
    partnersTitle: s.partnersTitle,
    partnersSubtitle: s.partnersSubtitle,
    partners: s.partners,
    contact: s.contact,
    social: s.social,
    pages: s.pages,
  };
}

function buildSiteFromPayload(s, previousSite = {}) {
  if (!s || typeof s !== 'object') return null;
  const prev = normalizeSiteStorage(previousSite);
  const tokenIn = s.telegramBotToken !== undefined ? s.telegramBotToken : prev.telegramBotToken;
  const chatIn = s.telegramChatId !== undefined ? s.telegramChatId : prev.telegramChatId;
  const incomingLocales = s.locales && typeof s.locales === 'object' ? s.locales : null;
  const locales = {};
  for (const loc of LOCALES) {
    if (incomingLocales) {
      const merged = deepMergeLocaleSlices(prev.locales[loc], incomingLocales[loc] || {});
      locales[loc] = sanitizeLocaleSlice(merged);
    } else {
      if (loc === DEFAULT_LOCALE) {
        const legacySlice = extractLegacyFlatSiteSlice(s);
        locales[loc] = sanitizeLocaleSlice(deepMergeLocaleSlices(prev.locales[loc], legacySlice));
      } else {
        locales[loc] = prev.locales[loc];
      }
    }
  }
  return {
    telegramBotToken: String(tokenIn || '').trim().slice(0, 220),
    telegramChatId: String(chatIn || '').trim().slice(0, 50),
    locales,
  };
}

function allLocalSiteMediaPathsMultilingual(siteSt) {
  const set = new Set();
  const norm = normalizeSiteStorage(siteSt);
  for (const loc of LOCALES) {
    const sl = norm.locales[loc].social || [];
    sl.forEach((x) => {
      if (x.icon && !/^https?:\/\//i.test(x.icon)) set.add(x.icon);
    });
  }
  return set;
}

function deleteRemovedSiteMedia(oldRaw, newSiteObj) {
  const oldP = allLocalSiteMediaPathsMultilingual(oldRaw);
  const newP = allLocalSiteMediaPathsMultilingual(newSiteObj);
  oldP.forEach((p) => {
    if (!newP.has(p)) tryDeleteOrphanSocialIcon(p);
  });
}

function getPublicSiteForLang(data, lang) {
  const norm = normalizeSiteStorage((data && data.site) || {});
  const L = LOCALES.includes(lang) ? lang : DEFAULT_LOCALE;
  return resolvePublicLocaleSlice(norm, L);
}

function getSiteForAdmin(data) {
  return normalizeSiteStorage((data && data.site) || {});
}

function normalizeWorkStorage(w) {
  if (!w || typeof w !== 'object') return { id: 0, images: [], i18n: {} };
  const i18n = {};
  const raw = w.i18n && typeof w.i18n === 'object' ? w.i18n : {};
  for (const loc of LOCALES) {
    const b = raw[loc];
    if (b && typeof b === 'object') {
      const title = String(b.title || '').trim().slice(0, 500);
      const description = String(b.description || '').trim().slice(0, 20000);
      if (title || description) {
        i18n[loc] = { title, description };
      }
    }
  }
  if ((w.title != null || w.description != null) && !i18n[DEFAULT_LOCALE]) {
    i18n[DEFAULT_LOCALE] = {
      title: String(w.title != null ? w.title : '').trim().slice(0, 500),
      description: String(w.description != null ? w.description : '').trim().slice(0, 20000),
    };
  }
  return {
    id: Number(w.id) || 0,
    images: Array.isArray(w.images) ? w.images.filter(Boolean) : [],
    i18n,
  };
}

function workPublicView(w, lang) {
  const n = normalizeWorkStorage(w);
  const order = [lang, DEFAULT_LOCALE, ...LOCALES.filter((l) => l !== lang && l !== DEFAULT_LOCALE)];
  let title = '';
  let description = '';
  for (const loc of order) {
    const block = n.i18n[loc];
    if (block && String(block.title || '').trim()) {
      title = String(block.title).trim();
      description = String(block.description || '').trim();
      break;
    }
  }
  if (!title) {
    for (const loc of LOCALES) {
      const block = n.i18n[loc];
      if (block && String(block.title || '').trim()) {
        title = String(block.title).trim();
        description = String(block.description || '').trim();
        break;
      }
    }
  }
  return { id: n.id, images: n.images, title, description };
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

/** İctimai: partnyor, əlaqə, sosial, pages.home (?lang=az|ru|en) */
app.get('/api/site', (req, res) => {
  try {
    const lang = parseLangFromReq(req);
    const data = readData();
    res.set('Cache-Control', 'no-store, must-revalidate');
    res.json({ site: getPublicSiteForLang(data, lang), lang });
  } catch (e) {
    res.status(500).json({ ok: false, error: 'Oxunmadı' });
  }
});

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

/** İctimai: işlər (səhifələmə: ?page=1&limit=9&lang=) */
app.get('/api/works', (req, res) => {
  try {
    const lang = parseLangFromReq(req);
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
    const slice = all.slice(start, start + limit);
    const works = slice.map((w) => workPublicView(w, lang));
    res.set('Cache-Control', 'no-store, must-revalidate');
    res.json({
      works,
      lang,
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
    const lang = parseLangFromReq(req);
    const id = Number(req.params.id);
    const data = readData();
    const workRaw = (data.works || []).find((w) => Number(w.id) === id);
    if (!workRaw) return res.status(404).json({ ok: false, error: 'Tapılmadı' });
    res.set('Cache-Control', 'no-store, must-revalidate');
    res.json({ work: workPublicView(workRaw, lang), lang });
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
    data.site = newSite;
    deleteRemovedSiteMedia(previousRaw, newSite);
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
    const body = req.body || {};
    const locale = normalizeLocaleParam(body.locale) || DEFAULT_LOCALE;
    const { title, description, images } = body;
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
    const i18n = {};
    i18n[locale] = {
      title: String(title).trim(),
      description: String(description || '').trim(),
    };
    const row = { id, images: imgs, i18n };
    data.works.push(row);
    writeData(data);
    res.json({ ok: true, work: row });
  } catch (e) {
    res.status(500).json({ ok: false, error: 'Yaradılmadı' });
  }
});

app.put('/api/admin/works/:id', requireAdmin, (req, res) => {
  try {
    const id = Number(req.params.id);
    const body = req.body || {};
    const locale = normalizeLocaleParam(body.locale) || DEFAULT_LOCALE;
    const { title, description, images, i18n: i18nBody } = body;
    const data = readData();
    data.works = data.works || [];
    const idx = data.works.findIndex((w) => Number(w.id) === id);
    if (idx === -1) return res.status(404).json({ ok: false, error: 'Tapılmadı' });
    let row = normalizeWorkStorage(data.works[idx]);
    if (i18nBody && typeof i18nBody === 'object') {
      row.i18n = {};
      for (const loc of LOCALES) {
        const b = i18nBody[loc];
        if (b && typeof b === 'object') {
          const t = String(b.title || '').trim().slice(0, 500);
          const d = String(b.description || '').trim().slice(0, 20000);
          if (t || d) row.i18n[loc] = { title: t, description: d };
        }
      }
    } else if (title != null || description != null) {
      row.i18n = { ...row.i18n };
      const prevBlock = row.i18n[locale] || {};
      row.i18n[locale] = {
        title: title != null ? String(title).trim() : String(prevBlock.title || '').trim(),
        description:
          description != null ? String(description).trim() : String(prevBlock.description || '').trim(),
      };
    }
    let removedPaths = [];
    if (images != null) {
      const imgs = Array.isArray(images) ? images.filter(Boolean) : [];
      if (!imgs.length) {
        return res.status(400).json({ ok: false, error: 'Ən azı bir şəkil qalmalıdır' });
      }
      const oldImages = row.images || [];
      removedPaths = oldImages.filter((p) => !imgs.includes(p));
      row.images = imgs;
    }
    data.works[idx] = row;
    writeData(data);
    for (const p of removedPaths) {
      tryDeleteOrphanWorkImage(data, p);
    }
    res.json({ ok: true, work: row });
  } catch (e) {
    res.status(500).json({ ok: false, error: 'Yenilənmədi' });
  }
});

app.delete('/api/admin/works/:id/locale/:locale', requireAdmin, (req, res) => {
  try {
    const id = Number(req.params.id);
    const loc = normalizeLocaleParam(req.params.locale);
    if (!loc) {
      return res.status(400).json({ ok: false, error: 'Yanlış dil kodu' });
    }
    if (loc === DEFAULT_LOCALE) {
      return res.status(400).json({ ok: false, error: 'Əsas dil (AZ) tərcüməsi silinə bilməz' });
    }
    const data = readData();
    data.works = data.works || [];
    const idx = data.works.findIndex((w) => Number(w.id) === id);
    if (idx === -1) return res.status(404).json({ ok: false, error: 'Tapılmadı' });
    const row = normalizeWorkStorage(data.works[idx]);
    if (row.i18n[loc]) {
      delete row.i18n[loc];
    }
    data.works[idx] = row;
    writeData(data);
    res.json({ ok: true, work: row });
  } catch (e) {
    res.status(500).json({ ok: false, error: 'Silinmədi' });
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
