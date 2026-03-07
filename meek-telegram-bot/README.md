# MEEK Telegram Bot

Community Telegram bot for the $MEEK crypto project. Built with Node.js, grammY, and Docker.

## Features

- **Welcome messages** - Greets new members with a configurable template
- **Spam filter** - Blocks spam keywords, patterns, links from new members, and excessive caps
- **Auto-pin X posts** - Automatically pins messages containing twitter.com/x.com links from approved users
- **Scheduled engagement** - Sends GM/GN and community prompts at configurable times via node-cron
- **Commands**:
  - `/pin` - Pin a message (admin only, reply to target message)
  - `/stats` - Show community stats (admin only)
  - `/price` - Fetch live $MEEK price from CoinGecko
  - `/website` - Show the MEEK website link
  - `/socials` - Show all social media links

## Setup

1. Copy `.env.example` to `.env` and fill in values
2. Install dependencies: `npm install`
3. Build: `npm run build`
4. Run: `npm start`

### Development

```bash
npm run dev
```

### Docker

```bash
docker compose up -d --build
```

## Environment Variables

| Variable | Description | Required |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | Bot token from @BotFather | Yes |
| `TELEGRAM_CHAT_ID` | Target group chat ID | Yes |
| `ADMIN_USER_IDS` | Comma-separated admin Telegram user IDs | Yes |
| `APPROVED_PINNERS` | Comma-separated user IDs allowed to trigger auto-pin | No |
| `COINGECKO_COIN_ID` | CoinGecko coin ID for /price (default: `meek`) | No |
| `MEEK_WEBSITE_URL` | Website URL for /website and /socials | No |
| `MEEK_TWITTER_URL` | Twitter/X URL for /socials | No |
| `MEEK_TELEGRAM_URL` | Telegram group URL for /socials | No |
| `NODE_ENV` | Environment (production/development) | No |

## Configuration Files

Edit files in `config/` to customize behavior:

- `templates.json` - Welcome and engagement message templates
- `schedule.json` - Cron schedule for engagement messages (timezone, hours, days)
- `spam-patterns.json` - Spam keywords, regex patterns, and thresholds
