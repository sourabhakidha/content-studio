const QUERIES = [
  {q:'medicine cost India chronic',theme:'cost'},
  {q:'generic medicine India trust substitute',theme:'trust'},
  {q:'medicine substitute doctor India',theme:'confusion'},
  {q:'diabetes medicine India patient',theme:'care'}
];
export default async (req) => {
  if(req.method!=='GET')return new Response(JSON.stringify({error:'Method not allowed'}),{status:405,headers:{'content-type':'application/json'}});
  const items=[];const errors=[];
  await Promise.all(QUERIES.map(async q=>{try{const url='https://www.reddit.com/search.json?q='+encodeURIComponent(q.q)+'&sort=new&t=week&limit=8';const r=await fetch(url,{headers:{'user-agent':'web:akidha-intelligence:v1.0 (public topic research)'},signal:AbortSignal.timeout(7000)});if(!r.ok)throw new Error(`HTTP ${r.status}`);const data=await r.json();for(const post of data?.data?.children||[]){const p=post.data||{};if(!p.title||!p.permalink)continue;items.push({id:'reddit:'+p.id,title:p.title,source:'Reddit · public search',date:p.created_utc?new Date(p.created_utc*1000).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}):'Recent',theme:q.theme,summary:String(p.selftext||'Public discussion title only; open the source for context.').slice(0,380),url:'https://www.reddit.com'+p.permalink,isSample:false,signalNote:'Anecdotal public discussion; not medical evidence.'})}}catch(e){errors.push(`${q.q}: ${e.message}`)}}));
  const unique=[...new Map(items.map(x=>[x.id,x])).values()].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,30);
  return new Response(JSON.stringify({items:unique,errors,message:unique.length?'':'The public social source did not return results. Social coverage is limited to this configured public source.'}),{headers:{'content-type':'application/json; charset=utf-8','cache-control':'public, max-age=300'}});
};
export const config = { path: '/.netlify/functions/social' };
