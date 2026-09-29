# /v/ video pages

Pages: `love/`, `talents/`, `focus/`, `power/`.

The video files (`focus.mp4`, `love.mp4`, `talents.mp4`, about 64 MB total) are not stored in git.
They only live on the server at `/var/www/carvking/v/`. `*.mp4` is gitignored here.

## Do Not Be Afraid (`power/`)

- `power/index.html`: chooser for twelve versions, plus the 60-second original in `power/short/`.
- `power/1/` … `power/12/`: each is a tiny `index.html` plus a `power.scroll` file (the film, in the Scroll format, see `scroll/README.md`).
  All twelve share one engine (`power/assets/scroll-<hash>.js`, `power-<hash>.css`), one image set (`assets/img/*-2.webp`)
  and soundtrack cues (`assets/audio/home-*-1.mp3`, used by versions 1, 3, 10 and 12; the others are fully generative).
- Asset filenames change whenever their content changes (Cloudflare caches assets, not HTML or .scroll files).
