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
    execution:["Workspace","Tasks, goals, owners, priorities, approvals and deadlines in one place."],
    creative:["Content opportunities","Turn audience needs and strategy into specific, testable content concepts."],
    research:["Content radar","Reddit, social conversations, trends and Indian healthcare/pharma news."],
    intelligence:["AI intelligence","Brand-aware analysis and recommendations with evidence and human-review flags."],
    calendar:["Calendar","A single timeline for tasks, content production and deadlines."]
  };
  function addShell() {
    const nav = $(".nav"), main = $(".main-content");
    if (!nav || !main || $("#os-nav-group")) return;
    const group = document.createElement("div"); group.id = "os-nav-group";
    group.innerHTML = '<div class="workspace-label" style="margin-top:22px">AKIDHA WORKSPACE</div>' +
      [["execution","Workspace","▦"],["creative","Content opportunities","✳"],["research","Content radar","↗"],["intelligence","AI intelligence","✧"],["calendar","Calendar","▤"]].map(x => '<button class="nav-item os-nav-item" data-os-view="' + x[0] + '"><span class="nav-icon">'+x[2]+'</span>' + x[1] + '</button>').join("");
    nav.after(group);
    const section = document.createElement("section"); section.id = "os-workspace"; section.className = "view";
    section.innerHTML = '<div class="os-hero"><div><div class="eyebrow">AKIDHA · MARKETING OPERATING SYSTEM</div><h1 id="os-title">Workspace</h1><p class="lede" id="os-subtitle"></p></div><button class="button button-primary" id="os-new-task">＋ New task</button></div><div id="os-content"></div><div class="os-modal-backdrop" id="os-task-modal" hidden><section class="os-modal" role="dialog" aria-modal="true" aria-labelledby="os-task-modal-title"><div class="os-modal-head"><div><div class="eyebrow">WORK MANAGEMENT</div><h2 id="os-task-modal-title">Create a task</h2><p>Give the work a clear owner and next step.</p></div><button type="button" class="os-modal-close" id="os-task-close" aria-label="Close">×</button></div><form id="os-task-form" class="os-task-form"><label>Task title<input name="title" required maxlength="140" placeholder="e.g. Draft substitute-trust carousel"></label><div class="os-form-grid"><label>Owner<select name="owner"><option>Nikita</option><option>Sai</option><option>Tanvi</option><option>Saurabh</option></select></label><label>Priority<select name="priority"><option>Medium</option><option>High</option><option>Low</option></select></label><label>Due date<input type="date" name="due" required value="' + plusDays(2) + '"></label><label>Workstream<select name="pillar"><option>Medicine education</option><option>Trust & transparency</option><option>Audience intelligence</option><option>Performance learning</option><option>General</option></select></label></div><label>Work document link <span class="os-optional">Optional</span><input name="doc" type="url" placeholder="https://docs.google.com/..."></label><div class="os-modal-actions"><button type="button" class="button button-secondary" id="os-task-cancel">Cancel</button><button type="submit" class="button button-primary">Create task</button></div></form></section></div>';
    main.append(section);
    $$("[data-os-view]").forEach(b => b.addEventListener("click", () => show(b.dataset.osView)));
    $("#os-new-task").addEventListener("click", newTask);
    $("#os-task-close").addEventListener("click", closeTaskModal);
    $("#os-task-cancel").addEventListener("click", closeTaskModal);
    $("#os-task-modal").addEventListener("click", e => { if (e.target.id === "os-task-modal") closeTaskModal(); });
    $("#os-task-form").addEventListener("submit", saveNewTask);
    render();
    show(["execution","creative","research","intelligence","calendar"].includes(state.view) ? state.view : "execution");
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
    const stats = [["Open tasks",state.tasks.filter(t=>t.status!=="Done").length],["Due today",state.tasks.filter(t=>t.status!=="Done"&&t.due===plusDays(0)).length],["Awaiting approval",state.tasks.filter(t=>t.status==="Awaiting approval").length],["Overdue",state.tasks.filter(t=>t.status!=="Done"&&t.due<plusDays(0)).length]];
    return '<div class="notice notice-muted"><span class="notice-icon">i</span><div><b>Phase 1 workspace</b><span>Tasks and goals are separate. Example records are stored only in this browser; shared team storage is not connected yet.</span></div></div><div class="stats-grid">' + stats.map(x=>'<article class="stat-card"><div class="stat-top"><span>'+x[0]+'</span></div><div class="stat-number">'+x[1]+'</div><div class="stat-caption">Current workspace records</div></article>').join("") + '</div><div class="focus-grid">'+
      '<article class="focus-card"><span class="tag">WORKSPACE</span><h3>Move work forward</h3><p>See owners, priorities, deadlines, blockers and review status without mixing them up with goals.</p><div class="card-bottom"><span class="audience">Tasks & calendar</span><button class="mini-link" data-open-workspace>Open workspace →</button></div></article>'+
      '<article class="focus-card"><span class="tag purple">GOALS</span><h3>Track outcomes separately</h3><p>Keep business outcomes visible, then connect the work that contributes to each goal.</p><div class="card-bottom"><span class="audience">'+state.goals.length+' example goals</span><button class="mini-link" data-open-goals>View goals →</button></div></article>'+
      '<article class="focus-card"><span class="tag orange">INDIA RADAR</span><h3>Listen before planning</h3><p>Bring together public discussions, social signals, trends and news relevant to Indian healthcare.</p><div class="card-bottom"><span class="audience">Source-led research</span><button class="mini-link" data-open-radar>Open radar →</button></div></article>'+
      '</div><div class="lower-grid">'+panel("Priority work",state.tasks.slice(0,4).map(task).join(""))+panel("Goals at a glance",state.goals.map(g=>'<div style="padding:10px 0"><div style="display:flex;justify-content:space-between;gap:12px"><b>'+esc(g.name)+'</b><span>'+g.actual+' / '+g.target+' '+esc(g.unit)+'</span></div><div style="height:7px;background:#e8ebe4;border-radius:8px;margin-top:8px"><div style="height:100%;width:'+Math.min(100,Math.round(g.actual/g.target*100))+'%;background:#64836e;border-radius:8px"></div></div></div>').join(""))+'</div>';
  }
  function intelligence() {
    return '<div class="notice"><span class="notice-icon">i</span><div><b>Human-approved intelligence</b><span>AI may recommend and draft; it does not publish, approve medical claims, or change plans without human approval. Entries below are illustrative until live source/model connections are configured.</span></div></div><div class="focus-grid">' +
      state.intelligence.map((i,n)=>'<article class="focus-card"><div class="focus-top"><span class="tag">'+esc(i.type)+'</span></div><h3>'+esc(i.title)+'</h3><p>'+esc(i.detail)+'</p><div class="card-bottom"><span class="audience">'+esc(i.source)+'</span><button class="mini-link" data-promote="'+n+'">Promote to task →</button></div></article>').join("") +
      '</div>' + panel("Intelligence loop",'<ol><li>Retrieve brand strategy, approved claims, research, past creatives, goals and results.</li><li>Analyze source-linked signals and label facts, inferences and hypotheses separately.</li><li>Generate platform-native opportunities and flag medical claims for review.</li><li>Human approval turns an opportunity into a brief or task.</li><li>Measured results and feedback feed the next cycle.</li></ol>');
  }
  function research() {
    const tabs = [["all","All radar"],["reddit","Reddit"],["social","Social media"],["trends","Trends"],["news","News & policy"]];
    return '<div class="notice notice-muted"><span class="notice-icon">i</span><div><b>India-first intelligence radar</b><span>Separate sourced facts from public opinion and hypotheses. No live source collection is claimed until connectors are configured and results show source URLs and timestamps.</span></div></div>'+
      '<div class="toolbar"><input id="os-research-query" class="search-input" placeholder="Search a topic: medicine substitutes, chronic care, pharma policy…"><select id="os-radar-region" class="select-input"><option value="india">India</option><option value="maharashtra">Maharashtra</option><option value="global">Global context</option></select><button id="os-research-run" class="button button-primary">Create research brief</button></div>'+
      '<div class="radar-tabs">'+tabs.map((t,i)=>'<button class="button '+(i===0?'button-primary':'button-secondary')+'" data-radar-tab="'+t[0]+'">'+t[1]+'</button>').join("")+'</div>'+
      '<div class="stats-grid">'+[['Reddit discussions','Qualitative patient/community questions'],['Social signals','Public posts and creator conversations'],['Trends','Search interest and emerging topics'],['News & policy','Regulatory, industry and healthcare updates']].map((x,i)=>'<article class="stat-card"><div class="stat-top"><span>'+x[0]+'</span><span class="stat-icon '+['lilac','sage','peach','blue'][i]+'">'+['◎','↗','✳','▤'][i]+'</span></div><div class="stat-number">—</div><div class="stat-caption">'+x[1]+'</div></article>').join("")+'</div>'+
      '<div id="os-radar-results">'+panel("Research queue",state.intelligence.filter(i=>i.type!=="Creative recommendation").map(i=>'<div class="signal-row"><div class="signal-copy"><h4>'+esc(i.title)+'</h4><p>'+esc(i.detail)+'</p><div class="signal-meta">'+esc(i.source)+'</div></div><span class="tag orange">Example</span></div>').join(""))+'</div>'+
      '<p class="signal-meta">Planned sources: Reddit threads and comments, public social posts where accessible, Google Trends/search interest, Indian government and regulator updates, and reputable Indian healthcare/pharma news. Every item should retain source URL, published date, collection date and an evidence/interpretation label.</p>';
  }
  function goals() {
    return '<div class="notice"><span class="notice-icon">◎</span><div><b>Goals are outcomes, not tasks</b><span>Track the result you want to achieve here. Workspace tasks are the activities that may contribute to these outcomes.</span></div></div>'+
      '<div class="stats-grid">'+state.goals.map(g=>'<article class="stat-card"><div class="stat-top"><span>'+esc(g.name)+'</span><span class="stat-icon sage">◎</span></div><div class="stat-number">'+g.actual+' <span style="font-size:13px;color:#8a968e">/ '+g.target+'</span></div><div class="stat-caption">'+esc(g.unit)+' · current / target</div><div style="height:7px;background:#e8ebe4;border-radius:8px;margin-top:14px"><div style="height:100%;width:'+Math.min(100,Math.round(g.actual/g.target*100))+'%;background:#64836e;border-radius:8px"></div></div></article>').join("")+'</div>'+
      panel("Goal-setting principles",'<ul><li>Each goal has an outcome, baseline, target, time period and accountable owner.</li><li>Tasks are linked to goals; tasks do not replace the goal itself.</li><li>Use verified performance data, not illustrative numbers, for business decisions.</li></ul>')+
      '<p class="signal-meta">These goal figures are existing example records. Connect the real source of truth before using them for decisions.</p>';
  }
  function creative() {
    const pillars=[["Medicine education","Explain labels, molecules and questions to ask a clinician.","Instagram carousel / YouTube explainer"],["Trust & process transparency","Show what doctor verification and pharmacist review mean in practice.","Reel / Facebook explainer"],["Caregiver support","Help families organize prescriptions, refills and questions.","Checklist / regional-language video"],["Objection handling","Address quality concerns calmly with evidence and clear limitations.","FAQ / short video"]];
    return '<div class="focus-grid">'+pillars.map(p=>'<article class="focus-card"><span class="tag">CONTENT PILLAR</span><h3>'+p[0]+'</h3><p>'+p[1]+'</p><div class="card-bottom"><span class="audience">'+p[2]+'</span><button class="mini-link" data-pillar="'+esc(p[0])+'">Create brief →</button></div></article>').join("")+'</div>'+panel("Creative test standards",'<ul><li>Match the concept to a real audience concern, not a generic trend.</li><li>Adapt content to each platform instead of copying one post everywhere.</li><li>Record audience, hook, format, CTA, hypothesis, metric and result.</li><li>Require evidence and human review for medical, quality and comparative claims.</li></ul>');
  }
  function execution() {
    return '<div class="workspace-summary">'+[['Open tasks',state.tasks.filter(t=>t.status!=="Done").length],['In progress',state.tasks.filter(t=>t.status==="In progress").length],['Awaiting review',state.tasks.filter(t=>["In review","Awaiting approval"].includes(t.status)).length],['Goals',state.goals.length]].map(x=>'<article class="stat-card"><div class="stat-caption">'+x[0]+'</div><div class="stat-number">'+x[1]+'</div></article>').join("")+'</div><div class="workspace-section-head"><div><h2>Tasks</h2><p>Execution and approvals stay separate from goal outcomes.</p></div><button id="os-task-add" class="button button-primary">＋ New task</button></div><div class="toolbar"><button id="os-board" class="button button-secondary">Board view</button><input id="os-task-filter" class="search-input" placeholder="Search tasks, owners or workstreams"></div><div id="os-task-view"></div><div class="workspace-section-head goals-heading"><div><h2>Goals</h2><p>Track outcomes independently; link tasks to the outcomes they support.</p></div></div><div class="goal-grid">'+state.goals.map((g,i)=>'<article class="goal-card"><div class="goal-card-top"><span class="goal-dot"></span><span class="tag">'+(i===0?'Growth':i===1?'Efficiency':'Output')+'</span></div><h3>'+esc(g.name)+'</h3><div class="goal-metric">'+g.actual+' <span>/ '+g.target+' '+esc(g.unit)+'</span></div><div class="goal-progress"><span style="width:'+Math.min(100,Math.round(g.actual/g.target*100))+'%"></span></div><p>Illustrative baseline — connect verified data before making decisions.</p></article>').join("")+'</div>'+panel("Approval workflow",'<p>Contributors submit work for review. Only authorised admins approve completion; medical and comparative claims require evidence and human review.</p>');
  }
  function board() {
    const statuses=["To do","In progress","In review","Awaiting approval","Done"];
    $("#os-task-view").innerHTML='<div class="focus-grid" style="grid-template-columns:repeat(3,minmax(0,1fr))">'+statuses.map(s=>'<article class="panel"><h3>'+s+'</h3>'+state.tasks.filter(t=>t.status===s).map(t=>'<div class="focus-card" style="margin-top:10px"><b>'+esc(t.title)+'</b><p>'+esc(t.owner)+' · '+fmt(t.due)+'</p><select class="select-input" data-status="'+t.id+'">'+statuses.map(x=>'<option '+(x===t.status?'selected':'')+'>'+x+'</option>').join("")+'</select>'+(t.doc?'<p><a href="'+esc(t.doc)+'" target="_blank" rel="noopener">Open work ↗</a></p>':'')+'</div>').join("")+'</article>').join("")+'</div>';
    $$("[data-status]").forEach(s=>s.addEventListener("change",()=>{const t=state.tasks.find(t=>t.id===s.dataset.status);t.status=s.value;save();board();}));
  }
  function calendar() {
    const days=Array.from({length:14},(_,i)=>plusDays(i));
    return '<div class="calendar-toolbar"><div><h2>Next 14 days</h2><p>Task deadlines and content delivery dates.</p></div><span class="tag">India time · IST</span></div><div class="calendar-grid">'+days.map(d=>'<article class="calendar-day '+(d===plusDays(0)?'is-today':'')+'"><div class="eyebrow">'+new Date(d+"T12:00:00").toLocaleDateString("en-IN",{weekday:"short"})+'</div><h3>'+fmt(d)+'</h3>'+state.tasks.filter(t=>t.due===d).map(t=>'<div class="calendar-event"><b>'+esc(t.title)+'</b><span>'+esc(t.owner)+' · '+esc(t.status)+'</span></div>').join("")+'</article>').join("")+'</div>';
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
    const c=$("#os-content"); if(!c)return; const v=state.view||"execution";
    c.innerHTML=({intelligence,research,creative,execution,calendar})[v]();
    if(v==="execution"){ $("#os-board").onclick=board;$("#os-task-add").onclick=newTask;board(); const f=$("#os-task-filter"); if(f) f.oninput=()=>{const q=f.value.toLowerCase();$("[data-status]").forEach(()=>{});const all=state.tasks;state.tasks=all.filter(t=>(t.title+" "+t.owner+" "+t.pillar).toLowerCase().includes(q));board();state.tasks=all;}; }
    if(v==="calendar") calendar();
    if(v==="research") { $("[data-radar-tab]").forEach(b=>b.onclick=()=>{ $("[data-radar-tab]").forEach(x=>x.className="button button-secondary"); b.className="button button-primary"; const q=$("#os-research-query").value.trim(); $("#os-radar-results").innerHTML='<div class="panel"><div class="panel-heading"><div><h3>'+esc(b.textContent)+' queue</h3><p>'+(q?'Topic: '+esc(q):'Choose a topic to build a focused collection brief.')+'</p></div></div><p>Live collection is not connected yet. Use “Create research brief” to save the question for source-led research.</p></div>'; }); }
    if(v==="learning")$("#os-learning-form").addEventListener("submit",e=>{e.preventDefault();state.learnings.unshift(Object.fromEntries(new FormData(e.target)));save();render();});
    $$("[data-promote]").forEach(b=>b.onclick=()=>{const i=state.intelligence[Number(b.dataset.promote)];state.tasks.unshift({id:"t"+Date.now(),title:i.title,owner:"Saurabh",status:"To do",priority:"Medium",due:plusDays(2),pillar:i.type,doc:""});save();show("execution");});
    $$("[data-pillar]").forEach(b=>b.onclick=()=>{state.tasks.unshift({id:"t"+Date.now(),title:"Develop brief: "+b.dataset.pillar,owner:"Nikita",status:"To do",priority:"Medium",due:plusDays(3),pillar:b.dataset.pillar,doc:""});save();show("execution");});
    if(v==="research")$("#os-research-run").onclick=()=>{const q=$("#os-research-query").value.trim();if(!q)return;const region=$("#os-radar-region").value;state.intelligence.unshift({type:"Research hypothesis",title:"Research brief: "+q,detail:"Region: "+region+". Collect Reddit/community questions, accessible public social signals, trend evidence and Indian healthcare/pharma news. Preserve source URLs and dates; distinguish observation, inference and hypothesis.",source:"User-created radar brief"});save();render();};
    $("[data-open-workspace]").forEach(b=>b.onclick=()=>show("execution"));
    $("[data-open-goals]").forEach(b=>b.onclick=()=>show("goals"));
    $("[data-open-radar]").forEach(b=>b.onclick=()=>show("research"));
  }
  document.addEventListener("DOMContentLoaded",addShell);
  if(document.readyState!=="loading")addShell();
})();