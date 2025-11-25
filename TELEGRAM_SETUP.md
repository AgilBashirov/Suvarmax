# Telegram Bot Quraşdırması

Form məlumatlarını Telegram botuna göndərmək üçün aşağıdakı addımları izləyin:

## 1. Telegram Bot Yaratmaq

1. Telegram-da [@BotFather](https://t.me/botfather) botuna mesaj göndərin
2. `/newbot` əmrini yazın
3. Botunuz üçün ad seçin (məsələn: "Suvarmax Contact Bot")
4. Botunuz üçün username seçin (məsələn: `suvarmax_contact_bot`)
5. BotFather sizə **Bot Token** verəcək (məsələn: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

## 2. Chat ID Tapmaq

Mesajların göndəriləcəyi chat-in ID-sini tapmaq üçün:

### Seçim 1: Şəxsi mesaj (özünüzə göndərmək)

1. [@userinfobot](https://t.me/userinfobot) botuna mesaj göndərin
2. Bot sizə **Your Id** göstərəcək - bu sizin Chat ID-nizdir

### Seçim 2: Qrup üçün

1. Qrupa [@userinfobot](https://t.me/userinfobot) əlavə edin
2. Bot-a `/start` yazın
3. Bot sizə qrupun ID-sini göstərəcək

**Qeyd:** Qrup ID-ləri mənfi ola bilər (məsələn: `-1001234567890`)

## 3. JavaScript Faylında Konfiqurasiya

`assets/js/main.js` faylını açın və aşağıdakı dəyişənləri dəyişdirin:

```javascript
const TELEGRAM_BOT_TOKEN = 'YOUR_BOT_TOKEN'; // BotFather-dən aldığınız token
const TELEGRAM_CHAT_ID = 'YOUR_CHAT_ID'; // Öz Chat ID-niz və ya qrup ID-si
```

**Nümunə:**
```javascript
const TELEGRAM_BOT_TOKEN = '123456789:ABCdefGHIjklMNOpqrsTUVwxyz';
const TELEGRAM_CHAT_ID = '123456789'; // və ya qrup üçün: '-1001234567890'
```

## 4. Test Etmək

1. Saytı açın
2. Əlaqə formunu doldurun
3. "Mesaj Göndər" düyməsini basın
4. Telegram-da mesajı yoxlayın

## 5. Təhlükəsizlik

⚠️ **MÜHİM:** Bot Token və Chat ID-ni **heç vaxt** GitHub-a yükləməyin!

### Təhlükəsiz variant (isteğe bağlı):

Əgər saytınızı GitHub Pages-də host edirsinizsə, məlumatları gizlətmək üçün:

1. **Environment variables** istifadə edin (ancaq bu GitHub Pages-də dəstəklənmir)
2. **Backend proxy** yaradın (Node.js, Python və s.)
3. **Netlify Functions** və ya **Vercel Functions** istifadə edin

Ən sadə həll: Bot Token və Chat ID-ni birbaşa JavaScript-də saxlamaq (ancaq bu public olacaq). 
Yalnız form məlumatlarını alacaq bot üçün bu qəbul edilə bilər, amma botunuzu məhdudlaşdırın ki, yalnız sizin Chat ID-nizə mesaj göndərsin.

## 6. Bot Məhdudiyyətləri

Botunuzun yalnız sizin Chat ID-nizə mesaj göndərməsi üçün:

1. BotFather-da `/setprivacy` əmrini yazın
2. Botunuzu seçin
3. `Disable` seçin (bu botun yalnız sizinlə işləməsinə imkan verir)

## Kömək

Əgər problem yaşayırsınız:
- Bot Token düzgündürmü yoxlayın
- Chat ID düzgündürmü yoxlayın
- Bot-a `/start` yazıb aktivləşdirdinizmi yoxlayın
- Browser console-da xətaları yoxlayın (F12)

