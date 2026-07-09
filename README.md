# Ryan Edley — Portfolio

**MASTER CONTROL** — a portfolio site built like a live broadcast facility.

Ryan Edley is a creative producer: ten years of network reality television
(American Idol, Farmer Wants a Wife, Extreme Makeover: Home Edition, Kitchen
Nightmares), three years of brand & product film (Google, LEGO, Peloton,
NFL Sunday Ticket), and an AI chapter currently in production.

## Pages

| Page | File | Concept |
| --- | --- | --- |
| Home | `index.html` | The program monitor — hero, source wall, stats |
| Reality Producing | `reality.html` | SRC 01 — credits as a control-room rundown |
| Brand Producing | `brand.html` | SRC 02 — the finishing suite: client marquee, live SYD/LA/LDN clocks |
| AI Work | `ai.html` | SRC 03 — the new signal: pipelines and workflows |
| Resume | `resume.html` | The call sheet — prints clean via the Print chip |

## Stack

Static HTML / CSS / vanilla JS. No build step, no dependencies.
Fonts from Google Fonts (Archivo, IBM Plex Mono, Instrument Serif).
All animation honors `prefers-reduced-motion`. Works with JS disabled.

## Run locally

Open `index.html` in a browser, or:

```sh
python3 -m http.server 8000
```

then visit <http://localhost:8000>.

## Deploy

Any static host works (GitHub Pages, Netlify, Vercel). For GitHub Pages:
Settings → Pages → deploy from branch, root directory.
