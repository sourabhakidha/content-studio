/**
 * Akidha Marketing OS — Google Apps Script starter
 * Initial MVP: task list, task creation, status changes, completion requests,
 * admin approval/rejection, basic goals, and spreadsheet-backed storage.
 *
 * Setup:
 * 1. Create a dedicated Google Sheet.
 * 2. Extensions > Apps Script; replace/add Code.gs and Index.html.
 * 3. In Project Settings > Script Properties add:
 *      SPREADSHEET_ID = the spreadsheet ID
 *      ADMIN_EMAILS = admin1@example.com,admin2@example.com
 *      CONTRIBUTOR_EMAILS = contributor1@example.com,contributor2@example.com
 * 4. Run setupDatabase() once from the editor and authorize it.
 * 5. Test with each team account before deployment.
 *
 * Security note:
 * This starter checks the active Google identity server-side. Identity may be
 * unavailable for some consumer-account/deployment combinations. If the app
 * cannot reliably identify a user, it denies access. Do not remove this check.
 */

const APP = {
  NAME: 'Akidha Marketing OS',
  SHEETS: {
    Users: ['user_id', 'email', 'display_name', 'role', 'active', 'created_at'],
    Tasks: ['task_id', 'title', 'brief', 'owner_email', 'status', 'priority', 'category',
      'goal_id', 'theme', 'due_date', 'estimate_minutes', 'actual_minutes', 'blocker_reason',
      'completion_requested_by', 'completion_requested_at', 'completed_by', 'completed_at',
      'created_by', 'created_at', 'updated_at'],
    Goals: ['goal_id', 'title', 'owner_email', 'metric_key', 'unit', 'direction',
      'baseline_value', 'target_value', 'current_value', 'measurement_source',
      'start_date', 'end_date', 'status', 'updated_at'],
    TaskDependencies: ['task_id', 'depends_on_task_id', 'dependency_type', 'created_at'],
    Approvals: ['approval_id', 'task_id', 'requested_by', 'reviewer_email', 'decision',
      'comments', 'requested_at', 'decided_at'],
    Themes: ['theme_id', 'name', 'description', 'audience_segment', 'status', 'created_at'],
    WorkBlocks: ['block_id', 'task_id', 'owner_email', 'starts_at', 'ends_at', 'status',
      'proposed_by', 'confirmed_by', 'confirmed_at', 'override_reason'],
    Creatives: ['creative_id', 'task_id', 'title', 'platform', 'format', 'workflow_stage',
      'medical_review_required', 'medical_review_status', 'publish_url', 'published_at',
      'created_at', 'updated_at'],
    Performance: ['observation_id', 'creative_id', 'goal_id', 'metric_key', 'metric_value',
      'unit', 'period_start', 'period_end', 'source', 'source_url', 'imported_at'],
    AuditLog: ['event_id', 'actor_email', 'entity_type', 'entity_id', 'action',
      'details', 'created_at']
  },
  STATUSES: ['Backlog', 'Ideation', 'Scripting', 'Admin Review', 'Storyboard',
    'Asset Creation', 'Final Admin Review', 'Ready to Publish', 'Published',
    'Performance Review', 'Learning Recorded', 'Blocked', 'Completion Requested', 'Completed'],
  PRIORITIES: ['Low', 'Medium', 'High', 'Urgent'],
  CATEGORIES: ['Social media', 'Meta Ads', 'Offline creatives', 'Repurposing', 'Other']
};

function doGet() {
  const user = requireUser_();
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle(APP.NAME)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/** Run once from Apps Script editor after setting SPREADSHEET_ID. */
function setupDatabase() {
  const ss = getSpreadsheet_();
  Object.keys(APP.SHEETS).forEach(name => {
    let sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    const headers = APP.SHEETS[name];
    if (sh.getLastRow() === 0) {
      sh.getRange(1, 1, 1, headers.length).setValues([headers]);
      sh.setFrozenRows(1);
      sh.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#e8eef5');
      sh.autoResizeColumns(1, headers.length);
    } else {
      const current = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), headers.length)).getValues()[0];
      const missing = headers.filter(h => !current.includes(h));
      if (missing.length) throw new Error('Sheet "' + name + '" exists with a different header structure. Review it manually; no columns were changed.');
    }
  });
  seedConfiguredUsers_();
  return 'Database tabs are ready. Verify Users and Script Properties before deployment.';
}

