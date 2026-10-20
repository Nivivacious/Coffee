# A Tale of Two Cities

52 playing cards about Bangalore and New York, and two Jokers about the people who live in both.
*For anyone whose phone shows two clocks.*

A static site with three small Vercel functions. No build step.

## Put it live

1. On [vercel.com](https://vercel.com), choose **Add New → Project** and import this repo.
2. Set **Framework Preset** to **Other**. Leave the build command empty and the root as `./`. Click **Deploy**.
3. In the project, open **Storage → Upstash for Redis**, create a free database and connect it to the project. Then **redeploy**. The visitor count and the "Your turn" board start working.

## Optional settings (Project → Settings → Environment Variables)

| Name | What it does |
|---|---|
| `ADMIN_KEY` | Any long secret. Lets you read local-check notes and remove pairings (see below). |
| `RESEND_API_KEY` | From [resend.com](https://resend.com). Emails you each local-check note. |
| `FEEDBACK_TO` | The address those emails go to. It stays in Vercel's settings, never in this repo or the site. |
| `FEEDBACK_FROM` | Optional sender, once you've verified a domain in Resend. |

Read the latest notes:

```
curl -H "x-admin-key: YOUR_ADMIN_KEY" https://YOUR-SITE.vercel.app/api/feedback
```

Remove a pairing (the `key` is in the `/api/pairings` list):

```
curl -X DELETE -H "x-admin-key: YOUR_ADMIN_KEY" "https://YOUR-SITE.vercel.app/api/pairings?key=THE_KEY"
```

## What's where

- `index.html`: the page
- `cards.js`, `deck/*.js`: every card, drawn in SVG
- `copy.js`: titles, lines and descriptions for every card
- `sound.js`: each card's soundtrack, made live in the browser
- `print/`: print-ready PDFs
- `api/`: visitor count, pairings and votes, local-check notes
