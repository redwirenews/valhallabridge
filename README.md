# valhallabridge

Static host for meme bridge pages. Each card is a black redirect that opens the X composer and serves its image as a large Twitter / Open Graph card.

Live origin: `https://valhallabridge.com`

## Public paths

- `/` — empty black page
- `/editor/` — quiz-card maker. Exports a PNG on this device. Nothing is uploaded.
- `/p/<slug>/` — a published card

There is no public write API and no gallery.

## Connect Cloudflare Pages

1. [Cloudflare Pages](https://dash.cloudflare.com/?to=/:account/pages) → **Create** → **Connect to Git**
2. Repo: `valhallabridge`. Framework: **None**. Build command: empty. Output directory: `/`
3. Project name: `valhallabridge`
4. **Custom domains** → add `valhallabridge.com`
