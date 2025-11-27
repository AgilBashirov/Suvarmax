# Telegram Bot Setup

Follow these steps to send form submissions to a Telegram bot:

## 1. Create a Telegram Bot

1. Send a message to [@BotFather](https://t.me/botfather) on Telegram
2. Type the `/newbot` command
3. Choose a name for your bot (e.g., "Suvarmax Contact Bot")
4. Choose a username for your bot (e.g., `suvarmax_contact_bot`)
5. BotFather will give you a **Bot Token** (e.g., `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

## 2. Find Your Chat ID

To find the Chat ID where messages will be sent:

### Option 1: Personal message (send to yourself)

1. Send a message to [@userinfobot](https://t.me/userinfobot)
2. The bot will show you **Your Id** - this is your Chat ID

### Option 2: For a group

1. Add [@userinfobot](https://t.me/userinfobot) to the group
2. Type `/start` to the bot
3. The bot will show you the group's ID

**Note:** Group IDs can be negative (e.g., `-1001234567890`)

## 3. Configure JavaScript File

Open `assets/js/main.js` and update the following variables:

```javascript
const TELEGRAM_BOT_TOKEN = 'YOUR_BOT_TOKEN'; // Token from BotFather
const TELEGRAM_CHAT_ID = 'YOUR_CHAT_ID'; // Your Chat ID or group ID
```

**Example:**
```javascript
const TELEGRAM_BOT_TOKEN = '123456789:ABCdefGHIjklMNOpqrsTUVwxyz';
const TELEGRAM_CHAT_ID = '123456789'; // or for group: '-1001234567890'
```

## 4. Testing

1. Open the website
2. Fill out the contact form
3. Click the "Send Message" button
4. Check your Telegram for the message

## 5. Security

⚠️ **IMPORTANT:** Never upload Bot Token and Chat ID to public GitHub repositories!

### Secure alternatives (optional):

If you're hosting your site on GitHub Pages, to hide credentials:

1. **Environment variables** (not supported on GitHub Pages)
2. **Backend proxy** (Node.js, Python, etc.)
3. **Netlify Functions** or **Vercel Functions**

The simplest solution is to keep Bot Token and Chat ID directly in JavaScript (but this will be public). 
For a bot that only receives form submissions, this is acceptable, but restrict your bot to only send messages to your Chat ID.

## 6. Bot Restrictions

To ensure your bot only sends messages to your Chat ID:

1. Type `/setprivacy` command in BotFather
2. Select your bot
3. Choose `Disable` (this allows the bot to work only with you)

## Help

If you're having problems:
- Verify the Bot Token is correct
- Verify the Chat ID is correct
- Make sure you've activated the bot by sending `/start`
- Check browser console for errors (F12)