function getBootstrapData() {
  const user = requireUser_();
  return {
    appName: APP.NAME,
    user: user,
    statuses: APP.STATUSES,
    priorities: APP.PRIORITIES,
    categories: APP.CATEGORIES,
    team: readObjects_('Users').filter(u => truthy_(u.active)).map(u => ({
      email: cleanEmail_(u.email), name: u.display_name || u.email, role: String(u.role).toLowerCase()
    })),
    // Enforce record visibility on the server; UI-only filtering is not security.
    tasks: readObjects_('Tasks')
      .filter(t => user.role === 'admin' || cleanEmail_(t.owner_email) === user.email)
      .map(publicTask_)
      .sort((a,b) => String(a.due_date || '9999').localeCompare(String(b.due_date || '9999'))),
    // Goals are shared planning records across the team.
    goals: readObjects_('Goals'),
    creatives: readObjects_('Creatives').filter(c => {
      if (user.role === 'admin') return true;
      const linked = readObjects_('Tasks').find(t => String(t.task_id) === String(c.task_id));
      return linked && cleanEmail_(linked.owner_email) === user.email;
    }),
    approvals: user.role === 'admin' ? readObjects_('Approvals').filter(a => a.decision === 'pending') : []
  };
}

function createTask(payload) {
  const user = requireUser_();
  payload = payload || {};
  const title = clean_(payload.title, 160);
  if (!title) throw new Error('Task title is required.');
  const requestedOwner = cleanEmail_(payload.owner_email || user.email);
  // Contributors may only create work assigned to themselves.
  const ownerEmail = user.role === 'admin' ? requestedOwner : user.email;
  if (!isKnownUser_(ownerEmail)) throw new Error('Choose an active team member as owner.');
  if (payload.goal_id && !findById_('Goals', 'goal_id', clean_(payload.goal_id, 80))) {
    throw new Error('The selected goal does not exist. Refresh and choose a valid goal.');
  }
  const status = APP.STATUSES.includes(payload.status) ? payload.status : 'Backlog';
  const priority = APP.PRIORITIES.includes(payload.priority) ? payload.priority : 'Medium';
  const category = APP.CATEGORIES.includes(payload.category) ? payload.category : 'Other';
  const id = newId_('T');
  const now = new Date();
  const row = {
    task_id: id, title: title, brief: clean_(payload.brief, 3000),
    owner_email: ownerEmail, status: status, priority: priority, category: category,
    goal_id: clean_(payload.goal_id, 80), theme: clean_(payload.theme, 160),
    due_date: clean_(payload.due_date, 30), estimate_minutes: positiveNumber_(payload.estimate_minutes),
    actual_minutes: '', blocker_reason: '', completion_requested_by: '',
    completion_requested_at: '', completed_by: '', completed_at: '',
    created_by: user.email, created_at: now, updated_at: now
  };
  appendObject_('Tasks', row);
  audit_(user.email, 'task', id, 'created', 'Created task "' + title + '".');
  return {ok:true, task_id:id};
}

function updateTaskStatus(taskId, nextStatus) {
  const user = requireUser_();
  taskId = clean_(taskId, 80);
  if (!APP.STATUSES.includes(nextStatus)) throw new Error('Invalid status.');
  const task = findById_('Tasks', 'task_id', taskId);
  if (!task) throw new Error('Task not found.');
  assertCanEditTask_(user, task);

  if (nextStatus === 'Completed') {
    throw new Error('Use Request completion. An admin must approve completion.');
  }
  if (nextStatus === 'Completion Requested') {
    requestCompletion_(user, task);
    return {ok:true};
  }
  if (task.status === 'Completed') throw new Error('Completed tasks cannot be reopened from this control. Ask an admin.');
  // Contributors can progress their own work, but cannot bypass admin gates or mark work published.
  const contributorStatuses = ['Backlog', 'Ideation', 'Scripting', 'Storyboard', 'Asset Creation', 'Blocked', 'Performance Review', 'Learning Recorded'];
  const adminOnlyStatuses = ['Admin Review', 'Final Admin Review', 'Ready to Publish', 'Published'];
  if (user.role !== 'admin' && (!contributorStatuses.includes(nextStatus) || adminOnlyStatuses.includes(nextStatus))) {
    throw new Error('That workflow stage requires admin approval.');
  }
  updateById_('Tasks', 'task_id', taskId, {status:nextStatus, updated_at:new Date()});
  audit_(user.email, 'task', taskId, 'status_changed', task.status + ' → ' + nextStatus);
  return {ok:true};
}

