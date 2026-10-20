/* Akidha Marketing OS unified workspace layer.
   UI shell for strategy, intelligence, research, creative, execution and learning.
   Demo records are local-only until the shared Apps Script API adapter is configured. */
(function () {
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const KEY = "akidha-marketing-os-v1";
  const plusDays = n => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0,10); };
  const seed = {
    tasks: [
      {id:"t1", title:"Build substitute-trust carousel", owner:"Nikita", status:"In review", priority:"High", due:plusDays(0), pillar:"Trust & transparency", doc:""},
      {id:"t2", title:"Edit pharmacist explainer reel", owner:"Sai", status:"In progress", priority:"High", due:plusDays(1), pillar:"Medicine education", doc:""},
      {id:"t3", title:"Review creative performance", owner:"Tanvi", status:"To do", priority:"Medium", due:plusDays(2), pillar:"Performance learning", doc:""},
      {id:"t4", title:"Research audience questions", owner:"Saurabh", status:"To do", priority:"Medium", due:plusDays(3), pillar:"Audience intelligence", doc:""}
    ],
    intelligence: [
      {type:"Research hypothesis", title:"Substitute-related uncertainty is a content opportunity", detail:"Validate recurring questions about doctor approval, molecule names, manufacturer information and pharmacist checks. Public posts are qualitative signals, not representative research.", source:"Research Radar · hypothesis"},
      {type:"Creative recommendation", title:"Explain the verification process before discussing savings", detail:"Test a process-led carousel against a savings-led opening. Measure qualified inquiries, not reach alone.", source:"Akidha strategy · recommendation"},
      {type:"Compliance watch", title:"Medical and comparative claims need evidence", detail:"Flag safety, efficacy, quality, equivalence and savings claims for evidence and human review.", source:"Brand guardrails · review required"}
    ],
    goals: [
      {name:"Qualified WhatsApp inquiries", actual:34, target:50, unit:"inquiries"},
      {name:"Cost per qualified lead", actual:420, target:350, unit:"₹"},
      {name:"Approved education creatives", actual:7, target:12, unit:"creatives"}
    ],
    learnings: [], view:"command"
  };
  let state;
  try { state = Object.assign({}, seed, JSON.parse(localStorage.getItem(KEY) || "{}")); } catch (_) { state = seed; }
  state.tasks = state.tasks || seed.tasks; state.intelligence = state.intelligence || seed.intelligence;
  state.goals = state.goals || seed.goals; state.learnings = state.learnings || [];
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const save = () => localStorage.setItem(KEY, JSON.stringify(state));
  const fmt = s => new Date(s + "T12:00:00").toLocaleDateString("en-IN",{day:"numeric",month:"short"});
  const headings = {
    command:["Command center","One connected view of strategy, intelligence, production and outcomes."],
    intelligence:["AI intelligence","Source-aware recommendations, grounded in brand strategy and measured performance."],
    research:["Research radar","Collect signals, preserve sources, and distinguish evidence from hypotheses."],
    creative:["Creative intelligence","Turn audience problems and strategic pillars into platform-native creative tests."],
    execution:["Tasks & calendar","Board and calendar views of the same work, including approval artifacts."],
    team:["Team workload","Capacity, assignments, overdue work and completed tasks by person."],
    learning:["Learning loop","Capture results and feed approved lessons into the next planning cycle."]
  };
  function addShell() {
    const nav = $(".nav"), main = $(".main-content");
    if (!nav || !main || $("#os-nav-group")) return;
    const group = document.createElement("div"); group.id = "os-nav-group";
    group.innerHTML = '<div class="workspace-label" style="margin-top:22px">MARKETING OS</div>' +
      [["command","Command center"],["intelligence","AI intelligence"],["research","Research radar"],["creative","Creative intelligence"],["execution","Tasks & calendar"],["team","Team workload"],["learning","Learning loop"]].map(x => '<button class="nav-item" data-os-view="' + x[0] + '"><span class="nav-icon">◫</span>' + x[1] + '</button>').join("");
    nav.after(group);
    const section = document.createElement("section"); section.id = "os-workspace"; section.className = "view";
    section.innerHTML = '<div class="page-heading"><div><div class="eyebrow">AKIDHA · MARKETING OPERATING SYSTEM</div><h1 id="os-title">Command center</h1><p class="lede" id="os-subtitle"></p></div><button class="button button-primary" id="os-new-task">＋ New task</button></div><div id="os-content"></div><div class="os-modal-backdrop" id="os-task-modal" hidden><section class="os-modal" role="dialog" aria-modal="true" aria-labelledby="os-task-modal-title"><div class="os-modal-head"><div><div class="eyebrow">WORK MANAGEMENT</div><h2 id="os-task-modal-title">Create a task</h2><p>Give the work a clear owner and next step.</p></div><button type="button" class="os-modal-close" id="os-task-close" aria-label="Close">×</button></div><form id="os-task-form" class="os-task-form"><label>Task title<input name="title" required maxlength="140" placeholder="e.g. Draft substitute-trust carousel"></label><div class="os-form-grid"><label>Owner<select name="owner"><option>Nikita</option><option>Sai</option><option>Tanvi</option><option>Saurabh</option></select></label><label>Priority<select name="priority"><option>Medium</option><option>High</option><option>Low</option></select></label><label>Due date<input type="date" name="due" required value="' + plusDays(2) + '"></label><label>Workstream<select name="pillar"><option>Medicine education</option><option>Trust & transparency</option><option>Audience intelligence</option><option>Performance learning</option><option>General</option></select></label></div><label>Work document link <span class="os-optional">Optional</span><input name="doc" type="url" placeholder="https://docs.google.com/..."></label><div class="os-modal-actions"><button type="button" class="button button-secondary" id="os-task-cancel">Cancel</button><button type="submit" class="button button-primary">Create task</button></div></form></section></div>';
    main.append(section);
    $$("[data-os-view]").forEach(b => b.addEventListener("click", () => show(b.dataset.osView)));
    $("#os-new-task").addEventListener("click", newTask);
    $("#os-task-close").addEventListener("click", closeTaskModal);
    $("#os-task-cancel").addEventListener("click", closeTaskModal);
    $("#os-task-modal").addEventListener("click", e => { if (e.target.id === "os-task-modal") closeTaskModal(); });
    $("#os-task-form").addEventListener("submit", saveNewTask);
    render();
    show(state.view || "command");
  }
  function show(v) {
    state.view = v; save();
    $$(".view").forEach(x => x.classList.toggle("active", x.id === "os-workspace"));
    $$(".nav-item[data-view]").forEach(x => x.classList.remove("active"));
    $$("[data-os-view]").forEach(x => x.classList.toggle("active", x.dataset.osView === v));
    $("#crumb-current").textContent = "Marketing OS / " + headings[v][0];
    $("#os-title").textContent = headings[v][0]; $("#os-subtitle").textContent = headings[v][1];
    render(); window.scrollTo({top:0,behavior:"smooth"});
  }
  function panel(title, body) { return '<article class="panel"><div class="panel-heading"><div><h3>' + title + '</h3></div></div>' + body + '</article>'; }
  function task(t) { return '<div class="signal-row"><span class="source-icon">▦</span><div class="signal-copy" style="flex:1"><h4>' + esc(t.title) + '</h4><div class="signal-meta">' + esc(t.owner) + ' · ' + esc(t.status) + ' · Due ' + fmt(t.due) + '</div>' + (t.doc ? '<a target="_blank" rel="noopener" href="' + esc(t.doc) + '">Open work ↗</a>' : '') + '</div><span class="tag">' + esc(t.priority) + '</span></div>'; }
  function command() {
    const stats = [["Active tasks",state.tasks.filter(t=>t.status!=="Done").length],["Awaiting approval",state.tasks.filter(t=>t.status==="Awaiting approval").length],["Intelligence signals",state.intelligence.length],["Learning records",state.learnings.length]];
    return '<div class="notice notice-muted"><span class="notice-icon">i</span><div><b>Preview data — not live business metrics</b><span>Tasks, goals and recommendations on this screen are illustrative examples saved in this browser. Shared team data and live performance reporting are not connected yet.</span></div></div><div class="stats-grid">' + stats.map(x=>'<article class="stat-card"><div class="stat-top"><span>'+x[0]+'</span></div><div class="stat-number">'+x[1]+'</div><div class="stat-caption">Illustrative local records</div></article>').join("") + '</div><div class="lower-grid">'
      panel("AI brief for today",state.intelligence.slice(0,2).map(i=>'<div class="signal-row"><span class="source-icon">✳</span><div class="signal-copy"><h4>'+esc(i.title)+'</h4><p>'+esc(i.detail)+'</p><div class="signal-meta">'+esc(i.source)+'</div></div></div>').join("")) +
      panel("Goal progress",state.goals.map(g=>'<div style="padding:12px 0"><div style="display:flex;justify-content:space-between"><b>'+esc(g.name)+'</b><span>'+g.actual+' / '+g.target+' '+esc(g.unit)+'</span></div><div style="height:7px;background:#e8ebe4;border-radius:8px;margin-top:8px"><div style="height:100%;width:'+Math.min(100,Math.round(g.actual/g.target*100))+'%;background:#64836e;border-radius:8px"></div></div></div>').join("")) +
      '</div>' + panel("Priority work",state.tasks.map(task).join(""));
  }
  function intelligence() {
    return '<div class="notice"><span class="notice-icon">i</span><div><b>Human-approved intelligence</b><span>AI may recommend and draft; it does not publish, approve medical claims, or change plans without human approval. Entries below are illustrative until live source/model connections are configured.</span></div></div><div class="focus-grid">' +
      state.intelligence.map((i,n)=>'<article class="focus-card"><div class="focus-top"><span class="tag">'+esc(i.type)+'</span></div><h3>'+esc(i.title)+'</h3><p>'+esc(i.detail)+'</p><div class="card-bottom"><span class="audience">'+esc(i.source)+'</span><button class="mini-link" data-promote="'+n+'">Promote to task →</button></div></article>').join("") +
      '</div>' + panel("Intelligence loop",'<ol><li>Retrieve brand strategy, approved claims, research, past creatives, goals and results.</li><li>Analyze source-linked signals and label facts, inferences and hypotheses separately.</li><li>Generate platform-native opportunities and flag medical claims for review.</li><li>Human approval turns an opportunity into a brief or task.</li><li>Measured results and feedback feed the next cycle.</li></ol>');
  }
  function research() {
    return '<div class="notice notice-muted"><span class="notice-icon">i</span><div><b>Research signals, not medical evidence</b><span>Prioritize official sources and reputable reporting for factual claims. Public discussions are qualitative and may be incomplete.</span></div></div><div class="toolbar"><input id="os-research-query" class="search-input" placeholder="Research topic, e.g. trust in medicine substitutes"><button id="os-research-run" class="button button-primary">Create research brief</button></div>' + panel("Research queue",state.intelligence.filter(i=>i.type!=="Creative recommendation").map(i=>'<div class="signal-row"><div class="signal-copy"><h4>'+esc(i.title)+'</h4><p>'+esc(i.detail)+'</p><div class="signal-meta">'+esc(i.source)+'</div></div></div>').join("")) + '<p class="signal-meta">Live collection and historical persistence require configured source functions and shared storage.</p>';
  }
  function creative() {
    const pillars=[["Medicine education","Explain labels, molecules and questions to ask a clinician.","Instagram carousel / YouTube explainer"],["Trust & process transparency","Show what doctor verification and pharmacist review mean in practice.","Reel / Facebook explainer"],["Caregiver support","Help families organize prescriptions, refills and questions.","Checklist / regional-language video"],["Objection handling","Address quality concerns calmly with evidence and clear limitations.","FAQ / short video"]];
    return '<div class="notice notice-muted"><span class="notice-icon">AI</span><div><b>AI draft generator</b><span>Uses the configured server-side OpenAI key. Generated copy is an editable draft, not medical evidence or approval.</span></div></div><form id="os-ai-form" class="panel" style="display:grid;gap:12px"><label>Topic or audience question<textarea name="topic" class="search-input" rows="3" required maxlength="5000" placeholder="e.g. How can patients discuss medicine substitutes with their pharmacist?"></textarea></label><div class="os-form-grid"><label>Format<select name="platform"><option>Instagram carousel</option><option>Instagram Reel</option><option>Facebook post</option><option>WhatsApp educational message</option><option>Blog explainer</option></select></label><label>Goal<select name="goal"><option>Educate and reassure</option><option>Explain trust and verification</option><option>Answer a common question</option><option>Encourage a pharmacist discussion</option></select></label></div><button class="button button-primary" id="os-ai-generate" type="submit">Generate draft with GPT</button><div id="os-ai-status" class="signal-meta" role="status"></div><div id="os-ai-result"></div></form><div class="focus-grid">'+pillars.map(p=>'<article class="focus-card"><span class="tag">CONTENT PILLAR</span><h3>'+p[0]+'</h3><p>'+p[1]+'</p><div class="card-bottom"><span class="audience">'+p[2]+'</span><button class="mini-link" data-pillar="'+esc(p[0])+'">Create task →</button></div></article>').join("")+'</div>'+panel("Creative test standards",'<ul><li>Match the concept to a real audience concern, not a generic trend.</li><li>Adapt content to each platform instead of copying one post everywhere.</li><li>Record audience, hook, format, CTA, hypothesis, metric and result.</li><li>Require evidence and human review for medical, quality and comparative claims.</li></ul>');
  }
  function execution() {
    const statuses=["To do","In progress","In review","Awaiting approval","Done"];
    return '<div class="toolbar"><button id="os-board" class="button button-secondary">Board</button><button id="os-calendar" class="button button-secondary">Calendar · 14 days</button><button id="os-task-add" class="button button-primary">＋ New task</button></div><div id="os-task-view"></div>'+panel("Approval submissions",'<p>Team members attach Google Docs, Sheets, Word or Excel links when submitting work. Reviewers open the linked file and approve or return the task with feedback. File access follows the original file-sharing permissions.</p>');
  }
  function board() {
    const statuses=["To do","In progress","In review","Awaiting approval","Done"];
    $("#os-task-view").innerHTML='<div class="focus-grid" style="grid-template-columns:repeat(3,minmax(0,1fr))">'+statuses.map(s=>'<article class="panel"><h3>'+s+'</h3>'+state.tasks.filter(t=>t.status===s).map(t=>'<div class="focus-card" style="margin-top:10px"><b>'+esc(t.title)+'</b><p>'+esc(t.owner)+' · '+fmt(t.due)+'</p><select class="select-input" data-status="'+t.id+'">'+statuses.map(x=>'<option '+(x===t.status?'selected':'')+'>'+x+'</option>').join("")+'</select>'+(t.doc?'<p><a href="'+esc(t.doc)+'" target="_blank" rel="noopener">Open work ↗</a></p>':'')+'</div>').join("")+'</article>').join("")+'</div>';
    $("[data-status]").forEach(s=>s.addEventListener("change",()=>{const t=state.tasks.find(t=>t.id===s.dataset.status);t.status=s.value==="Done"?"Awaiting approval":s.value;save();board();if(s.value==="Done"){const note=document.createElement("div");note.className="notice notice-muted";note.setAttribute("role","status");note.innerHTML="<span class=\"notice-icon\">i</span><div><b>Admin approval required</b><span>This task was moved to Awaiting approval. An administrator must confirm completion.</span></div>";$("#os-task-view").prepend(note);}}));
  }
  function calendar() {
    const days=Array.from({length:14},(_,i)=>plusDays(i));
    $("#os-task-view").innerHTML='<div class="focus-grid" style="grid-template-columns:repeat(7,minmax(130px,1fr));overflow-x:auto">'+days.map(d=>'<article class="panel"><div class="eyebrow">'+new Date(d+"T12:00:00").toLocaleDateString("en-IN",{weekday:"short"})+'</div><h3>'+fmt(d)+'</h3>'+state.tasks.filter(t=>t.due===d).map(t=>'<div class="focus-card" style="margin-top:8px"><b>'+esc(t.title)+'</b><p>'+esc(t.owner)+' · '+esc(t.status)+'</p></div>').join("")+'</article>').join("")+'</div>';
  }
  function team() {
    const names=Array.from(new Set(["Tanvi","Nikita","Sai"].concat(state.tasks.map(t=>t.owner))));
    return '<div class="focus-grid">'+names.map(n=>{const ts=state.tasks.filter(t=>t.owner===n),done=ts.filter(t=>t.status==="Done").length,late=ts.filter(t=>t.status!=="Done"&&t.due<plusDays(0)).length;return '<article class="focus-card"><span class="tag">TEAM WORKLOAD</span><h3>'+esc(n)+'</h3><div class="stats-grid" style="grid-template-columns:repeat(3,minmax(0,1fr));gap:8px"><div><b>'+ts.length+'</b><p>Assigned</p></div><div><b>'+done+'</b><p>Completed</p></div><div><b>'+late+'</b><p>Overdue</p></div></div><p>'+ts.filter(t=>t.status!=="Done").length+' open task(s)</p></article>';}).join("")+'</div>';
  }
  function learning() {
    return '<div class="notice"><span class="notice-icon">↻</span><div><b>Close the loop</b><span>Every campaign should leave behind a documented learning, not just a metric screenshot.</span></div></div><form id="os-learning-form" class="panel" style="display:grid;gap:12px"><label>Campaign / creative<input required name="campaign" class="search-input" placeholder="e.g. Substitute trust carousel"></label><label>Observed result<textarea required name="observation" class="search-input" rows="3" placeholder="Metric, period and source"></textarea></label><label>Interpretation / hypothesis<textarea name="hypothesis" class="search-input" rows="3" placeholder="What might explain it? Mark uncertainty clearly."></textarea></label><label>Next test<textarea name="next" class="search-input" rows="2" placeholder="What will we test next?"></textarea></label><button class="button button-primary">Save learning record</button></form>'+panel("Recorded learnings",state.learnings.length?state.learnings.map(l=>'<div class="signal-row"><div class="signal-copy"><h4>'+esc(l.campaign)+'</h4><p><b>Observation:</b> '+esc(l.observation)+'</p><p><b>Hypothesis:</b> '+esc(l.hypothesis||"Not recorded")+'</p><p><b>Next test:</b> '+esc(l.next||"Not recorded")+'</p></div></div>').join(""):"<p>No learning records yet.</p>");
  }
  function newTask() {
    const modal = $("#os-task-modal");
    if (!modal) return;
    $("#os-task-form").reset();
    $('[name="due"]', modal).value = plusDays(2);
    modal.hidden = false;
    document.body.classList.add("os-modal-open");
    setTimeout(() => $('[name="title"]', modal).focus(), 30);
  }
  function closeTaskModal() {
    const modal = $("#os-task-modal");
    if (modal) modal.hidden = true;
    document.body.classList.remove("os-modal-open");
  }
  function saveNewTask(e) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget));
    const title = String(data.title || "").trim();
    if (!title) return;
    state.tasks.unshift({id:"t"+Date.now(),title,owner:data.owner || "Nikita",status:"To do",priority:data.priority || "Medium",due:data.due || plusDays(2),pillar:data.pillar || "General",doc:data.doc || ""});
    save();
    closeTaskModal();
    show("execution");
  }
  function render() {
    const c=$("#os-content"); if(!c)return; const v=state.view||"command";
    c.innerHTML=({command,intelligence,research,creative,execution,team,learning})[v]();
    if(v==="execution"){ $("#os-board").onclick=board;$("#os-calendar").onclick=calendar;$("#os-task-add").onclick=newTask;board(); }
    if(v==="learning")$("#os-learning-form").addEventListener("submit",e=>{e.preventDefault();state.learnings.unshift(Object.fromEntries(new FormData(e.target)));save();render();});
    if(v==="creative")$("#os-ai-form").addEventListener("submit",async e=>{e.preventDefault();const form=e.currentTarget;const data=Object.fromEntries(new FormData(form));const btn=$("#os-ai-generate"),status=$("#os-ai-status"),result=$("#os-ai-result");btn.disabled=true;btn.textContent="Generating…";status.textContent="Sending request to the configured AI endpoint…";result.innerHTML="";try{const response=await fetch("/.netlify/functions/draft",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(data)});const out=await response.json();if(!response.ok)throw new Error(out.error||"AI request failed");result.innerHTML='<article class="focus-card"><span class="tag">AI-GENERATED · REVIEW REQUIRED</span><h3>'+esc(out.title)+'</h3><label>Editable draft<textarea id="os-ai-copy" class="search-input" rows="9">'+esc(out.copy)+'</textarea></label>'+(out.flags&&out.flags.length?'<h4>Review flags</h4><ul>'+out.flags.map(x=>'<li>'+esc(x)+'</li>').join("")+'</ul>':'<p class="signal-meta">No review flags returned. Human verification is still required.</p>')+'<div class="os-modal-actions"><button type="button" class="button button-secondary" id="os-ai-save">Save as learning/task note</button><button type="button" class="button button-primary" id="os-ai-task">Create review task</button></div></article>';status.textContent="Draft generated. Verify all claims and sources before use.";$("#os-ai-save").onclick=()=>{const copy=$("#os-ai-copy").value;state.learnings.unshift({campaign:out.title,observation:"AI draft saved for review: "+copy,hypothesis:"AI-generated; not independently verified.",next:"Check sources and claims; obtain human approval before publication."});save();status.textContent="Saved to this browser's Learning Loop. It is not shared with the team.";};$("#os-ai-task").onclick=()=>{state.tasks.unshift({id:"t"+Date.now(),title:"Review AI draft: "+out.title,owner:"Tanvi",status:"To do",priority:"High",due:plusDays(2),pillar:"Content review",doc:""});save();show("execution");};}catch(err){status.textContent=err.message+" Configure OPENAI_API_KEY in Netlify environment variables and redeploy."; }finally{btn.disabled=false;btn.textContent="Generate draft with GPT";}});
    $$("[data-promote]").forEach(b=>b.onclick=()=>{const i=state.intelligence[Number(b.dataset.promote)];state.tasks.unshift({id:"t"+Date.now(),title:i.title,owner:"Saurabh",status:"To do",priority:"Medium",due:plusDays(2),pillar:i.type,doc:""});save();show("execution");});
    $$("[data-pillar]").forEach(b=>b.onclick=()=>{state.tasks.unshift({id:"t"+Date.now(),title:"Develop brief: "+b.dataset.pillar,owner:"Nikita",status:"To do",priority:"Medium",due:plusDays(3),pillar:b.dataset.pillar,doc:""});save();show("execution");});
    if(v==="research")$("#os-research-run").onclick=()=>{const q=$("#os-research-query").value.trim();if(!q)return;state.intelligence.unshift({type:"Research hypothesis",title:"Research brief: "+q,detail:"Define audience, research questions, official sources, public discussion queries and evidence standards. Collect URLs and timestamps before converting findings into claims.",source:"User-created brief"});save();render();};
  }
  document.addEventListener("DOMContentLoaded",addShell);
  if(document.readyState!=="loading")addShell();
})();