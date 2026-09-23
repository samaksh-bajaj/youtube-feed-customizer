# YouTube Feed Customizer

**Describe the feed you want in plain English. Everything else disappears.**

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![WXT](https://img.shields.io/badge/WXT-Chrome_MV3-67D4F8)
![Vercel](https://img.shields.io/badge/Vercel-000000?logo=vercel&logoColor=white)
![TypeSafe](https://img.shields.io/badge/Jev-System_One-6E56CF)

YouTube's home feed is whatever the recommendation engine decides it is. This extension puts one
sentence in front of it:

> _No reaction videos, drama commentary, or clickbait. I want substantial stuff about
> programming, systems, and music._

Every video on the feed is judged against that rule by [**Jev**](https://docs.typesafe.ai), a
System One model that returns calibrated probabilities instead of prose. Anything that fails is
removed from the page before you see it — including the videos infinite scroll loads twenty
minutes later.

No keyword lists, no channel blocklists, no training. Just a sentence you can rewrite whenever
your taste changes.

---

## How it works

```
┌──────────────┐   rule + on/off    ┌────────────────────┐
│    popup     │ ─────────────────▶ │  extension storage │
└──────────────┘                    └─────────┬──────────┘
                                              │
┌─────────────────────────────────────────────▼──────────┐
│ content script (youtube.com)                           │
│  • reads title + channel off each feed card            │
│  • MutationObserver catches infinite scroll            │
│  • re-attach timer survives SPA navigation             │
│  • applies display:none to whatever fails the rule     │
└─────────────────────────┬──────────────────────────────┘
                          │  batched, deduped
┌─────────────────────────▼──────────────────────────────┐
│ background worker — the only thing on the network      │
│  • caches judgments by (rule, videoId)                 │
└─────────────────────────┬──────────────────────────────┘
                          │  POST /api/classify + x-jev-secret
┌─────────────────────────▼──────────────────────────────┐
│ Vercel function — holds the API key                    │
│  • one request carries ten videos, one Noul each       │
└─────────────────────────┬──────────────────────────────┘
                          ▼
                    api.typesafe.ai
```

### The judgment

Ten videos travel as a single piece of state with one **Noul** — a yes/no question that returns
a probability — per video:

```ts
state: { rule, videos: [{ title, channel }, ...] }

questions: {
  v0: noul(
    "The user's rule for their YouTube home feed is `rule`. " +
    "Considering the video at `videos[0]`, should it be kept off their feed?",
    {
      true:  'The rule asks for videos like this one to be kept off the feed, or the rule ' +
             'describes the feed the user wants and this video clearly does not belong in it.',
      false: 'The rule allows this video, or the rule says nothing that applies to it.',
    },
  ),
  // v1 … v9
}
```

This is the fan-out pattern from the TypeSafe docs: the rule is serialised once and ten videos
cost one round trip instead of ten.

The endpoint returns **probabilities, not decisions**. The hide threshold lives in the
extension, so retuning it never needs a redeploy. Measured on a four-video sample against the
rule above:

| Video                                            | Jev  | Result |
| ------------------------------------------------ | ---- | ------ |
| _I Ate Only Beige Food For 30 Days (GONE WRONG)_ | 0.98 | hidden |
| _Reacting to My Old Videos_                      | 0.97 | hidden |
| _Bach: Goldberg Variations, full performance_    | 0.09 | shown  |
| _A Tour of the Rust Borrow Checker_              | 0.05 | shown  |

The default threshold of `0.7` sits in a wide gap rather than on a knife edge.

---

## Two things about YouTube that shaped this

**It never reloads the page.** Navigating away from the feed and back tears down the grid and
builds a new one, leaving a `MutationObserver` bound to a container nobody can see. An early
version listened for navigation events and stopped itself whenever the path wasn't exactly `/` —
YouTube's transient history states triggered that during ordinary scrolling, which stripped every
hide and killed the observer for the rest of the page's life. It now re-checks once a second that
the container it holds is still the one in the document, which covers navigations nobody thought
to listen for.

**It recycles card elements.** The same DOM node comes back holding a different video as you
scroll, so cards are keyed by video id, never by element. A decision that took a network round
trip is re-checked against the element before it's applied, or it would hide the wrong video.

The markup is also newer than most feed extensions assume: home cards are `yt-lockup-view-model`,
not `ytd-rich-grid-media`, and the video id is carried in a `content-id-<id>` class. Every
selector lives in [`lib/feed/selectors.ts`](lib/feed/selectors.ts) — when filtering silently
stops, that's the only file to open.

---

## Layout

| Path                        | Role                                                             |
| --------------------------- | ---------------------------------------------------------------- |
| `entrypoints/content.ts`    | Finds cards, hides them, watches for new ones                    |
| `entrypoints/background.ts` | The only thing that talks to the network; caches decisions       |
| `entrypoints/popup/`        | Rule input, on/off toggle, hidden count                          |
| `lib/feed/`                 | Selectors, extraction, hiding, the observer                      |
| `lib/policy.ts`             | Hide threshold and batch size — the two knobs worth turning      |
| `api/classify.ts`           | Vercel function: builds the Jev questions, returns probabilities |

Extending it is meant to be boring: add a surface (search, watch-page sidebar) by adding
selectors; change the judgment by editing one function; retune by changing one constant.

---

## Running it

```sh
npm install
cp .env.example .env     # fill in the four values
npm run build
```

Then load `.output/chrome-mv3` at `chrome://extensions` with Developer mode on.

### Deploying the backend

The extension never holds the TypeSafe key — a single Vercel function does.

```sh
npx vercel
npx vercel env add TYPESAFE_API_KEY  production
npx vercel env add JEV_SHARED_SECRET production
npx vercel --prod
```

Set `WXT_CLASSIFY_URL` in `.env` to your deployment's `/api/classify` and rebuild. The manifest's
host permission is derived from that same variable, so localhost and production need no manifest
edit. Smoke test:

```sh
curl -s -X POST "$WXT_CLASSIFY_URL" \
  -H "x-jev-secret: $JEV_SHARED_SECRET" -H 'content-type: application/json' \
  -d '{"rule":"no clickbait","videos":[{"videoId":"a1","title":"I Ate Beige Food For 30 Days (GONE WRONG)","channel":"PrankLord"}]}'
```

### Commands

| Command           | What it does                                    |
| ----------------- | ----------------------------------------------- |
| `npm run dev`     | Chrome with the extension loaded, hot reloading |
| `npm run build`   | Production build into `.output/`                |
| `npm run compile` | `tsc --noEmit`                                  |
| `npm run format`  | Prettier                                        |

---

## Known limits

- **Home feed only.** Search results and watch-page recommendations are untouched. The
  indirection to add them is in place; the selectors aren't.
- **Shorts and shelves are left alone** — only regular feed videos are judged.
- **The shared secret ships inside the extension bundle**, so it's a speed bump against casual
  scraping, not authentication. Per-IP rate limiting is the fix if the endpoint is ever abused.
- **Judgment uses title and channel only.** No description, no transcript, no thumbnail.
- **It fails open.** A broken backend, an expired key, an unreachable worker — every one of them
  leaves the feed exactly as YouTube served it. A filter that eats your feed when it breaks is
  worse than no filter.

## License

MIT
