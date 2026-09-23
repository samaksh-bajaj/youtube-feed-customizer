# YouTube Feed Customizer

Filter your YouTube home feed with a rule written in plain English.

Type something like *"no reaction videos or drama commentary"* into the extension popup. Every
video on your home feed — including the ones infinite scroll loads later — gets judged against
that rule by [Jev](https://docs.typesafe.ai), and the ones that don't fit are removed before you
see them.

## Development

```sh
npm install
npm run dev     # opens Chrome with the extension loaded
```

## Deploying the backend

The extension never holds the TypeSafe key — a single Vercel function does.

```sh
npx vercel                       # link the project and deploy
npx vercel env add TYPESAFE_API_KEY     production
npx vercel env add JEV_SHARED_SECRET    production
npx vercel --prod                # redeploy with the variables in place
```

`JEV_SHARED_SECRET` is any random string you choose (`openssl rand -hex 16`). The extension
sends it as an `x-jev-secret` header so the endpoint isn't open to anyone who finds the URL.
It ships inside the extension bundle, so treat it as a speed bump, not authentication.

Then copy `.env.example` to `.env` and fill in `WXT_CLASSIFY_URL` (your deployment's
`/api/classify`) and `WXT_JEV_SHARED_SECRET` (the same random string) before building.

Smoke test a deployment:

```sh
curl -s -X POST "$WXT_CLASSIFY_URL" \
  -H "x-jev-secret: $JEV_SHARED_SECRET" -H 'content-type: application/json' \
  -d '{"rule":"no clickbait","videos":[{"videoId":"a1","title":"I Ate Beige Food For 30 Days (GONE WRONG)","channel":"PrankLord"}]}'
```
