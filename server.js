/**
 * Suvarmax — JSON məlumat + statik fayllar + admin API
 * İşə salmaq: npm start
 */
const express = require('express');
const session = require('express-session');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const DATA_PATH = path.join(ROOT, 'data', 'site-data.json');
const IMAGES_DIR = path.join(ROOT, 'assets', 'images');

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

const app = express();

app.use(express.json({ limit: '2mb' }));
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'suvarmax-dev-secret-deyisin',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: 'lax',
    },
  })
);

function requireAdmin(req, res, next) {
  if (!req.session || !req.session.admin) {
    return res.status(401).json({ ok: false, error: 'Giriş tələb olunur' });
  }
  next();
}

/** İctimai: yalnız işlər */
app.get('/api/works', (req, res) => {
  try {
    const data = readData();
    res.json({ works: data.works || [] });
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
    req.session.admin = true;
    req.session.username = username;
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: 'Giriş xətası' });
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

app.get('/api/admin/me', (req, res) => {
  if (!req.session || !req.session.admin) {
    return res.json({ ok: false, loggedIn: false });
  }
  res.json({ ok: true, loggedIn: true, username: req.session.username });
});

/** Admin: tam JSON (işlər + adminlər) */
app.get('/api/admin/data', requireAdmin, (req, res) => {
  try {
    const data = readData();
    res.json({
      works: data.works || [],
      admins: data.admins || [],
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: 'Oxuna bilmədi' });
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
    if (images != null) {
      const imgs = Array.isArray(images) ? images.filter(Boolean) : [];
      if (!imgs.length) {
        return res.status(400).json({ ok: false, error: 'Ən azı bir şəkil qalmalıdır' });
      }
      data.works[idx].images = imgs;
    }
    writeData(data);
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
    const len = data.works.length;
    data.works = data.works.filter((w) => Number(w.id) !== id);
    if (data.works.length === len) {
      return res.status(404).json({ ok: false, error: 'Tapılmadı' });
    }
    writeData(data);
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

app.delete('/api/admin/admins/:username', requireAdmin, (req, res) => {
  try {
    const username = decodeURIComponent(req.params.username);
    const data = readData();
    data.admins = data.admins || [];
    if (data.admins.length <= 1) {
      return res.status(400).json({ ok: false, error: 'Son admin silinə bilməz' });
    }
    if (username === req.session.username) {
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
