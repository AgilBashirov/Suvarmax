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

## 3. Admin paneldə konfiqurasiya

1. Saytı işə salın: `npm start`
2. Admin panelə daxil olun: `http://localhost:PORT/admin/login.html`
3. **Telegram** səhifəsinə keçin (`admin/panel-telegram.html`)
4. **Bot token** və **Chat ID** daxil edin (dəyərlər səhifədə olduğu kimi görünür)
5. **Saxla** düyməsini basın — məlumatlar `data/site-data.json` faylında saxlanılır

Token və Chat ID **ictimai** `/api/site` cavabında göndərilmir; form sorğuları `POST /api/contact` ilə serverə düşür və Telegram oradan göndərilir. Server üçün **Node.js 18+** lazımdır (`fetch` API).

## 4. Test Etmək

1. Saytı açın
2. Əlaqə formunu doldurun
3. "Mesaj Göndər" düyməsini basın
4. Telegram-da mesajı yoxlayın

## 5. Təhlükəsizlik

⚠️ **MÜHİM:** Bot Token və Chat ID-ni **heç vaxt** GitHub-a yükləməyin!

Bu layihədə token serverdə (`data/site-data.json`) saxlanır və forma `POST /api/contact` ilə işləyir — statik host (GitHub Pages) ilə yalnız front işləməz; Node server (`npm start`) lazımdır.

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


