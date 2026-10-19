# Akidha Intelligence — simple Netlify app

A no-database starter app for Akidha's daily healthcare news and content workflow. It uses static HTML/CSS/JavaScript, Netlify Functions for source fetching and optional AI drafts, and browser localStorage for drafts. No Supabase, Metabase, database, or build tool is required.

## What works
- Responsive private-workspace-style dashboard (note: this starter has no login/authentication; do not put confidential data in it or treat its URL as private).
- News radar via Google News RSS search feeds, fetched through a Netlify Function.
- Public social signal prototype using Reddit public search results; coverage is limited and can fail due to rate limits or source restrictions.
- AI content drafts through a Netlify Function if `OPENAI_API_KEY` is configured.
- Local draft editing, manual status approval, review flags, export/import JSON backup, and Markdown draft export.
- No automatic publishing.

## Deploy with GitHub + Netlify
1. Create a new GitHub repository and upload all files/folders from this project.
2. In Netlify, choose **Add new site → Import an existing project**, connect GitHub, and select the repository.
3. Build settings are in `netlify.toml`: publish directory `.`; command is a no-op.
4. Deploy the site. Netlify should discover the functions under `netlify/functions`.
5. Optional: in **Site configuration → Environment variables**, add `OPENAI_API_KEY`. Optional model override: `OPENAI_MODEL` (default `gpt-4o-mini`). Trigger a new deploy after setting variables.
6. Open the site and use **Refresh intelligence** to call the news and social functions. AI draft generation will use the API if the key is configured; otherwise it creates a clearly generic starter draft.

## Important limitations
- This is not authenticated. A Netlify URL is not private just because it is unlisted. Add Netlify site protection/access control before using it as a private internal tool, or keep the site on a controlled deployment.
- Without a database, drafts and approval statuses are stored only in the current browser's localStorage. They do not sync across devices and may be lost if browser storage is cleared. Export backups regularly.
- There is no scheduled daily collection in this version. Open the dashboard and refresh manually. A static site cannot retain daily collection results without a persistent store. Scheduled jobs could fetch and return current results, but preserving history requires storage.
- Public social data is not representative research and must not be treated as medical evidence. Respect source terms and access rules.
- AI output is a draft only. Verify all medicine, quality, regulatory, safety and pricing claims; do not publish automatically. Never use this app to provide individualized treatment advice.

## Files
- `index.html`, `styles.css`, `app.js`: frontend
- `netlify/functions/news.mjs`: RSS search feed collector
- `netlify/functions/social.mjs`: public Reddit search collector
- `netlify/functions/draft.mjs`: optional AI draft generation
- `netlify.toml`: Netlify configuration
