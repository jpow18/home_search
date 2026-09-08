# HomeSeek

HomeSeek is a small, self-hosted property search agent. You define home or land searches. It searches the live web, scores each listing against your rules, deduplicates results, and emails strong new matches.

The dashboard runs on Vercel. Data lives in Supabase. Web search and triage use the OpenAI Responses API. Email alerts use Resend.

## What it does

- Saves multiple home or land search rules.
- Searches live listing pages on demand or once each day.
- Scores results from 0 to 100 and lists pros, cons, and missing facts.
- Keeps one copy of each listing for each search.
- Lets you save or pass on a listing.
- Emails only new listings that score 75 or higher.
- Shows safe demo data until you connect services.

HomeSeek gives you leads, not verified property facts. Confirm price, availability, boundaries, zoning, and all other details with the listing source and local authorities.

## Setup

You need Node.js 20 or newer and accounts for [Supabase](https://supabase.com), [OpenAI](https://platform.openai.com), and optionally [Resend](https://resend.com).

1. Install the app:

   ```bash
   npm install
   cp .env.example .env.local
   ```

2. Create a Supabase project. Open its SQL Editor and run [`supabase/migrations/001_initial.sql`](supabase/migrations/001_initial.sql).

3. Add these values to `.env.local`:

   ```dotenv
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   OPENAI_API_KEY=sk-...
   APP_PASSWORD=choose-a-long-password
   CRON_SECRET=choose-another-random-secret
   ```

4. To send alerts, verify a domain in Resend and add:

   ```dotenv
   RESEND_API_KEY=re_...
   ALERT_FROM_EMAIL=HomeSeek <alerts@your-domain.com>
   ```

5. Start the app:

   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000). When Basic Auth asks for a login, use `owner` as the username and your `APP_PASSWORD` as the password.

## Deploy to Vercel

1. Push this folder to GitHub.
2. Import the repo in Vercel.
3. Add the same environment variables in the Vercel project settings.
4. Deploy.

`vercel.json` schedules one search each day at 12:00 UTC. Vercel Hobby supports daily cron jobs, but the exact start time can vary within the hour. Manual runs are always available from the dashboard.

Keep `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `RESEND_API_KEY`, `APP_PASSWORD`, and `CRON_SECRET` server-only. Never add `NEXT_PUBLIC_` to these names.

## Cost controls

- Each active rule makes one OpenAI request per run.
- A run returns at most 12 results per rule.
- Daily cron runs once, not hourly.
- Set `OPENAI_MODEL` if you want to use another Responses API model.
- Pause or delete old rules directly in Supabase for now.

## Commands

```bash
npm run dev     # local server
npm test        # small URL-deduplication check
npm run lint    # lint
npm run build   # production build
```

## License

MIT
