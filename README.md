# Carvking

Editorial site for [carvking.com](https://carvking.com). Issue 01: *Four real files. One break-up story.*

- Home: first-post summary
- [`/brief/`](/brief/): full fact-check

## Go live

GitHub Apps cannot flip Pages on for this account. One click from you:

1. Open [Pages settings](https://github.com/hreinnbasicform/carvking/settings/pages) → **Source: GitHub Actions** (or Deploy from branch `main` / root). Save.
2. In Cloudflare DNS for `carvking.com`:
   - Apex CNAME/flatten → `hreinnbasicform.github.io`
   - Proxy **DNS only** (grey cloud) so GitHub can issue TLS
   - Optional: `www` CNAME → `hreinnbasicform.github.io`

A `CNAME` file for `carvking.com` is already in this repo. Until DNS is switched, Cloudflare will keep serving the current `hello` stub.
