# Carvking

Editorial site for [carvking.com](https://carvking.com).

- Home: issue index
- [`/brief/`](/brief/): Issue 01 fact-check (*Four real files. One break-up story.*)
- [`/issue-02/`](/issue-02/): Issue 02 Iceland politics/business X roundup (14–16 Sep 2026 window; X embeds filled)
- Watchlist (handles, weights, enabled flags): [`data/watchlist.json`](data/watchlist.json)

## Production

Live deploy is **Hetzner** at `/var/www/carvking` via Basicform Webmaster. That is production for the custom domain. GitHub Pages in this repo is **not** the production host for `carvking.com`.

## GitHub Pages (optional / preview)

GitHub Apps cannot flip Pages on for this account. One click from you if you still want a Pages preview:

1. Open [Pages settings](https://github.com/hreinnbasicform/carvking/settings/pages) → **Source: GitHub Actions** (or Deploy from branch `main` / root). Save.
2. In Cloudflare DNS for `carvking.com`:
   - Apex CNAME/flatten → `hreinnbasicform.github.io`
   - Proxy **DNS only** (grey cloud) so GitHub can issue TLS
   - Optional: `www` CNAME → `hreinnbasicform.github.io`

A `CNAME` file for `carvking.com` is already in this repo. Until DNS is switched, Cloudflare will keep serving the current `hello` stub. Do not treat that Pages path as live production — Hetzner is.
