# valhallabridge

Static host for meme bridge pages. Each card is a black redirect that opens the X composer and serves its image as a large Twitter / Open Graph card.

Live origin (Cloudflare Pages): `https://valhallabridge.pages.dev`

## Layout

Built to hold thousands of cards without a build step.

```
p/<slug>/index.html   ← liminal bridge + baked OG tags
p/<slug>/card.png     ← share image
p/<slug>/meta.json    ← slug, tweet text, size, created
catalog.json          ← append-only index the editor will read
site.json             ← origin + reserved slugs
templates/card.html   ← page template
scripts/new_card.py   ← the only writer the GUI should call
```

Public URL: `https://valhallabridge.pages.dev/p/<slug>/`

`/` and unknown paths stay black. There is no gallery and no sitemap — card crawlers are allowed, everything else is told to stay out.

## Add a card

```bash
python3 scripts/new_card.py \
  --slug mario-party \
  --image ../meme.png \
  --text "I stand with the #MarioParty"
```

Prints the public URL. Refuses a slug that already exists unless you pass `--force`.

Later the editor **Publish** button will: write via this script → `git add` → `git commit` → `git push`. Cloudflare Pages mirrors `main`.

## Connect Cloudflare Pages

Wrangler is not logged in on this machine, so the GitHub repo is the source of truth until you attach it:

1. [Cloudflare Pages](https://dash.cloudflare.com/?to=/:account/pages) → **Create** → **Connect to Git**
2. Repo: `valhallabridge`. Framework: **None**. Build command: empty. Output directory: `/`
3. Project name: `valhallabridge` so the hostname stays `valhallabridge.pages.dev`
4. After the first deploy, a custom domain can replace the origin in `site.json` (then re-run `new_card.py --force` on existing cards if you need absolute OG URLs rewritten)

## Scale

- One folder per card. A few thousand siblings under `p/` is fine.
- `catalog.json` is the lookup table so the GUI does not have to walk the tree.
- Card images are cached immutable at the edge. HTML is cached for a minute.
- When the repo gets heavy, track `p/**/card.*` with Git LFS. Do not add a client-side catalog render — crawlers must see OG tags in static HTML.
