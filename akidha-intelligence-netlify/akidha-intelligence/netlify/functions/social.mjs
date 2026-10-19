// Public Reddit topic research for Akidha Intelligence.
// Uses public search JSON only; access can be restricted/rate-limited by Reddit.
// No usernames are stored. Results are research signals, not representative evidence.
const QUERIES = [
  { q: '"medicine cost" India', theme: 'cost', topic: 'Medicine prices & affordability' },
  { q: '"medicine prices" India', theme: 'cost', topic: 'Medicine prices & affordability' },
  { q: '"generic medicine" India', theme: 'trust', topic: 'Substitutes, generics & trust' },
  { q: '"medicine substitute" India', theme: 'confusion', topic: 'Substitutes & switching questions' },
  { q: '"brand vs generic" medicine', theme: 'confusion', topic: 'Substitutes, generics & trust' },
  { q: 'diabetes medicine cost', theme: 'chronic', topic: 'Diabetes & long-term care' },
  { q: 'diabetes medication India', theme: 'chronic', topic: 'Diabetes & long-term care' },
  { q: 'blood pressure medicine cost', theme: 'chronic', topic: 'Blood pressure & cardiac care' },
  { q: 'hypertension medicine price', theme: 'chronic', topic: 'Blood pressure & cardiac care' },
  { q: 'monthly medicines chronic illness cost', theme: 'cost', topic: 'Chronic care & recurring costs' },
  { q: 'online pharmacy trust India medicines', theme: 'trust', topic: 'Online pharmacy & quality trust' },
  { q: 'pharmacist doctor prescription medicine question', theme: 'questions', topic: 'Patient questions & medicine literacy' },
  { q: 'thyroid medicine cost India', theme: 'chronic', topic: 'Thyroid & long-term care' },
  { q: 'medicine alternatives affordability', theme: 'cost', topic: 'Affordability & alternatives' }
];
const headers = { 'user-agent': 'AkidhaIntelligence/1.0 (public topic research; contact: site owner)' };
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
const clean = (value, max = 1600) => String(value || '').replace(/\u0000/g, '').trim().slice(0, max);
function inferIntent(text) {
  if (/\b(should i|can i|is it safe|anyone know|what is|how do i|does anyone|which one|recommend|suggest)\b/i.test(text)) return 'Question';
  if (/\b(experience|my doctor|i take|i use|i switched|i paid|for me|in my experience)\b/i.test(text)) return 'Personal experience';
  if (/\b(why|because|research|study|evidence|explained|found that|according to)\b/i.test(text)) return 'Knowledge / explanation';
  return 'Discussion / opinion';
}
function scoreSignal(post, query) {
  const text = `${post.title || ''} ${post.selftext || ''}`.toLowerCase();
  let score = 35;
  if (/substitut|generic|alternative|same molecule|brand name/.test(text)) score += 20;
  if (/price|cost|expensive|afford|monthly|save|bill/.test(text)) score += 18;
  if (/diabetes|diabetic|blood pressure|hypertension|thyroid|cholesterol|cardiac|chronic/.test(text)) score += 15;
  if (/doctor|pharmacist|manufacturer|quality|fake|counterfeit|trust/.test(text)) score += 12;
  if ((post.num_comments || 0) >= 10) score += 5;
  if (query.theme === 'other') score -= 5;
  return Math.max(0, Math.min(100, score));
}
async function getJson(url, timeout = 6500) {
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(timeout) });
  if (!response.ok) throw new Error(`Reddit returned HTTP ${response.status}`);
  return response.json();
}
async function commentsFor(permalink) {
  try {
    const url = `https://www.reddit.com${permalink}.json?sort=top&limit=3&depth=1`;
    const data = await getJson(url, 4500);
    const children = data?.[1]?.data?.children || [];
    return children.filter(x => x.kind === 't1' && x.data?.body && !x.data?.stickied)
      .slice(0, 3).map(x => clean(x.data.body, 500));
  } catch { return []; }
}
export default async (req) => {
  if (req.method !== 'GET') return json({ error: 'Method not allowed' }, 405);
  const url = new URL(req.url);
  const requested = clean(url.searchParams.get('q'), 120);
  const selected = requested
    ? [{ q: requested, theme: 'other', topic: 'Custom search' }]
    : QUERIES;
  const items = [];
  const errors = [];
  let cursor = 0;
  // Keep concurrency low to reduce load and avoid aggressive scraping.
  async function worker() {
    while (cursor < selected.length) {
      const query = selected[cursor++];
      try {
        const endpoint = `https://www.reddit.com/search.json?q=${encodeURIComponent(query.q)}&sort=new&t=month&limit=12&type=link`;
        const data = await getJson(endpoint);
        for (const entry of data?.data?.children || []) {
          const post = entry.data || {};
          if (!post.title || !post.permalink || post.over_18) continue;
          const text = `${post.title} ${post.selftext || ''}`;
          if (/\b(dose for me|what dose should|diagnose me|prescribe me)\b/i.test(text)) continue;
          const item = {
            id: `reddit:${post.id}`,
            title: clean(post.title, 300),
            source: 'Reddit · public search',
            community: clean(post.subreddit_name_prefixed || (post.subreddit ? `r/${post.subreddit}` : 'Reddit'), 100),
            date: post.created_utc ? new Date(post.created_utc * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recent',
            timestamp: post.created_utc || 0,
            theme: query.theme,
            topic: query.topic,
            intent: inferIntent(text),
            summary: clean(post.selftext || 'No post body was available. Open the original discussion for context.', 1600),
            url: `https://www.reddit.com${post.permalink}`,
            score: scoreSignal(post, query),
            upvotes: Number(post.score || 0),
            commentCount: Number(post.num_comments || 0),
            comments: [],
            isSample: false,
            signalNote: 'Anecdotal public discussion; not medical evidence or a representative patient survey.'
          };
          items.push(item);
        }
      } catch (error) {
        errors.push(`${query.q}: ${error.message}`);
      }
    }
  }
  await Promise.all([worker(), worker(), worker()]);
  const unique = [...new Map(items.map(item => [item.id, item])).values()]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 35);
  // Fetch a few top comments only for the most relevant posts. Comments are context, not evidence.
  const commentTargets = [...unique].sort((a, b) => b.score - a.score).slice(0, 8);
  await Promise.all(commentTargets.map(async item => { item.comments = await commentsFor(new URL(item.url).pathname); }));
  const summary = {
    total: unique.length,
    questions: unique.filter(x => x.intent === 'Question').length,
    experience: unique.filter(x => x.intent === 'Personal experience').length,
    knowledge: unique.filter(x => x.intent === 'Knowledge / explanation').length,
    themes: [...new Set(unique.map(x => x.topic))]
  };
  return json({
    items: unique,
    summary,
    errors: errors.slice(0, 6),
    fetchedAt: new Date().toISOString(),
    message: unique.length ? '' : 'Reddit did not return results. Public search access may be rate-limited or restricted. Try again later or configure an approved Reddit API integration.',
    note: 'Public Reddit results are incomplete and self-selected. Do not infer medical consensus, identify individual patients, or treat posts/comments as medical evidence.'
  });
};
export const config = { path: '/.netlify/functions/social' };
