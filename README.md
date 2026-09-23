# YouTube Feed Customizer

**Describe the feed you want in plain English. Everything else disappears.**

![License](https://img.shields.io/badge/license-MIT-green)

YouTube's home feed is whatever the recommendation engine decides it is. This extension puts one
sentence in front of it:

> _No reaction videos, drama commentary, or clickbait. I want substantial stuff about
> programming, systems, and music._

Every video on your home feed is judged against that rule and the ones that don't fit are
removed before you see them — including the videos infinite scroll loads twenty minutes later.

No keyword lists, no channel blocklists, no training. Just a sentence you can rewrite whenever
your taste changes.

---

## Install

1. Download `youtube-feed-customizer-<version>-chrome.zip` from
   [the latest release](../../releases/latest) and unzip it.
2. Open `chrome://extensions` and turn on **Developer mode** (top right).
3. Click **Load unpacked** and select the unzipped folder.
4. Click the extension icon → **Add a key** → paste a [TypeSafe](https://typesafe.ai) API key.
5. Type your rule, hit **Save**, and open YouTube.

Because it isn't on the Chrome Web Store, Chrome won't update it for you — download a new zip
when there's a release you want.

---

## Using it

Click the extension icon any time to change your rule, or to switch filtering off without
uninstalling anything. Changes apply to an open feed immediately; there's no need to reload the
page. The popup shows how many videos it's hiding on the tab behind it.

**Rules work best when they describe the feed you want, not just the things you hate.** Both
halves are understood, and you can mix them freely:

> _Nothing about cryptocurrency or day trading._

> _I want documentaries, long-form interviews, and anything about architecture. No podcast
> clips._

> _No thumbnails-with-shocked-faces bait. More live music, fewer studio recordings._

Vague moods work too — _"nothing that feels like homework"_ — though the more concrete you are,
the more predictable the result. If something is being hidden that you wanted, adding an
explicit exception to your rule usually fixes it.

---

## Your API key

The extension uses **your own** TypeSafe key, so the videos it looks at go to your account and
nobody else's. There's no server in the middle and nothing to sign up for beyond TypeSafe
itself.

The key is stored in your browser's extension storage and read only by the extension's
background worker, which no web page — including YouTube — can reach. Only the title and channel
name of each video are ever sent.

---

## Known limits

- **Home feed only.** Search results and watch-page recommendations are untouched.
- **Shorts and shelves are left alone** — only regular feed videos are judged.
- **You need your own TypeSafe key.** Nothing to pay a middleman for, but not a zero-setup
  install either.
- **Judgment uses the video title and channel only.** No description, no transcript, no
  thumbnail.
- **It fails open.** A missing key, an expired key, or a network error leaves your feed exactly
  as YouTube served it. A filter that eats your feed when it breaks is worse than no filter.

---

## License

MIT.
