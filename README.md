# Suvarmax - Peşəkar Suvarma Sistemləri Vebsaytı

Suvarmax üçün hazırlanmış mobil-first, responsiv statik vebsayt. HTML, CSS (Tailwind) və vanilla JavaScript ilə yaradılmışdır.

## 📁 Fayl Strukturu

```
suvarmax/
├── index.html          # One-page sayt (bütün bölmələr bir faylda)
├── README.md           # Bu fayl
└── assets/
    ├── css/
    │   └── style.css   # Custom CSS stilləri
    ├── js/
    │   └── main.js     # JavaScript funksionallığı
    └── images/
        └── logo.svg    # Loqo faylı
```

## 🚀 GitHub Pages-ə Yükləmə

### 1. GitHub Repository Yaratmaq

GitHub-da yeni repository yaradın (məsələn: `suvarmax`).

### 2. Git Əmrləri

Proyekt qovluğunda aşağıdakı əmrləri yerinə yetirin:

```bash
# Git repository-ni başlat
git init

# Bütün faylları əlavə et
git add .

# Commit yarat
git commit -m "Initial commit — Suvarmax static site"

# Branch-i main olaraq adlandır
git branch -M main

# GitHub repository-ni remote olaraq əlavə et
# (YOUR_USERNAME-i öz GitHub istifadəçi adınızla əvəz edin)
git remote add origin https://github.com/YOUR_USERNAME/suvarmax.git

# Kodları GitHub-a push et
git push -u origin main
```

### 3. GitHub Pages Aktivləşdirmə

1. GitHub repository-nizə daxil olun
2. **Settings** → **Pages** bölməsinə keçin
3. **Source** altında:
   - **Branch**: `main` seçin
   - **Folder**: `/ (root)` seçin
4. **Save** düyməsini basın
5. Bir neçə dəqiqə sonra saytınız `https://YOUR_USERNAME.github.io/suvarmax/` ünvanında yayımlanacaq

## 🔧 Konfiqurasiya

### Əlaqə Məlumatlarını Dəyişdirmək

`index.html` faylında əlaqə məlumatlarını dəyişdirin:
- Əlaqə bölməsində (#contact)
- Footer bölməsində

Axtarın və dəyişdirin:
- `+994 XX XXX XX XX` → öz telefon nömrəniz
- `info@suvarmax.az` → öz email ünvanınız
- `Bakı, Azərbaycan` → öz ünvanınız

### Loqo Dəyişdirmək

`assets/images/logo.svg` faylını öz loqonuzla əvəz edin və ya HTML fayllarında loqo yolunu dəyişdirin.

### Telegram Bot Quraşdırması

Form məlumatları Telegram botuna göndərilir. Quraşdırma üçün:

1. `TELEGRAM_SETUP.md` faylına baxın - ətraflı təlimatlar var
2. Telegram-da [@BotFather](https://t.me/botfather) ilə bot yaradın
3. Bot Token və Chat ID-ni əldə edin
4. `assets/js/main.js` faylında `TELEGRAM_BOT_TOKEN` və `TELEGRAM_CHAT_ID` dəyişənlərini dəyişdirin

**Qeyd:** Bot Token və Chat ID-ni GitHub-a yükləməmək üçün diqqətli olun. Production üçün backend proxy istifadə etmək tövsiyə olunur.


## 🎨 Dizayn

- **Rəng palitrası**: Yaşılımtıl əsas rəng (#2d8659), tünd boz və ağ
- **Font**: Inter (Google Fonts)
- **Layout**: Mobil-first, responsiv dizayn
- **Framework**: Tailwind CSS (CDN)

## 📱 Xüsusiyyətlər

- ✅ One-page sayt (bütün bölmələr bir faylda)
- ✅ Anchor linklər ilə smooth scroll naviqasiya
- ✅ Mobil-first responsiv dizayn
- ✅ Sofistik Hero Section (animasiyalar, statistika)
- ✅ Mobil menyu
- ✅ Əlaqə formu (mailto fallback və Formspree dəstəyi)
- ✅ Lazy loading şəkillər
- ✅ SEO optimallaşdırılmış metatags
- ✅ Accessibility (a11y) dəstəyi

## 📝 Qeydlər

- One-page sayt strukturunda bütün bölmələr `index.html` faylındadır
- Anchor linklər (#home, #about, #services, #contact) ilə naviqasiya
- CSS faylında custom rəng dəyişənləri var (`:root` bölməsində)
- JavaScript faylında bütün interaktiv funksionallıq var
- Şəkillər üçün Unsplash placeholder linkləri istifadə olunub (istəyə görə dəyişdirilə bilər)

## 🔗 Linklər

- [Tailwind CSS](https://tailwindcss.com)
- [Formspree](https://formspree.io)
- [Google Fonts - Inter](https://fonts.google.com/specimen/Inter)

## 📄 Lisenziya

Bu proyekt istifadə üçün azaddır.

---

**Qeyd**: Saytı yayımlamazdan əvvəl bütün placeholder məlumatları (telefon, email, ünvan, şəkillər) öz real məlumatlarınızla əvəz etməyi unutmayın.

