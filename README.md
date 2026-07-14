# Startup Funding Outreach Pipeline

Automated pipeline that discovers newly funded startups, enriches them with verified contact points, and dispatches personalized outreach - built solo in TypeScript.

![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)
![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![License](https://img.shields.io/badge/license-MIT-lightgrey)

---

## Overview

Manually tracking newly funded startups and reaching out to the right person doesn't scale. This project turns that process into a three-stage pipeline: **discover → enrich → dispatch**, with every stage designed to survive crashes, respect rate limits, and never lose or duplicate work.

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   DISCOVER  │ --> │   ENRICH    │ --> │   DISPATCH  │
│             │     │             │     │             │
│ Inc42 API   │     │ Domain      │     │ Nodemailer  │
│ StartupTalky│     │ lookup →    │     │ + shift-    │
│ (adapters)  │     │ email guess │     │ based daemon│
└─────────────┘     └─────────────┘     └─────────────┘
       │                    │                    │
       ▼                    ▼                    ▼
 Unified Excel        Enriched Excel       Sent/Failed
    schema              (+ emails)          tracking
```

## How It Works

### 1. Discovery
Two independent scrapers implement a shared `ScraperAdapter` interface — one pulls a paginated JSON API, the other parses a public HTML table with Cheerio. Currency formats, missing fields, and inconsistent structures are normalized into a single `UnifiedFundingRound` schema, so downstream code never has to care which source a record came from.

### 2. Enrichment
Each company name is passed through a domain-lookup API to reconstruct a likely contact point (`careers@[domain]`). The enrichment loop:
- Skips and logs unmatched companies instead of failing
- Backs off automatically on rate limiting (10-minute cooldown on HTTP 429)
- Self-throttles every 50 lookups with a 20-minute pause
- Checkpoints every successful match to disk immediately

### 3. Dispatch
Outreach runs as a long-lived daemon, not a one-shot script:
- Batches capped at 35 sends
- Randomized delay (2–20 min) between individual sends
- 12-hour shift cycle between batches
- Every send checkpoints its `Sent`/`Failed` status immediately after firing

## Engineering Highlights

- **Adapter pattern** for pluggable data sources — adding a third source means writing one adapter, not touching the pipeline.
- **Idempotent, resumable state** — every stage checkpoints to disk after each unit of work. A crash at record 380 resumes at 380, not 0. Nothing gets processed or sent twice.
- **Rate-limit-aware by design** — cooldowns and jitter aren't an afterthought; they're load-bearing parts of the enrichment and dispatch loops.
- **Fail-soft, not fail-fast** — a single bad lookup, dropped connection, or malformed row logs and continues instead of taking down the run.

## Tech Stack

| Layer | Tech |
|---|---|
| Language | TypeScript |
| Runtime | Node.js |
| HTML parsing | Cheerio |
| HTTP client | Browser-emulating fetch client for reliable requests against source sites |
| State / checkpointing | Excel (`xlsx` / SheetJS) |
| Contact enrichment | Clearbit Autocomplete API |
| Email delivery | Nodemailer (Gmail SMTP) |

## Project Structure

```
src/
├── adaptors/
│   ├── inc42Adapter.ts        # JSON API scraper
│   └── starrtupTalkAdapter.ts # HTML table scraper (Cheerio)
├── mailDispatcher/
│   └── mailer.ts              # Nodemailer wrapper
├── types/
│   └── types.ts               # Shared interfaces (ScraperAdapter, UnifiedFundingRound)
├── campaign.ts                # Dispatch daemon: batching, delays, checkpointing
├── enrichment.ts               # Domain/email enrichment engine
├── exporter.ts                 # Excel export
└── index.ts                    # Discovery entry point
output/                          # Checkpointed Excel state (gitignored data files)
```

## Getting Started

```bash
git clone https://github.com/barathraj048/<repo-name>.git
cd <repo-name>
npm install
```

Create a `.env` file (never commit this — already covered in `.gitignore`):

```
EMAIL_USER=your-gmail-address@gmail.com
EMAIL_PASS=your-gmail-app-password   # use an App Password, not your real password
PHONE=your-Phone number 
```

Run each stage:

```bash
# 1. Discover and export funding data
npx ts-node src/index.ts

# 2. Enrich with contact emails
npx ts-node src/enrichment.ts

# 3. Start the outreach daemon
npx ts-node src/campaign.ts
```

## Results So Far

- **970** startups sourced across 2 independent data sources
- **793** verified contact points enriched (~82% match rate)
- **200+** pitches sent to date (till date)

## Roadmap

- [ ] Distributed worker architecture to scale send volume horizontally
- [ ] Opt-out / unsubscribe handling for outreach compliance
- [ ] Retry queue for failed enrichment lookups instead of skip-and-log
- [ ] Additional funding-data sources beyond Inc42 and StartupTalky

## Design Philosophy

This pipeline is built to respect the infrastructure it touches, not fight it — rate limits trigger cooldowns rather than workarounds, and send volume is deliberately capped well below anything that reads as bulk email. It's designed for low-volume, targeted personal outreach, not mass marketing.

## Author

**Barath M** — Final-year ECE student, top 9% globally on LeetCode, merged contributor to [n8n](https://github.com/n8n-io/n8n) and [Cal.com](https://github.com/calcom/cal.com).

Open to full-time backend / full-stack opportunities.
[GitHub](https://github.com/barathraj048) · [LeetCode](https://leetcode.com/u/barathraj048/) · [LinkedIn](https://linkedin.com/in/bharath-raj-7992a7248/)

## License

MIT — update if you'd prefer a different license.