function requestCompletion(taskId) {
  const user = requireUser_();
  const task = findById_('Tasks', 'task_id', clean_(taskId, 80));
  if (!task) throw new Error('Task not found.');
  assertCanEditTask_(user, task);
  requestCompletion_(user, task);
  return {ok:true};
}

function decideCompletion(approvalId, decision, comments) {
  const user = requireUser_();
  requireAdmin_(user);
  if (!['approved','rejected'].includes(decision)) throw new Error('Invalid decision.');
  const approval = findById_('Approvals', 'approval_id', clean_(approvalId, 80));
  if (!approval || approval.decision !== 'pending') throw new Error('Pending approval not found.');
  const task = findById_('Tasks', 'task_id', approval.task_id);
  if (!task) throw new Error('Task not found.');
  const now = new Date();
  updateById_('Approvals', 'approval_id', approvalId, {
    decision:decision, reviewer_email:user.email, comments:clean_(comments, 1000), decided_at:now
  });
  if (decision === 'approved') {
    updateById_('Tasks', 'task_id', task.task_id, {
      status:'Completed', completed_by:user.email, completed_at:now, updated_at:now
    });
  } else {
    updateById_('Tasks', 'task_id', task.task_id, {
      status:'Admin Review', completion_requested_by:'', completion_requested_at:'', updated_at:now
    });
  }
  audit_(user.email, 'task', task.task_id, 'completion_' + decision, clean_(comments, 1000));
  return {ok:true};
}

function createGoal(payload) {
  const user = requireUser_();
  requireAdmin_(user);
  payload = payload || {};
  const title = clean_(payload.title, 160);
  if (!title) throw new Error('Goal title is required.');
  const now = new Date();
  const id = newId_('G');
  appendObject_('Goals', {
    goal_id:id, title:title, owner_email:cleanEmail_(payload.owner_email || user.email),
    metric_key:clean_(payload.metric_key, 100), unit:clean_(payload.unit, 40),
    direction:payload.direction === 'lower' ? 'lower' : 'higher',
    baseline_value:positiveOrNegativeNumber_(payload.baseline_value),
    target_value:positiveOrNegativeNumber_(payload.target_value),
    current_value:positiveOrNegativeNumber_(payload.current_value),
    measurement_source:clean_(payload.measurement_source, 200),
    start_date:clean_(payload.start_date, 30), end_date:clean_(payload.end_date, 30),
    status:'in_progress', updated_at:now
  });
  audit_(user.email, 'goal', id, 'created', 'Created goal "' + title + '".');
  return {ok:true, goal_id:id};
}

/** Create a creative work item linked to an existing task. */
function createCreative(payload) {
  const user = requireUser_();
  payload = payload || {};
  const taskId = clean_(payload.task_id, 80);
  const task = findById_('Tasks', 'task_id', taskId);
  if (!task) throw new Error('Choose a valid linked task.');
  assertCanEditTask_(user, task);
  const title = clean_(payload.title, 160);
  if (!title) throw new Error('Creative title is required.');
  const platform = clean_(payload.platform, 60);
  const format = clean_(payload.format, 60);
  if (!platform || !format) throw new Error('Platform and format are required.');
  const now = new Date();
  const id = newId_('C');
  appendObject_('Creatives', {
    creative_id:id, task_id:taskId, title:title, platform:platform, format:format,
    workflow_stage:'Ideation', medical_review_required:true,
    medical_review_status:'not_started', publish_url:'', published_at:'', created_at:now, updated_at:now
  });
  audit_(user.email, 'creative', id, 'created', 'Created creative "' + title + '" linked to task ' + taskId + '.');
  return {ok:true, creative_id:id};
}

