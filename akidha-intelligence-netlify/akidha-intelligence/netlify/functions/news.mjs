const FEEDS = [
  {name:'Google News · Indian pharma', url:'https://news.google.com/rss/search?q=India+pharmaceutical+medicine+pricing+OR+chronic+care&hl=en-IN&gl=IN&ceid=IN:en'},
  {name:'Google News · medicine policy', url:'https://news.google.com/rss/search?q=India+medicine+drug+price+regulation+CDSCO+NPPA&hl=en-IN&gl=IN&ceid=IN:en'},
  {name:'Google News · patient access', url:'https://news.google.com/rss/search?q=India+chronic+disease+diabetes+hypertension+medicine+access&hl=en-IN&gl=IN&ceid=IN:en'}
];
const xmlDecode = s => String(s||'').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
function category(text){const t=text.toLowerCase();if(/npPA|price control|drug price|medicine price|affordab|cost of medicine|pricing/i.test(t))return'pricing';if(/cdsco|regulat|government|policy|notification|drug approval|safety alert|recall/i.test(t))return'regulation';if(/diabetes|hypertension|thyroid|cardiac|cholesterol|chronic|patient care/i.test(t))return'chronic';return'industry'}
export default async (req) => {
  if(req.method!=='GET')return new Response(JSON.stringify({error:'Method not allowed'}),{status:405,headers:{'content-type':'application/json'}});
  const results=[];const errors=[];
  await Promise.all(FEEDS.map(async feed=>{try{const r=await fetch(feed.url,{headers:{'user-agent':'AkidhaIntelligence/1.0 (RSS reader)'},signal:AbortSignal.timeout(8000)});if(!r.ok)throw new Error(`HTTP ${r.status}`);const xml=await r.text();const entries=[...xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)].slice(0,12);for(const m of entries){const x=m[0];const get=(tag)=>{const hit=x.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`,'i'));return hit?xmlDecode(hit[1]):''};const title=get('title');const link=get('link')||((x.match(/<link\s+href=["']([^"']+)/i)||[])[1]||'');const description=get('description');const pubDate=get('pubDate');if(!title||!link)continue;results.push({id:link,title,source:feed.name,date:pubDate?new Date(pubDate).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}):'Date not provided',category:category(`${title} ${description}`),summary:description.slice(0,500)||'Open the source to read the full report.',url:link,isSample:false})}}catch(e){errors.push(`${feed.name}: ${e.message}`)}}));
  const unique=[...new Map(results.map(x=>[x.url,x])).values()].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,30);
  return new Response(JSON.stringify({items:unique,errors,message:unique.length?'':'No live feed results could be loaded. Check source availability and try again.'}),{headers:{'content-type':'application/json; charset=utf-8','cache-control':'public, max-age=300'}});
};
export const config = { path: '/.netlify/functions/news' };
