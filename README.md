# Suvarmax - Professional Irrigation Systems Website

A mobile-first, responsive static website built for Suvarmax. Created with HTML, CSS (Tailwind) and vanilla JavaScript.

## 📁 File Structure

```
suvarmax/
├── index.html          # One-page site (all sections in one file)
├── README.md           # This file
├── TELEGRAM_SETUP.md   # Telegram bot setup guide
└── assets/
    ├── css/
    │   └── style.css   # Custom CSS styles
    ├── js/
    │   └── main.js     # JavaScript functionality
    └── images/
        └── logo.svg    # Logo file
```

## 🚀 Deploying to GitHub Pages

### 1. Create GitHub Repository

Create a new repository on GitHub (e.g., `suvarmax`).

### 2. Git Commands

Run the following commands in the project folder:

```bash
# Initialize git repository
git init

# Add all files
git add .

# Create commit
git commit -m "Initial commit — Suvarmax static site"

# Rename branch to main
git branch -M main

# Add GitHub repository as remote
# (Replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/suvarmax.git

# Push code to GitHub
git push -u origin main
```

### 3. Enable GitHub Pages

1. Go to your GitHub repository
2. Navigate to **Settings** → **Pages**
3. Under **Source**:
   - **Branch**: Select `main`
   - **Folder**: Select `/ (root)`
4. Click **Save**
5. After a few minutes, your site will be published at `https://YOUR_USERNAME.github.io/suvarmax/`

## 🔧 Configuration

### Changing Contact Information

Update contact information in `index.html`:
- In the Contact section (#contact)
- In the Footer section

Find and replace:
- `+994 XX XXX XX XX` → your phone number
- `info@suvarmax.az` → your email address
- `Bakı, Azərbaycan` → your address

### Changing Logo

Replace `assets/images/logo.svg` with your own logo or update the logo path in HTML files.

### Telegram Bot Setup

Form submissions are sent to a Telegram bot. For setup:

1. See `TELEGRAM_SETUP.md` for detailed instructions
2. Create a bot with [@BotFather](https://t.me/botfather) on Telegram
3. Get your Bot Token and Chat ID
4. Update `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` variables in `assets/js/main.js`

**Note:** Be careful not to upload Bot Token and Chat ID to public GitHub repositories. For production, using a backend proxy is recommended.

## 🎨 Design

- **Color palette**: Green primary color (#2d8659), dark gray and white
- **Font**: Inter (Google Fonts)
- **Layout**: Mobile-first, responsive design
- **Framework**: Tailwind CSS (CDN)

## 📱 Features

- ✅ One-page site (all sections in one file)
- ✅ Smooth scroll navigation with anchor links
- ✅ Mobile-first responsive design
- ✅ Sophisticated Hero Section (animations, statistics)
- ✅ Mobile menu
- ✅ Contact form with Telegram integration
- ✅ SEO optimized meta tags
- ✅ Accessibility (a11y) support
- ✅ Partners slider with Swiper.js

## 📝 Notes

- One-page site structure with all sections in `index.html`
- Navigation via anchor links (#home, #about, #services, #contact)
- Custom color variables in CSS file (`:root` section)
- All interactive functionality in JavaScript file
- Unsplash placeholder images used (can be changed as needed)

## 🔗 Links

- [Tailwind CSS](https://tailwindcss.com)
- [Google Fonts - Inter](https://fonts.google.com/specimen/Inter)
- [Swiper.js](https://swiperjs.com)

## 📄 License

This project is free to use.

---

**Note**: Before publishing the site, remember to replace all placeholder data (phone, email, address, images) with your actual information.