/** Advance a creative through its workflow with server-side approval gates. */
function updateCreativeWorkflow(creativeId, nextStage, medicalReviewStatus, publishUrl) {
  const user = requireUser_();
  const id = clean_(creativeId, 80);
  const creative = findById_('Creatives', 'creative_id', id);
  if (!creative) throw new Error('Creative not found.');
  const task = findById_('Tasks', 'task_id', creative.task_id);
  if (!task) throw new Error('Linked task not found.');
  assertCanEditTask_(user, task);
  const stages = ['Ideation','Scripting / Brief','Admin Review','Storyboard','Asset Creation / Editing','Final Admin Review','Ready to Publish','Published','Performance Review','Learning Recorded','Blocked'];
  if (!stages.includes(nextStage)) throw new Error('Invalid creative workflow stage.');
  const adminStages = ['Admin Review','Final Admin Review','Ready to Publish','Published'];
  if (user.role !== 'admin' && adminStages.includes(nextStage)) throw new Error('An admin must approve this workflow stage.');
  const updates = {workflow_stage:nextStage, updated_at:new Date()};
  if (medicalReviewStatus !== undefined && medicalReviewStatus !== null && String(medicalReviewStatus) !== '') {
    const allowedReview = ['not_started','pending','approved','rejected'];
    if (!allowedReview.includes(String(medicalReviewStatus))) throw new Error('Invalid medical review status.');
    if (String(medicalReviewStatus) === 'approved' || String(medicalReviewStatus) === 'rejected') requireAdmin_(user);
    updates.medical_review_status = String(medicalReviewStatus);
  }
  if (nextStage === 'Ready to Publish' || nextStage === 'Published') {
    if (truthy_(creative.medical_review_required) && updates.medical_review_status !== 'approved' && creative.medical_review_status !== 'approved') {
      throw new Error('Medical/claims review must be approved before this creative can be readied or published.');
    }
  }
  if (nextStage === 'Published') {
    const url = clean_(publishUrl || creative.publish_url, 500);
    if (!url || !/^https:\/\//i.test(url)) throw new Error('Add the published creative URL (https://) before marking it published.');
    updates.publish_url = url;
    updates.published_at = new Date();
  }
  updateById_('Creatives', 'creative_id', id, updates);
  audit_(user.email, 'creative', id, 'workflow_changed', creative.workflow_stage + ' → ' + nextStage + (updates.medical_review_status ? '; claims review: ' + updates.medical_review_status : ''));
  return {ok:true};
}

function requestCompletion_(user, task) {
  if (task.status === 'Completed') throw new Error('Task is already completed.');
  if (task.status === 'Completion Requested') throw new Error('Completion is already awaiting approval.');
  const unmet = readObjects_('TaskDependencies').filter(d => d.task_id === task.task_id)
    .some(d => {
      const dependency = findById_('Tasks', 'task_id', d.depends_on_task_id);
      return dependency && dependency.status !== 'Completed';
    });
  if (unmet) throw new Error('A dependency is still incomplete.');
  const now = new Date();
  updateById_('Tasks', 'task_id', task.task_id, {
    status:'Completion Requested', completion_requested_by:user.email,
    completion_requested_at:now, updated_at:now
  });
  appendObject_('Approvals', {
    approval_id:newId_('A'), task_id:task.task_id, requested_by:user.email,
    reviewer_email:'', decision:'pending', comments:'', requested_at:now, decided_at:''
  });
  audit_(user.email, 'task', task.task_id, 'completion_requested', 'Awaiting admin approval.');
}

function requireUser_() {
  const email = cleanEmail_(Session.getActiveUser().getEmail());
  if (!email) throw new Error('Google could not verify your signed-in email. Deployment/account settings must be fixed before use.');
  const user = readObjects_('Users').find(u => cleanEmail_(u.email) === email && truthy_(u.active));
  if (user) return {email:email, name:user.display_name || email, role:String(user.role).toLowerCase()};
  const props = PropertiesService.getScriptProperties();
  const admins = parseEmails_(props.getProperty('ADMIN_EMAILS'));
  const contributors = parseEmails_(props.getProperty('CONTRIBUTOR_EMAILS'));
  if (admins.includes(email)) return {email:email, name:email, role:'admin'};
  if (contributors.includes(email)) return {email:email, name:email, role:'contributor'};
  throw new Error('Your Google account is not on the approved team list.');
}

function requireAdmin_(user) {
  if (!user || user.role !== 'admin') throw new Error('Admin permission required.');
}

function assertCanEditTask_(user, task) {
  if (user.role === 'admin') return;
  if (user.role !== 'contributor') throw new Error('Your account role cannot edit tasks.');
  if (cleanEmail_(task.owner_email) !== user.email) throw new Error('You can only edit tasks assigned to you.');
}

function seedConfiguredUsers_() {
  const props = PropertiesService.getScriptProperties();
  const admins = parseEmails_(props.getProperty('ADMIN_EMAILS'));
  const contributors = parseEmails_(props.getProperty('CONTRIBUTOR_EMAILS'));
  const existing = readObjects_('Users');
  const seen = new Set(existing.map(u => cleanEmail_(u.email)));
  const now = new Date();
  admins.forEach(email => {
    if (!seen.has(email)) appendObject_('Users', {user_id:newId_('U'),email,display_name:email,role:'admin',active:true,created_at:now});
  });
  contributors.forEach(email => {
    if (!seen.has(email)) appendObject_('Users', {user_id:newId_('U'),email,display_name:email,role:'contributor',active:true,created_at:now});
  });
}

function getSpreadsheet_() {
  const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!id) throw new Error('Set SPREADSHEET_ID in Script Properties first.');
  return SpreadsheetApp.openById(id);
}

