# YouTube Feed Customizer

**Describe the feed you want in plain English. Everything else disappears.**

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![WXT](https://img.shields.io/badge/WXT-Chrome_MV3-67D4F8)
![TypeSafe](https://img.shields.io/badge/Jev-System_One-6E56CF)
![License](https://img.shields.io/badge/license-MIT-green)

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

## Install

1. Download `youtube-feed-customizer-<version>-chrome.zip` from
   [Releases](../../releases/latest) and unzip it.
2. Go to `chrome://extensions`, turn on **Developer mode**, click **Load unpacked**, and pick
   the unzipped folder.
3. Click the extension icon → **Add a key** → paste a [TypeSafe](https://typesafe.ai) API key.
4. Type your rule in the popup, hit **Save**, and open YouTube.

The extension uses **your own** TypeSafe key, so the videos it looks at go to your account and
nobody else's. The key is stored in your browser's extension storage and read only by the
extension's background worker, which no web page can reach.

> Not on the Chrome Web Store, so Chrome won't auto-update it — grab a new zip when there's a
> release you want.

---

## How it works

```
┌──────────────┐  rule + on/off   ┌────────────────────┐  API key  ┌──────────────┐
│    popup     │ ───────────────▶ │  extension storage │ ◀──────── │   options    │
└──────────────┘                  └─────────┬──────────┘           └──────────────┘
                                            │
┌───────────────────────────────────────────▼────────────┐
│ content script (youtube.com)                           │
│  • reads title + channel off each feed card            │
│  • MutationObserver catches infinite scroll            │
│  • re-attach timer survives SPA navigation             │
│  • applies display:none to whatever fails the rule     │
└─────────────────────────┬──────────────────────────────┘
                          │  batched, deduped
┌─────────────────────────▼──────────────────────────────┐
│ background worker — the only thing on the network      │
│  • holds the key; no page context can reach it         │
│  • caches judgments by (rule, videoId)                 │
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

The model returns **probabilities, not decisions** — the hide threshold lives in the extension,
so retuning it is a one-constant change. Measured on a four-video sample against the rule above:

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

| Path                        | Role                                                        |
| --------------------------- | ----------------------------------------------------------- |
| `entrypoints/content.ts`    | Finds cards, hides them, watches for new ones               |
| `entrypoints/background.ts` | The only thing that talks to the network; caches decisions  |
| `entrypoints/popup/`        | Rule input, on/off toggle, hidden count                     |
| `entrypoints/options/`      | Where the API key is entered                                |
| `lib/judgment.ts`           | The question Jev is asked — the only definition of it       |
| `lib/feed/`                 | Selectors, extraction, hiding, the observer                 |
| `lib/policy.ts`             | Hide threshold and batch size — the two knobs worth turning |

Extending it is meant to be boring: add a surface (search, watch-page sidebar) by adding
selectors; change the judgment by editing one function; retune by changing one constant.

---

## Development

```sh
npm install
npm run dev      # Chrome with the extension loaded, hot reloading
```

| Command           | What it does                     |
| ----------------- | -------------------------------- |
| `npm run build`   | Production build into `.output/` |
| `npm run compile` | `tsc --noEmit`                   |
| `npm run format`  | Prettier                         |
| `npm run zip`     | Packaged extension for a release |

---

## Known limits

- **Home feed only.** Search results and watch-page recommendations are untouched. The
  indirection to add them is in place; the selectors aren't.
- **Shorts and shelves are left alone** — only regular feed videos are judged.
- **You need your own TypeSafe key.** There's no hosted backend, which means nothing to pay for
  and nothing to trust, but also no zero-setup install.
- **Judgment uses title and channel only.** No description, no transcript, no thumbnail.
- **It fails open.** A missing key, an expired key, a network error, an unreachable worker —
  every one of them leaves the feed exactly as YouTube served it. A filter that eats your feed
  when it breaks is worse than no filter.

## License

MIT
