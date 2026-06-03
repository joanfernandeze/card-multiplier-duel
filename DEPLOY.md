# Deploying Card Multiplier Duel

This is a static Vite + React app. No backend, no environment variables. It deploys to Vercel as a static site and installs on phones as a PWA.

## 1. Test the build locally first

```bash
npm install      # if you haven't already
npm run build    # should finish with no errors and create dist/
npm run preview  # serves the production build at http://localhost:4173
```

Open the preview URL and click through: deck select → How to Play → a Solo game and a Bot duel. Confirm the feedback button opens your mail app.

## 2. Push to GitHub

```bash
git init                 # only if this isn't a repo yet
git add .
git commit -m "Card Multiplier: tutorial, feedback, PWA, deploy config"
# create an empty repo on github.com first, then:
git remote add origin https://github.com/<your-username>/card-multiplier-duel.git
git branch -M main
git push -u origin main
```

`node_modules` and `dist` are already in `.gitignore`, so they won't be committed.

## 3. Connect to Vercel (web deploy)

1. Go to https://vercel.com and sign in with GitHub.
2. **Add New → Project**, then import the `card-multiplier-duel` repo.
3. Vercel auto-detects Vite. Leave the defaults (Build = `npm run build`, Output = `dist`). `vercel.json` in the repo already pins these.
4. Click **Deploy**. In ~1 minute you get a live URL like `https://card-multiplier-duel.vercel.app`.

Every future `git push` to `main` auto-deploys. Pull requests get their own preview URLs — handy for testing changes before they go live.

## 4. On the phone (PWA)

Once it's live on the HTTPS Vercel URL, it's installable:

- **Android / Chrome:** open the URL → menu (⋮) → **Add to Home screen** / **Install app**.
- **iPhone / Safari:** open the URL → Share → **Add to Home Screen**.

It then launches full-screen like a native app and works offline after the first load.

## Optional: pixel-perfect PNG icons

The app ships a scalable **SVG** app icon (`public/icon.svg`), which Chrome/Android use directly. For the crispest icon on every platform (especially older iOS), you can generate PNGs locally and they'll be picked up automatically:

```bash
npx pwa-asset-generator public/icon.svg public --icon-only --opaque false --padding "0"
```

Then add the generated `<link rel="apple-touch-icon" ...>` / manifest `icons` entries it prints. This step is entirely optional — the app installs fine without it.

## Notes
- Feedback goes to **jfernandez@venair.com** via a `mailto:` link. To change it, edit `FEEDBACK_EMAIL` near the bottom of `src/App.jsx`.
- The tutorial auto-shows once per browser (stored in `localStorage`); the **? HOW TO PLAY** button on the home screen reopens it any time.
- The service worker only registers in production builds, so local `npm run dev` HMR is unaffected.