function readObjects_(sheetName) {
  const sh = getSpreadsheet_().getSheetByName(sheetName);
  if (!sh || sh.getLastRow() < 2) return [];
  const values = sh.getDataRange().getValues();
  const headers = values.shift().map(String);
  return values.filter(row => row.some(v => v !== '' && v !== null)).map(row => {
    const o = {};
    headers.forEach((h,i) => o[h] = serialize_(row[i]));
    return o;
  });
}

function appendObject_(sheetName, obj) {
  const sh = getSpreadsheet_().getSheetByName(sheetName);
  if (!sh) throw new Error('Missing tab ' + sheetName + '. Run setupDatabase().');
  const headers = APP.SHEETS[sheetName];
  const row = headers.map(h => Object.prototype.hasOwnProperty.call(obj,h) ? obj[h] : '');
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try { sh.appendRow(row); } finally { lock.releaseLock(); }
}

function findById_(sheetName, idColumn, idValue) {
  return readObjects_(sheetName).find(o => String(o[idColumn]) === String(idValue)) || null;
}

function updateById_(sheetName, idColumn, idValue, changes) {
  const sh = getSpreadsheet_().getSheetByName(sheetName);
  if (!sh || sh.getLastRow() < 2) throw new Error('Record not found.');
  const values = sh.getDataRange().getValues();
  const headers = values[0].map(String);
  const idIdx = headers.indexOf(idColumn);
  if (idIdx < 0) throw new Error('ID column not found.');
  for (let r=1; r<values.length; r++) {
    if (String(values[r][idIdx]) === String(idValue)) {
      Object.keys(changes).forEach(k => {
        const c = headers.indexOf(k);
        if (c >= 0) sh.getRange(r+1,c+1).setValue(changes[k]);
      });
      return;
    }
  }
  throw new Error('Record not found.');
}

function isKnownUser_(email) {
  return readObjects_('Users').some(u => cleanEmail_(u.email) === email && truthy_(u.active));
}

function audit_(actor, entityType, entityId, action, details) {
  appendObject_('AuditLog', {event_id:newId_('E'),actor_email:actor,entity_type:entityType,
    entity_id:entityId,action:action,details:clean_(details,2000),created_at:new Date()});
}

function publicTask_(t) {
  return t;
}

function newId_(prefix) {
  return prefix + '-' + Utilities.getUuid().split('-')[0].toUpperCase();
}
function clean_(v, max) { return String(v == null ? '' : v).trim().slice(0, max || 500); }
function cleanEmail_(v) { return clean_(v,254).toLowerCase(); }
function parseEmails_(v) { return String(v || '').split(',').map(cleanEmail_).filter(Boolean); }
function positiveNumber_(v) {
  if (v === '' || v == null) return '';
  const n = Number(v); if (!Number.isFinite(n) || n < 0) throw new Error('Effort must be zero or greater.');
  return n;
}
function positiveOrNegativeNumber_(v) {
  if (v === '' || v == null) return '';
  const n = Number(v); if (!Number.isFinite(n)) throw new Error('Metric values must be numbers.');
  return n;
}
function truthy_(v) { return v === true || String(v).toLowerCase() === 'true' || String(v) === '1'; }
function serialize_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm:ss");
  return v;
}
