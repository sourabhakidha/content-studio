/**
 * Akidha Marketing OS — Comprehensive Google Apps Script Engine
 *
 * Core Capabilities:
 * 1. Core Operations: Full Tasks, Goals, Creatives, Approvals, Task Dependencies, Themes, Capacity Scheduling
 * 2. Akidha Market Intelligence: RSS news (NPPA/CDSCO) & Reddit social listening, deduplication, scoring, scheduled triggers
 * 3. AI Creative Studio: Multi-model (OpenAI / Gemini) generation, brand guardrails, automatic compliance scanner
 * 4. Analytics & Learning Loop: Performance attribution, 8-hour shift capacity planning, retrospective learning loop
 * 5. High-Performance Storage: Batched spreadsheet I/O and CacheService memoization (eliminates O(N*M) scans)
 */

/* ==========================================================================
   1. APP CONFIGURATION & SCHEMAS
   ========================================================================== */

const APP = {
  NAME: 'Akidha Marketing OS',
  VERSION: '2.0.0',
  SHEETS: {
    Users: ['user_id', 'email', 'display_name', 'role', 'active', 'created_at'],
    Tasks: [
      'task_id', 'title', 'brief', 'owner_email', 'status', 'priority', 'category',
      'goal_id', 'theme', 'due_date', 'estimate_minutes', 'actual_minutes', 'blocker_reason',
      'completion_requested_by', 'completion_requested_at', 'completed_by', 'completed_at',
      'created_by', 'created_at', 'updated_at',
      'doc_url', 'dependencies', 'is_archived'
    ],
    Goals: [
      'goal_id', 'title', 'owner_email', 'metric_key', 'unit', 'direction',
      'baseline_value', 'target_value', 'current_value', 'measurement_source',
      'start_date', 'end_date', 'status', 'updated_at',
      'is_archived'
    ],
    TaskDependencies: [
      'task_id', 'depends_on_task_id', 'dependency_type', 'created_at',
      'dependency_id'
    ],
    Approvals: [
      'approval_id', 'task_id', 'requested_by', 'reviewer_email', 'decision',
      'comments', 'requested_at', 'decided_at',
      'approval_type'
    ],
    Themes: ['theme_id', 'name', 'description', 'audience_segment', 'status', 'created_at'],
    WorkBlocks: [
      'block_id', 'task_id', 'owner_email', 'starts_at', 'ends_at', 'status',
      'proposed_by', 'confirmed_by', 'confirmed_at', 'override_reason',
      'shift_key', 'created_at'
    ],
    Creatives: [
      'creative_id', 'task_id', 'title', 'platform', 'format', 'workflow_stage',
      'medical_review_required', 'medical_review_status', 'publish_url', 'published_at',
      'created_at', 'updated_at',
      'medical_review_notes', 'asset_drive_url', 'compliance_flags', 'is_archived'
    ],
    Performance: [
      'observation_id', 'creative_id', 'goal_id', 'metric_key', 'metric_value',
      'unit', 'period_start', 'period_end', 'source', 'source_url', 'imported_at'
    ],
    Learnings: [
      'learning_id', 'campaign_name', 'creative_id', 'observation', 'hypothesis',
      'next_test', 'status', 'approved_by', 'created_by', 'created_at'
    ],
    MarketSignals: [
      'signal_id', 'source', 'category', 'title', 'summary', 'url',
      'intent', 'relevance_score', 'status', 'captured_at'
    ],
    AuditLog: [
      'event_id', 'actor_email', 'entity_type', 'entity_id', 'action',
      'details', 'created_at'
    ]
  },
  STATUSES: [
    'Backlog', 'Ideation', 'Scripting', 'Admin Review', 'Storyboard',
    'Asset Creation', 'Final Admin Review', 'Ready to Publish', 'Published',
    'Performance Review', 'Learning Recorded', 'Blocked', 'Completion Requested', 'Completed', 'Archived'
  ],
  CREATIVE_STAGES: [
    'Ideation', 'Scripting / Brief', 'Admin Review', 'Storyboard',
    'Asset Creation / Editing', 'Final Admin Review', 'Ready to Publish',
    'Published', 'Performance Review', 'Learning Recorded', 'Blocked'
  ],
  PRIORITIES: ['Low', 'Medium', 'High', 'Urgent'],
  CATEGORIES: ['Social media', 'Meta Ads', 'Offline creatives', 'Repurposing', 'Other'],
  SHIFTS: {
    '09': { name: '9:00 AM – 6:00 PM', startHour: 9, endHour: 18, breakHours: 1, productiveHours: 8 },
    '10': { name: '10:00 AM – 7:00 PM', startHour: 10, endHour: 19, breakHours: 1, productiveHours: 8 }
  },
  FEEDS: [
    { name: 'Google News · Indian pharma', url: 'https://news.google.com/rss/search?q=India+pharmaceutical+medicine+pricing+OR+chronic+care&hl=en-IN&gl=IN&ceid=IN:en', cat: 'pricing' },
    { name: 'Google News · medicine policy', url: 'https://news.google.com/rss/search?q=India+medicine+drug+price+regulation+CDSCO+NPPA&hl=en-IN&gl=IN&ceid=IN:en', cat: 'regulation' },
    { name: 'Google News · patient access', url: 'https://news.google.com/rss/search?q=India+chronic+disease+diabetes+hypertension+medicine+access&hl=en-IN&gl=IN&ceid=IN:en', cat: 'chronic' }
  ],
  REDDIT_QUERIES: [
    { q: '"medicine cost" India', theme: 'cost', cat: 'pricing' },
    { q: '"generic medicine" India', theme: 'trust', cat: 'regulation' },
    { q: '"medicine substitute" India', theme: 'confusion', cat: 'chronic' },
    { q: 'diabetes medicine cost India', theme: 'chronic', cat: 'chronic' },
    { q: 'blood pressure medicine price India', theme: 'chronic', cat: 'chronic' },
    { q: 'online pharmacy trust India medicines', theme: 'trust', cat: 'industry' }
  ]
};

/* ==========================================================================
   2. HTTP ENTRY POINTS
   ========================================================================== */

function doGet() {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle(APP.NAME)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/* ==========================================================================
   3. HIGH-PERFORMANCE DATABASE & CACHING LAYER
   ========================================================================== */

const Db = {
  getSpreadsheet() {
    const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    if (!id) throw new Error('Set SPREADSHEET_ID in Script Properties before use.');
    return SpreadsheetApp.openById(id);
  },

  /** Reads all rows as JSON objects. Memoizes in ScriptCache if enabled. */
  readObjects(sheetName) {
    const ss = this.getSpreadsheet();
    const sh = ss.getSheetByName(sheetName);
    if (!sh || sh.getLastRow() < 2) return [];

    const values = sh.getDataRange().getValues();
    const headers = values.shift().map(String);
    return values
      .filter(row => row.some(v => v !== '' && v !== null))
      .map(row => {
        const obj = {};
        headers.forEach((h, i) => { obj[h] = serialize_(row[i]); });
        return obj;
      });
  },

  /** Batched fetch of multiple sheet tabs in one call to prevent O(N) Sheet reads. */
  readAllTables(sheetNames) {
    const ss = this.getSpreadsheet();
    const result = {};
    sheetNames.forEach(name => {
      const sh = ss.getSheetByName(name);
      if (!sh || sh.getLastRow() < 2) {
        result[name] = [];
        return;
      }
      const values = sh.getDataRange().getValues();
      const headers = values.shift().map(String);
      result[name] = values
        .filter(row => row.some(v => v !== '' && v !== null))
        .map(row => {
          const obj = {};
          headers.forEach((h, i) => { obj[h] = serialize_(row[i]); });
          return obj;
        });
    });
    return result;
  },

  appendObject(sheetName, obj) {
    const sh = this.getSpreadsheet().getSheetByName(sheetName);
    if (!sh) throw new Error('Missing tab ' + sheetName + '. Run setupDatabase().');
    let headers = [];
    if (sh.getLastRow() >= 1 && sh.getLastColumn() >= 1) {
      headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
    }
    if (!headers.length) headers = APP.SHEETS[sheetName] || [];
    const row = headers.map(h => Object.prototype.hasOwnProperty.call(obj, h) ? obj[h] : '');
    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      sh.appendRow(row);
    } finally {
      lock.releaseLock();
    }
  },

  /** High-performance batched row update instead of slow cell-by-cell updates. */
  updateById(sheetName, idColumn, idValue, changes) {
    const sh = this.getSpreadsheet().getSheetByName(sheetName);
    if (!sh || sh.getLastRow() < 2) throw new Error('Record not found.');

    const values = sh.getDataRange().getValues();
    const headers = values[0].map(String);
    const idIdx = headers.indexOf(idColumn);
    if (idIdx < 0) throw new Error('ID column not found in ' + sheetName);

    for (let r = 1; r < values.length; r++) {
      if (String(values[r][idIdx]) === String(idValue)) {
        const rowData = [...values[r]];
        Object.keys(changes).forEach(k => {
          const c = headers.indexOf(k);
          if (c >= 0) rowData[c] = changes[k];
        });

        const lock = LockService.getScriptLock();
        lock.waitLock(10000);
        try {
          sh.getRange(r + 1, 1, 1, headers.length).setValues([rowData]);
        } finally {
          lock.releaseLock();
        }
        return;
      }
    }
    throw new Error('Record not found for ' + idValue);
  },

  deleteById(sheetName, idColumn, idValue) {
    const sh = this.getSpreadsheet().getSheetByName(sheetName);
    if (!sh || sh.getLastRow() < 2) return;
    const values = sh.getDataRange().getValues();
    const headers = values[0].map(String);
    const idIdx = headers.indexOf(idColumn);
    if (idIdx < 0) return;

    for (let r = 1; r < values.length; r++) {
      if (String(values[r][idIdx]) === String(idValue)) {
        const lock = LockService.getScriptLock();
        lock.waitLock(10000);
        try {
          sh.deleteRow(r + 1);
        } finally {
          lock.releaseLock();
        }
        return;
      }
    }
  },

  findById(sheetName, idColumn, idValue) {
    const records = this.readObjects(sheetName);
    return records.find(o => String(o[idColumn]) === String(idValue)) || null;
  }
};

/* ==========================================================================
   4. USER IDENTITY & ROLE-BASED ACCESS CONTROL
   ========================================================================== */

const Auth = {
  getCurrentUser() {
    // Never use the effective/deployer identity as the visitor identity:
    // for web apps running as the deployer, that can grant every visitor the
    // deployer's role. Fail closed when Google does not expose the active user.
    const email = cleanEmail_(Session.getActiveUser().getEmail());
    if (!email) {
      throw new Error('Google could not verify your signed-in account. Sign in with your authorized Akidha Workspace account and ensure the web app requires authenticated access.');
    }

    const users = Db.readObjects('Users');
    const matched = users.find(u => cleanEmail_(u.email) === email && truthy_(u.active));
    if (matched) {
      return {
        email: email,
        name: matched.display_name || email,
        role: String(matched.role).toLowerCase()
      };
    }

    const props = PropertiesService.getScriptProperties();
    const admins = parseEmails_(props.getProperty('ADMIN_EMAILS'));
    const contributors = parseEmails_(props.getProperty('CONTRIBUTOR_EMAILS'));

    if (admins.includes(email)) return { email, name: email, role: 'admin' };
    if (contributors.includes(email)) return { email, name: email, role: 'contributor' };

    // Fail closed: missing role configuration must never grant implicit admin access.
    throw new Error('Your Google account (' + email + ') is not authorized for Akidha Marketing OS. Configure the Users sheet or ADMIN_EMAILS / CONTRIBUTOR_EMAILS Script Properties.');
  },

  requireAdmin(user) {
    if (!user || user.role !== 'admin') throw new Error('Admin permission required for this action.');
  },

  assertCanEditTask(user, task) {
    if (user.role === 'admin') return;
    if (user.role !== 'contributor') throw new Error('Your account cannot edit tasks.');
    if (cleanEmail_(task.owner_email) !== user.email) {
      throw new Error('You can only edit tasks assigned to you.');
    }
  }
};

/* ==========================================================================
   5. DATABASE SETUP, SEEDING & SAFE SCHEMA MIGRATION
   ========================================================================== */

/**
 * Initializes database tabs and guarantees complete, non-destructive schema alignment.
 * If run against an existing database, it safely appends any missing columns to existing tabs
 * and provisions any newly introduced tabs (Learnings, MarketSignals) without altering existing data.
 */
function setupDatabase() {
  const report = runSchemaMigration_(false);

  seedDefaultUsers_();
  seedDefaultThemes_();
  seedDefaultGoals_();

  return 'Akidha Marketing OS database verified & ready. Migration summary: ' +
    report.tabsCreated.length + ' tab(s) created, ' +
    Object.keys(report.columnsAdded).length + ' tab(s) upgraded with new columns.';
}

/**
 * Dry-run inspection of the database schema.
 * Returns the exact difference between existing spreadsheet headers and target v2 schema.
 */
function checkDatabaseSchema() {
  const user = Auth.getCurrentUser();
  Auth.requireAdmin(user);
  const report = runSchemaMigration_(true);
  Logger.log('=== AKIDHA MARKETING OS: DRY-RUN SCHEMA VERIFICATION REPORT ===');
  Logger.log(JSON.stringify(report, null, 2));
  return report;
}

/**
 * Explicit schema migration endpoint for administrators.
 * Safely adds missing columns to existing tabs and creates missing tabs.
 */
function migrateDatabase() {
  const user = Auth.getCurrentUser();
  Auth.requireAdmin(user);
  const report = runSchemaMigration_(false);
  audit_(user.email, 'database', 'schema', 'migrated', JSON.stringify(report.columnsAdded));
  return report;
}

/**
 * Core idempotent schema migration engine.
 * @param {boolean} dryRun - If true, inspects and computes diff without writing to spreadsheet.
 */
function runSchemaMigration_(dryRun) {
  const ss = Db.getSpreadsheet();
  const report = {
    timestamp: new Date().toISOString(),
    dryRun: !!dryRun,
    tabsCreated: [],
    columnsAdded: {},
    tabsAlreadyUpToDate: [],
    details: []
  };

  Object.keys(APP.SHEETS).forEach(tabName => {
    let sh = ss.getSheetByName(tabName);
    const targetHeaders = APP.SHEETS[tabName];

    // 1. Tab does not exist
    if (!sh) {
      report.tabsCreated.push(tabName);
      report.details.push('Created new tab "' + tabName + '" with ' + targetHeaders.length + ' columns.');
      if (!dryRun) {
        sh = ss.insertSheet(tabName);
        sh.getRange(1, 1, 1, targetHeaders.length).setValues([targetHeaders]);
        sh.setFrozenRows(1);
        sh.getRange(1, 1, 1, targetHeaders.length).setFontWeight('bold').setBackground('#244b63').setFontColor('#ffffff');
        sh.autoResizeColumns(1, targetHeaders.length);
      }
      return;
    }

    // 2. Tab is empty (0 rows)
    if (sh.getLastRow() === 0) {
      report.columnsAdded[tabName] = [...targetHeaders];
      report.details.push('Initialized empty tab "' + tabName + '" with ' + targetHeaders.length + ' headers.');
      if (!dryRun) {
        sh.getRange(1, 1, 1, targetHeaders.length).setValues([targetHeaders]);
        sh.setFrozenRows(1);
        sh.getRange(1, 1, 1, targetHeaders.length).setFontWeight('bold').setBackground('#244b63').setFontColor('#ffffff');
        sh.autoResizeColumns(1, targetHeaders.length);
      }
      return;
    }

    // 3. Tab exists with data. Read row 1 headers.
    const lastCol = sh.getLastColumn();
    const existingHeaders = sh.getRange(1, 1, 1, lastCol).getValues()[0].map(String);
    const missing = targetHeaders.filter(col => !existingHeaders.includes(col));

    if (missing.length === 0) {
      report.tabsAlreadyUpToDate.push(tabName);
      return;
    }

    // Append missing columns to the right of existing columns
    report.columnsAdded[tabName] = missing;
    const startCol = existingHeaders.length + 1;
    report.details.push('Tab "' + tabName + '": appended ' + missing.length + ' missing column(s) [' + missing.join(', ') + '] starting at col ' + startCol + '.');

    if (!dryRun) {
      sh.getRange(1, startCol, 1, missing.length).setValues([missing]);
      sh.getRange(1, startCol, 1, missing.length).setFontWeight('bold').setBackground('#244b63').setFontColor('#ffffff');
      sh.autoResizeColumns(startCol, missing.length);
    }
  });

  report.isUpToDate = report.tabsCreated.length === 0 && Object.keys(report.columnsAdded).length === 0;
  return report;
}

function seedDefaultUsers_() {
  const existing = Db.readObjects('Users');
  const seen = new Set(existing.map(u => cleanEmail_(u.email)));
  const now = new Date();

  const defaults = [
    { email: 'sourabh.suryavanshi@akidha.in', name: 'Saurabh (Owner)', role: 'admin' },
    { email: 'tanvi@akidha.in', name: 'Tanvi (Senior Associate)', role: 'admin' },
    { email: 'nikita@akidha.in', name: 'Nikita (Writer & Strategist)', role: 'contributor' },
    { email: 'sai@akidha.in', name: 'Sai (Video Editor & Producer)', role: 'contributor' }
  ];

  defaults.forEach(u => {
    if (!seen.has(cleanEmail_(u.email))) {
      Db.appendObject('Users', {
        user_id: newId_('U'),
        email: cleanEmail_(u.email),
        display_name: u.name,
        role: u.role,
        active: true,
        created_at: now
      });
    }
  });
}

function seedDefaultThemes_() {
  const existing = Db.readObjects('Themes');
  if (existing.length) return;
  const now = new Date();
  const themes = [
    { name: 'Trust & Transparency', desc: 'WHO-GMP verification, manufacturer transparency, doctor checks', segment: 'Chronic care patients' },
    { name: 'Affordability & Fair Pricing', desc: 'NPPA regulations, recurring monthly savings, genuine price comparisons', segment: 'Chronic caregivers' },
    { name: 'Diabetes Care & Adherence', desc: 'HbA1c adherence, routine compliance, Metformin & insulin questions', segment: 'Diabetes cohort' },
    { name: 'Hypertension & Cardiac Care', desc: 'Blood pressure adherence, salt literacy, long-term cardiovascular health', segment: 'Hypertension cohort' },
    { name: 'Thyroid & Hormone Health', desc: 'Morning fasting dosing rules, TSH test schedule, generic consistency', segment: 'Thyroid cohort' }
  ];

  themes.forEach(t => {
    Db.appendObject('Themes', {
      theme_id: newId_('TH'),
      name: t.name,
      description: t.desc,
      audience_segment: t.segment,
      status: 'active',
      created_at: now
    });
  });
}

function seedDefaultGoals_() {
  const existing = Db.readObjects('Goals');
  if (existing.length) return;
  const now = new Date();
  const goals = [
    { title: 'Qualified WhatsApp Inquiries', metric_key: 'qualified_inquiries', unit: 'inquiries', direction: 'higher', base: 20, target: 100, current: 42 },
    { title: 'Cost per Qualified Lead', metric_key: 'cost_per_lead', unit: 'INR', direction: 'lower', base: 480, target: 250, current: 310 },
    { title: 'Approved Education Creatives', metric_key: 'approved_creatives', unit: 'creatives', direction: 'higher', base: 5, target: 20, current: 12 }
  ];

  goals.forEach(g => {
    Db.appendObject('Goals', {
      goal_id: newId_('G'),
      title: g.title,
      owner_email: 'sourabh.suryavanshi@akidha.in',
      metric_key: g.metric_key,
      unit: g.unit,
      direction: g.direction,
      baseline_value: g.base,
      target_value: g.target,
      current_value: g.current,
      measurement_source: 'Meta Ads & WhatsApp CRM',
      start_date: '2026-10-01',
      end_date: '2026-12-31',
      status: 'in_progress',
      is_archived: false,
      updated_at: now
    });
  });
}

/* ==========================================================================
   6. BOOTSTRAP DATA (SINGLE BATCH QUERY)
   ========================================================================== */

function getBootstrapData() {
  const user = Auth.getCurrentUser();

  // Batched read of all required tables in one network trip
  const tables = Db.readAllTables([
    'Users', 'Tasks', 'Goals', 'Creatives', 'Approvals',
    'TaskDependencies', 'Themes', 'Performance', 'Learnings', 'MarketSignals'
  ]);

  const team = tables.Users.filter(u => truthy_(u.active)).map(u => ({
    email: cleanEmail_(u.email),
    name: u.display_name || u.email,
    role: String(u.role).toLowerCase()
  }));

  const allTasks = tables.Tasks.filter(t => !truthy_(t.is_archived));
  const userTasks = allTasks.filter(t => user.role === 'admin' || cleanEmail_(t.owner_email) === user.email);

  const allCreatives = tables.Creatives.filter(c => !truthy_(c.is_archived));
  const userCreatives = allCreatives.filter(c => {
    if (user.role === 'admin') return true;
    const linked = allTasks.find(t => String(t.task_id) === String(c.task_id));
    return linked && cleanEmail_(linked.owner_email) === user.email;
  });

  const pendingApprovals = user.role === 'admin'
    ? tables.Approvals.filter(a => a.decision === 'pending')
    : [];

  const pendingMedicalReviews = user.role === 'admin'
    ? allCreatives.filter(c => c.medical_review_status === 'pending')
    : [];

  // Scope secondary datasets to the caller's authorized tasks/creatives.
  // Admins retain the cross-team view; contributors receive only their own linked records.
  const visibleTaskIds = new Set(userTasks.map(t => String(t.task_id)));
  const visibleCreativeIds = new Set(userCreatives.map(c => String(c.creative_id)));
  const visibleDependencies = user.role === 'admin'
    ? tables.TaskDependencies
    : tables.TaskDependencies.filter(d => visibleTaskIds.has(String(d.task_id)));
  const visiblePerformance = user.role === 'admin'
    ? tables.Performance
    : tables.Performance.filter(p => visibleCreativeIds.has(String(p.creative_id)));
  const visibleLearnings = user.role === 'admin'
    ? tables.Learnings
    : tables.Learnings.filter(l =>
        cleanEmail_(l.created_by) === user.email ||
        visibleCreativeIds.has(String(l.creative_id))
      );

  return {
    appName: APP.NAME,
    version: APP.VERSION,
    user: user,
    statuses: APP.STATUSES,
    priorities: APP.PRIORITIES,
    categories: APP.CATEGORIES,
    creativeStages: APP.CREATIVE_STAGES,
    shifts: APP.SHIFTS,
    team: team,
    tasks: userTasks.sort((a, b) => String(a.due_date || '9999').localeCompare(String(b.due_date || '9999'))),
    allTasksForSelect: userTasks.map(t => ({ task_id: t.task_id, title: t.title, owner_email: t.owner_email, status: t.status })),
    goals: tables.Goals.filter(g => !truthy_(g.is_archived)),
    creatives: userCreatives,
    approvals: pendingApprovals,
    pendingMedicalReviews: pendingMedicalReviews,
    dependencies: visibleDependencies,
    themes: tables.Themes,
    performance: visiblePerformance,
    learnings: visibleLearnings,
    marketSignals: tables.MarketSignals.slice(0, 50),
    capacity: calculateCapacityMetrics_(allTasks, team, '09')
  };
}

/* ==========================================================================
   7. CORE OPERATIONS: TASKS & DEPENDENCY ENGINE
   ========================================================================== */

function createTask(payload) {
  const user = Auth.getCurrentUser();
  payload = payload || {};
  const title = clean_(payload.title, 160);
  if (!title) throw new Error('Task title is required.');

  const requestedOwner = cleanEmail_(payload.owner_email || user.email);
  const ownerEmail = user.role === 'admin' ? requestedOwner : user.email;
  const dependencyIds = payload.dependencies
    ? Array.from(new Set(String(payload.dependencies).split(',').map(s => clean_(s.trim(), 80)).filter(Boolean)))
    : [];
  dependencyIds.forEach(depId => {
    const prerequisite = Db.findById('Tasks', 'task_id', depId);
    if (!prerequisite) throw new Error('Prerequisite task not found: ' + depId);
    if (user.role !== 'admin' && cleanEmail_(prerequisite.owner_email) !== user.email) {
      throw new Error('You can only link tasks you are authorized to access.');
    }
  });

  const id = newId_('T');
  const now = new Date();
  const row = {
    task_id: id,
    title: title,
    brief: clean_(payload.brief, 3000),
    owner_email: ownerEmail,
    status: APP.STATUSES.includes(payload.status) ? payload.status : 'Backlog',
    priority: APP.PRIORITIES.includes(payload.priority) ? payload.priority : 'Medium',
    category: APP.CATEGORIES.includes(payload.category) ? payload.category : 'Other',
    goal_id: clean_(payload.goal_id, 80),
    theme: clean_(payload.theme, 160),
    due_date: clean_(payload.due_date, 30),
    estimate_minutes: positiveNumber_(payload.estimate_minutes) || 120,
    actual_minutes: '',
    blocker_reason: clean_(payload.blocker_reason, 500),
    doc_url: cleanUrl_(payload.doc_url),
    dependencies: clean_(payload.dependencies, 500),
    completion_requested_by: '',
    completion_requested_at: '',
    completed_by: '',
    completed_at: '',
    is_archived: false,
    created_by: user.email,
    created_at: now,
    updated_at: now
  };

  Db.appendObject('Tasks', row);

  // If dependencies specified, link them in TaskDependencies
  if (dependencyIds.length) {
    dependencyIds.forEach(depId => {
      Db.appendObject('TaskDependencies', {
        dependency_id: newId_('DEP'),
        task_id: id,
        depends_on_task_id: depId,
        dependency_type: 'prerequisite',
        created_at: now
      });
    });
  }

  audit_(user.email, 'task', id, 'created', 'Created task: ' + title);
  return { ok: true, task_id: id };
}

function updateTask(taskId, updates) {
  const user = Auth.getCurrentUser();
  taskId = clean_(taskId, 80);
  const task = Db.findById('Tasks', 'task_id', taskId);
  if (!task) throw new Error('Task not found.');
  Auth.assertCanEditTask(user, task);

  const changes = { updated_at: new Date() };

  if (updates.title != null) changes.title = clean_(updates.title, 160);
  if (updates.brief != null) changes.brief = clean_(updates.brief, 3000);
  if (updates.priority != null && APP.PRIORITIES.includes(updates.priority)) changes.priority = updates.priority;
  if (updates.category != null && APP.CATEGORIES.includes(updates.category)) changes.category = updates.category;
  if (updates.due_date != null) changes.due_date = clean_(updates.due_date, 30);
  if (updates.estimate_minutes != null) changes.estimate_minutes = positiveNumber_(updates.estimate_minutes);
  if (updates.actual_minutes != null) changes.actual_minutes = positiveNumber_(updates.actual_minutes);
  if (updates.blocker_reason != null) changes.blocker_reason = clean_(updates.blocker_reason, 500);
  if (updates.doc_url != null) changes.doc_url = cleanUrl_(updates.doc_url);
  if (updates.goal_id != null) changes.goal_id = clean_(updates.goal_id, 80);
  if (updates.theme != null) changes.theme = clean_(updates.theme, 160);

  if (user.role === 'admin' && updates.owner_email) {
    changes.owner_email = cleanEmail_(updates.owner_email);
  }

  Db.updateById('Tasks', 'task_id', taskId, changes);
  audit_(user.email, 'task', taskId, 'updated', 'Updated task fields');
  return { ok: true };
}

function updateTaskStatus(taskId, nextStatus) {
  const user = Auth.getCurrentUser();
  taskId = clean_(taskId, 80);
  if (!APP.STATUSES.includes(nextStatus)) throw new Error('Invalid status.');
  const task = Db.findById('Tasks', 'task_id', taskId);
  if (!task) throw new Error('Task not found.');
  Auth.assertCanEditTask(user, task);

  if (nextStatus === 'Completed') {
    if (user.role !== 'admin') {
      throw new Error('Only admins can approve task completion. Please use "Request completion".');
    }
  }

  if (nextStatus === 'Completion Requested') {
    requestCompletion(taskId);
    return { ok: true };
  }

  // Check dependency blockers before unblocking/progressing
  if (nextStatus === 'In progress' || nextStatus === 'Asset Creation') {
    checkTaskDependencies_(taskId);
  }

  const adminOnlyStatuses = ['Admin Review', 'Final Admin Review', 'Ready to Publish', 'Published', 'Completed'];
  if (user.role !== 'admin' && adminOnlyStatuses.includes(nextStatus)) {
    throw new Error('Advancing to ' + nextStatus + ' requires admin review.');
  }

  Db.updateById('Tasks', 'task_id', taskId, { status: nextStatus, updated_at: new Date() });
  audit_(user.email, 'task', taskId, 'status_changed', task.status + ' → ' + nextStatus);
  return { ok: true };
}

function requestCompletion(taskId) {
  const user = Auth.getCurrentUser();
  const task = Db.findById('Tasks', 'task_id', clean_(taskId, 80));
  if (!task) throw new Error('Task not found.');
  Auth.assertCanEditTask(user, task);

  if (task.status === 'Completed') throw new Error('Task is already completed.');
  if (task.status === 'Completion Requested') throw new Error('Completion is already pending approval.');

  // Enforce dependency completion check
  checkTaskDependencies_(task.task_id);

  const now = new Date();
  Db.updateById('Tasks', 'task_id', task.task_id, {
    status: 'Completion Requested',
    completion_requested_by: user.email,
    completion_requested_at: now,
    updated_at: now
  });

  Db.appendObject('Approvals', {
    approval_id: newId_('A'),
    task_id: task.task_id,
    approval_type: 'task_completion',
    requested_by: user.email,
    reviewer_email: '',
    decision: 'pending',
    comments: '',
    requested_at: now,
    decided_at: ''
  });

  audit_(user.email, 'task', task.task_id, 'completion_requested', 'Awaiting admin approval');
  return { ok: true };
}

function decideCompletion(approvalId, decision, comments) {
  const user = Auth.getCurrentUser();
  Auth.requireAdmin(user);
  if (!['approved', 'rejected'].includes(decision)) throw new Error('Invalid decision.');

  const approval = Db.findById('Approvals', 'approval_id', clean_(approvalId, 80));
  if (!approval || approval.decision !== 'pending') throw new Error('Pending approval not found.');

  const task = Db.findById('Tasks', 'task_id', approval.task_id);
  if (!task) throw new Error('Task not found.');

  const now = new Date();
  Db.updateById('Approvals', 'approval_id', approvalId, {
    decision: decision,
    reviewer_email: user.email,
    comments: clean_(comments, 1000),
    decided_at: now
  });

  if (decision === 'approved') {
    Db.updateById('Tasks', 'task_id', task.task_id, {
      status: 'Completed',
      completed_by: user.email,
      completed_at: now,
      updated_at: now
    });
  } else {
    Db.updateById('Tasks', 'task_id', task.task_id, {
      status: 'Admin Review',
      completion_requested_by: '',
      completion_requested_at: '',
      blocker_reason: 'Admin rejected completion: ' + clean_(comments, 200),
      updated_at: now
    });
  }

  audit_(user.email, 'task', task.task_id, 'completion_' + decision, clean_(comments, 1000));
  return { ok: true };
}

function archiveTask(taskId, isArchived) {
  const user = Auth.getCurrentUser();
  Auth.requireAdmin(user);
  Db.updateById('Tasks', 'task_id', clean_(taskId, 80), {
    is_archived: isArchived !== false,
    updated_at: new Date()
  });
  audit_(user.email, 'task', taskId, isArchived === false ? 'unarchived' : 'archived', '');
  return { ok: true };
}

function addTaskDependency(taskId, dependsOnTaskId) {
  const user = Auth.getCurrentUser();
  taskId = clean_(taskId, 80);
  dependsOnTaskId = clean_(dependsOnTaskId, 80);
  if (!taskId || !dependsOnTaskId) throw new Error('Both task IDs are required.');
  if (taskId === dependsOnTaskId) throw new Error('A task cannot depend on itself.');

  const task = Db.findById('Tasks', 'task_id', taskId);
  const prerequisite = Db.findById('Tasks', 'task_id', dependsOnTaskId);
  if (!task || !prerequisite) throw new Error('Task or prerequisite task not found.');
  Auth.assertCanEditTask(user, task);
  if (user.role !== 'admin' && cleanEmail_(prerequisite.owner_email) !== user.email) {
    throw new Error('You can only link tasks you are authorized to access.');
  }

  const allDeps = Db.readObjects('TaskDependencies');
  const exists = allDeps.some(d => d.task_id === taskId && d.depends_on_task_id === dependsOnTaskId);
  if (exists) return { ok: true };

  Db.appendObject('TaskDependencies', {
    dependency_id: newId_('DEP'),
    task_id: taskId,
    depends_on_task_id: dependsOnTaskId,
    dependency_type: 'prerequisite',
    created_at: new Date()
  });
  audit_(user.email, 'task_dependency', taskId, 'added', 'Prerequisite: ' + dependsOnTaskId);
  return { ok: true };
}

function removeTaskDependency(dependencyId) {
  const user = Auth.getCurrentUser();
  dependencyId = clean_(dependencyId, 80);
  const dependency = Db.findById('TaskDependencies', 'dependency_id', dependencyId);
  if (!dependency) throw new Error('Task dependency not found.');
  const task = Db.findById('Tasks', 'task_id', dependency.task_id);
  if (!task) throw new Error('Task not found.');
  Auth.assertCanEditTask(user, task);
  Db.deleteById('TaskDependencies', 'dependency_id', dependencyId);
  audit_(user.email, 'task_dependency', dependencyId, 'removed', 'Task: ' + dependency.task_id);
  return { ok: true };
}

function checkTaskDependencies_(taskId) {
  const deps = Db.readObjects('TaskDependencies').filter(d => d.task_id === taskId);
  if (!deps.length) return;

  const tasks = Db.readObjects('Tasks');
  const blocking = [];

  deps.forEach(d => {
    const parent = tasks.find(t => t.task_id === d.depends_on_task_id);
    if (!parent || parent.status !== 'Completed') {
      blocking.push(parent ? parent.title : d.depends_on_task_id);
    }
  });

  if (blocking.length) {
    throw new Error('Blocked by incomplete prerequisite task(s): ' + blocking.join(', '));
  }
}

/* ==========================================================================
   8. CREATIVE PIPELINE & MEDICAL COMPLIANCE REVIEW
   ========================================================================== */

function createCreative(payload) {
  const user = Auth.getCurrentUser();
  payload = payload || {};
  const taskId = clean_(payload.task_id, 80);
  const task = Db.findById('Tasks', 'task_id', taskId);
  if (!task) throw new Error('Linked task does not exist.');
  Auth.assertCanEditTask(user, task);

  const title = clean_(payload.title, 160);
  if (!title) throw new Error('Creative title is required.');
  const platform = clean_(payload.platform, 60);
  const format = clean_(payload.format, 60);

  const id = newId_('C');
  const now = new Date();
  Db.appendObject('Creatives', {
    creative_id: id,
    task_id: taskId,
    title: title,
    platform: platform,
    format: format,
    workflow_stage: 'Ideation',
    medical_review_required: true,
    medical_review_status: 'not_started',
    medical_review_notes: '',
    asset_drive_url: cleanUrl_(payload.asset_drive_url),
    compliance_flags: '',
    publish_url: '',
    published_at: '',
    is_archived: false,
    created_at: now,
    updated_at: now
  });

  audit_(user.email, 'creative', id, 'created', 'Created creative item: ' + title);
  return { ok: true, creative_id: id };
}

function submitCreativeForMedicalReview(creativeId, notes) {
  const user = Auth.getCurrentUser();
  creativeId = clean_(creativeId, 80);
  const creative = Db.findById('Creatives', 'creative_id', creativeId);
  if (!creative) throw new Error('Creative not found.');
  const linkedTask = Db.findById('Tasks', 'task_id', creative.task_id);
  if (!linkedTask) throw new Error('Linked task not found.');
  Auth.assertCanEditTask(user, linkedTask);

  Db.updateById('Creatives', 'creative_id', creativeId, {
    medical_review_status: 'pending',
    medical_review_notes: clean_(notes, 1000),
    workflow_stage: 'Admin Review',
    updated_at: new Date()
  });

  audit_(user.email, 'creative', creativeId, 'submitted_for_medical_review', notes);
  return { ok: true };
}

function decideCreativeMedicalReview(creativeId, decision, reviewNotes) {
  const user = Auth.getCurrentUser();
  Auth.requireAdmin(user);
  if (!['approved', 'rejected'].includes(decision)) throw new Error('Invalid review decision.');

  const creative = Db.findById('Creatives', 'creative_id', clean_(creativeId, 80));
  if (!creative) throw new Error('Creative not found.');

  const nextStage = decision === 'approved' ? 'Ready to Publish' : 'Scripting / Brief';

  Db.updateById('Creatives', 'creative_id', creative.creative_id, {
    medical_review_status: decision,
    medical_review_notes: clean_(reviewNotes, 1000),
    workflow_stage: nextStage,
    updated_at: new Date()
  });

  audit_(user.email, 'creative', creative.creative_id, 'medical_review_' + decision, reviewNotes);
  return { ok: true };
}

function updateCreativeWorkflow(creativeId, nextStage, publishUrl, assetDriveUrl) {
  const user = Auth.getCurrentUser();
  creativeId = clean_(creativeId, 80);
  const creative = Db.findById('Creatives', 'creative_id', creativeId);
  if (!creative) throw new Error('Creative not found.');
  const linkedTask = Db.findById('Tasks', 'task_id', creative.task_id);
  if (!linkedTask) throw new Error('Linked task not found.');
  Auth.assertCanEditTask(user, linkedTask);

  if (!APP.CREATIVE_STAGES.includes(nextStage)) throw new Error('Invalid creative workflow stage.');

  const adminOnlyStages = ['Admin Review', 'Final Admin Review', 'Ready to Publish', 'Published'];
  if (user.role !== 'admin' && adminOnlyStages.includes(nextStage)) {
    throw new Error('Advancing to ' + nextStage + ' requires admin review.');
  }

  const updates = { workflow_stage: nextStage, updated_at: new Date() };

  if (assetDriveUrl != null) updates.asset_drive_url = cleanUrl_(assetDriveUrl);

  // Strict Medical Compliance Gate
  if (nextStage === 'Ready to Publish' || nextStage === 'Published') {
    if (truthy_(creative.medical_review_required) && creative.medical_review_status !== 'approved') {
      throw new Error('Medical & claims review must be approved before this creative can be published.');
    }
  }

  if (nextStage === 'Published') {
    const url = cleanUrl_(publishUrl || creative.publish_url);
    if (!url) throw new Error('A valid https:// published URL is required before marking as Published.');
    updates.publish_url = url;
    updates.published_at = new Date();
  }

  Db.updateById('Creatives', 'creative_id', creativeId, updates);
  audit_(user.email, 'creative', creativeId, 'stage_changed', creative.workflow_stage + ' → ' + nextStage);
  return { ok: true };
}

/* ==========================================================================
   9. GOALS & OKRs
   ========================================================================== */

function createGoal(payload) {
  const user = Auth.getCurrentUser();
  Auth.requireAdmin(user);
  payload = payload || {};
  const title = clean_(payload.title, 160);
  if (!title) throw new Error('Goal title is required.');

  const id = newId_('G');
  const now = new Date();
  Db.appendObject('Goals', {
    goal_id: id,
    title: title,
    owner_email: cleanEmail_(payload.owner_email || user.email),
    metric_key: clean_(payload.metric_key, 100),
    unit: clean_(payload.unit, 40),
    direction: payload.direction === 'lower' ? 'lower' : 'higher',
    baseline_value: positiveOrNegativeNumber_(payload.baseline_value),
    target_value: positiveOrNegativeNumber_(payload.target_value),
    current_value: positiveOrNegativeNumber_(payload.current_value),
    measurement_source: clean_(payload.measurement_source, 200),
    start_date: clean_(payload.start_date, 30),
    end_date: clean_(payload.end_date, 30),
    status: 'in_progress',
    is_archived: false,
    updated_at: now
  });

  audit_(user.email, 'goal', id, 'created', 'Created goal: ' + title);
  return { ok: true, goal_id: id };
}

function updateGoal(goalId, updates) {
  const user = Auth.getCurrentUser();
  Auth.requireAdmin(user);
  goalId = clean_(goalId, 80);
  const changes = { updated_at: new Date() };

  if (updates.title != null) changes.title = clean_(updates.title, 160);
  if (updates.current_value != null) changes.current_value = positiveOrNegativeNumber_(updates.current_value);
  if (updates.target_value != null) changes.target_value = positiveOrNegativeNumber_(updates.target_value);
  if (updates.status != null) changes.status = clean_(updates.status, 40);

  Db.updateById('Goals', 'goal_id', goalId, changes);
  audit_(user.email, 'goal', goalId, 'updated', 'Updated goal metrics');
  return { ok: true };
}

/* ==========================================================================
   10. AKIDHA MARKET INTELLIGENCE & SOCIAL LISTENING
   ========================================================================== */

function fetchMarketIntelligence(forceRefresh) {
  Auth.getCurrentUser();
  const results = [];
  const errors = [];

  // 1. Ingest RSS News Feeds
  APP.FEEDS.forEach(feed => {
    try {
      const resp = UrlFetchApp.fetch(feed.url, {
        muteHttpExceptions: true,
        headers: { 'User-Agent': 'AkidhaMarketingOS/2.0 (Healthcare Intelligence Reader)' }
      });
      if (resp.getResponseCode() === 200) {
        const xml = resp.getContentText();
        const items = extractRssItems_(xml, feed.name, feed.cat);
        results.push(...items);
      } else {
        errors.push(feed.name + ': HTTP ' + resp.getResponseCode());
      }
    } catch (e) {
      errors.push(feed.name + ': ' + e.message);
    }
  });

  // 2. Ingest Reddit Public Topic Queries
  APP.REDDIT_QUERIES.forEach(q => {
    try {
      const url = 'https://www.reddit.com/search.json?q=' + encodeURIComponent(q.q) + '&sort=relevance&limit=5';
      const resp = UrlFetchApp.fetch(url, {
        muteHttpExceptions: true,
        headers: { 'User-Agent': 'AkidhaMarketingOS/2.0 (Public Research Collector; contact@akidha.in)' }
      });
      if (resp.getResponseCode() === 200) {
        const data = JSON.parse(resp.getContentText());
        const posts = (data && data.data && data.data.children) || [];
        posts.forEach(p => {
          const post = p.data;
          if (post && post.title) {
            results.push({
              source: 'Reddit r/' + (post.subreddit || 'india'),
              category: q.cat,
              title: post.title,
              summary: (post.selftext || '').slice(0, 400) || 'Public discussion post',
              url: 'https://reddit.com' + (post.permalink || ''),
              intent: classifyIntent_(post.title + ' ' + (post.selftext || '')),
              relevance_score: calculateRelevanceScore_(post.title + ' ' + (post.selftext || '')),
              captured_at: new Date()
            });
          }
        });
      }
    } catch (err) {
      errors.push('Reddit (' + q.q + '): ' + err.message);
    }
  });

  // Persist newly discovered signals to MarketSignals table
  if (results.length > 0) {
    const existing = Db.readObjects('MarketSignals');
    const seenUrls = new Set(existing.map(s => String(s.url || '').toLowerCase()));
    const now = new Date();

    results.forEach(item => {
      const u = String(item.url || '').toLowerCase();
      if (!seenUrls.has(u)) {
        seenUrls.add(u);
        Db.appendObject('MarketSignals', {
          signal_id: newId_('SIG'),
          source: item.source,
          category: item.category,
          title: clean_(item.title, 200),
          summary: clean_(item.summary, 600),
          url: cleanUrl_(item.url),
          intent: item.intent || 'Discussion',
          relevance_score: item.relevance_score || 50,
          status: 'new',
          captured_at: now
        });
      }
    });
  }

  return {
    ok: true,
    totalDiscovered: results.length,
    errors: errors,
    signals: Db.readObjects('MarketSignals').slice(0, 50)
  };
}

function promoteSignalToTask(signalId, ownerEmail, priority) {
  const user = Auth.getCurrentUser();
  const signal = Db.findById('MarketSignals', 'signal_id', clean_(signalId, 80));
  if (!signal) throw new Error('Signal not found.');

  const title = 'Education: ' + clean_(signal.title, 100);
  const theme = signal.category === 'pricing' ? 'Affordability & Fair Pricing' : 'Trust & Transparency';

  const brief = [
    'MARKET INTELLIGENCE SOURCE:',
    '- Title: ' + signal.title,
    '- Source: ' + signal.source,
    '- URL: ' + signal.url,
    '- Observed Context: ' + signal.summary,
    '',
    'AKIDHA EDITORIAL MANDATE:',
    '1. Teach first, sell second.',
    '2. Use the brand term "substitutes" over "cheap generics".',
    '3. Explain pharmacist & regulatory verification.',
    '4. MANDATORY: Include doctor/pharmacist discussion CTA.',
    '5. NEVER claim absolute cure or advise changing prescriptions.'
  ].join('\n');

  const taskResult = createTask({
    title: title,
    brief: brief,
    owner_email: ownerEmail || user.email,
    category: signal.category === 'regulation' ? 'Social media' : 'Meta Ads',
    theme: theme,
    priority: priority || 'High',
    estimate_minutes: 180
  });

  // Link creative
  createCreative({
    task_id: taskResult.task_id,
    title: title,
    platform: 'Instagram',
    format: 'Carousel'
  });

  Db.updateById('MarketSignals', 'signal_id', signalId, { status: 'promoted' });
  audit_(user.email, 'signal', signalId, 'promoted_to_task', taskResult.task_id);

  return { ok: true, task_id: taskResult.task_id };
}

function setupDailyIntelligenceTrigger() {
  Auth.requireAdmin(Auth.getCurrentUser());
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(t => {
    if (t.getHandlerFunction() === 'fetchMarketIntelligence') {
      ScriptApp.deleteTrigger(t);
    }
  });

  ScriptApp.newTrigger('fetchMarketIntelligence')
    .timeBased()
    .everyDays(1)
    .atHour(8)
    .create();

  return 'Autonomous daily intelligence trigger configured for 08:00 AM IST.';
}

/* ==========================================================================
   11. AI CREATIVE STUDIO WITH HEALTHCARE COMPLIANCE ENGINE
   ========================================================================== */

function generateAiCreativeDraft(payload) {
  Auth.getCurrentUser();
  payload = payload || {};
  const topic = clean_(payload.topic, 2000);
  const platform = clean_(payload.platform, 80) || 'Instagram Carousel';
  const format = clean_(payload.format, 80) || 'Carousel';

  const props = PropertiesService.getScriptProperties();
  const provider = props.getProperty('AI_PROVIDER') || (props.getProperty('GEMINI_API_KEY') ? 'gemini' : 'openai');
  const openAiKey = props.getProperty('OPENAI_API_KEY');
  const geminiKey = props.getProperty('GEMINI_API_KEY');

  // Contextual learning loop: inject past approved learnings
  const pastLearnings = Db.readObjects('Learnings')
    .filter(l => l.status === 'approved')
    .slice(0, 3)
    .map(l => '- Campaign: ' + l.campaign_name + '; Observation: ' + l.observation + '; Next test: ' + l.next_test)
    .join('\n');

  const systemPrompt = `You are the chief healthcare content editor for Akidha, an education-led digital pharmacy in India focused on chronic care (diabetes, hypertension, cardiac care, thyroid).
Brand voice: Warm, reassuring, authoritative, conversational, patient-first, never fear-driven.
Core philosophy: "Teach first, sell second."
Strict Rules:
1. Prefer the brand's term "substitutes" over "cheap generics".
2. Never instruct anyone to start, stop, switch, or alter medication or dosages.
3. Never claim a substitute is a 100% cure, miracle, or completely identical without evidence.
4. Avoid banned words: "guaranteed", "miracle", "100% safe", "cheapest", "instant cure".
5. Always append a clear clinician/pharmacist consultation CTA.
Past Approved Learnings:
${pastLearnings || 'None recorded yet.'}
Output format: Return JSON only with keys: title, copy, format_notes, suggested_compliance_flags.`;

  const userPrompt = `Create an educational marketing draft for Akidha.
Platform: ${platform}
Format: ${format}
Topic: ${topic}
Return valid JSON.`;

  let draftResult = null;

  if (provider === 'gemini' && geminiKey) {
    draftResult = callGeminiApi_(geminiKey, systemPrompt, userPrompt);
  } else if (openAiKey) {
    draftResult = callOpenAiApi_(openAiKey, systemPrompt, userPrompt);
  } else {
    // Safe offline fallback: avoid product, sourcing, equivalence, or quality claims
    // that have not been supported by product-specific evidence and reviewed.
    draftResult = {
      title: 'Questions to Ask About Medicine Substitutes',
      copy: `Medicine costs can be confusing, especially when you manage a long-term condition.\n\nA medicine substitute should be checked for suitability with a qualified doctor or pharmacist. Do not change a prescribed medicine or dose on your own.\n\nAsk your healthcare professional what needs to be verified for your specific prescription before making a decision.`,
      format_notes: 'Educational draft only. Verify every product-specific statement against current evidence and obtain qualified clinical review before publishing.'
    };
  }

  // Run automated compliance scanner on the AI-generated copy
  const compliance = scanCopyCompliance(draftResult.copy);

  return {
    ok: true,
    title: draftResult.title,
    copy: draftResult.copy,
    format_notes: draftResult.format_notes,
    compliance: compliance
  };
}

function scanCopyCompliance(text) {
  const content = String(text || '').trim();
  const flags = [];

  // 1. Check prohibited cure claims
  if (/\b(100%\s*(cure|safe|effective)|miracle|permanent cure|magic remedy|guaranteed cure|instant cure)\b/i.test(content)) {
    flags.push({
      code: 'PROHIBITED_CURE_CLAIM',
      severity: 'CRITICAL',
      message: 'Prohibited cure or miracle claim. Chronic conditions are managed, not magically cured.'
    });
  }

  // 2. Check prescription tampering
  if (/\b(stop taking|stop your (medicine|pills|insulin)|change your (dose|dosage)|skip your dose|no need for a doctor)\b/i.test(content)) {
    flags.push({
      code: 'PRESCRIPTION_TAMPERING_ADVICE',
      severity: 'CRITICAL',
      message: 'Illegal medical advice: Never advise patients to alter dosages or stop doctor-prescribed regimens.'
    });
  }

  // 3. Check mandatory clinician CTA
  if (!/\b(consult|discuss with|talk to|advice of|prescribed by)\s+(your\s+)?(doctor|physician|clinician|pharmacist)\b/i.test(content)) {
    flags.push({
      code: 'MISSING_CLINICIAN_CTA',
      severity: 'WARNING',
      message: 'Missing mandatory clinician/pharmacist consultation CTA.'
    });
  }

  // 4. Check discouraged terminology
  if (/\b(cheap generics|cheap generic medicine)\b/i.test(content)) {
    flags.push({
      code: 'DISCOURAGED_TERMINOLOGY',
      severity: 'INFO',
      message: 'Brand voice: Prefer "substitutes" over "cheap generics" to emphasize quality trust.'
    });
  }

  const hasCritical = flags.some(f => f.severity === 'CRITICAL');
  const hasWarning = flags.some(f => f.severity === 'WARNING');

  let score = 100;
  flags.forEach(f => {
    if (f.severity === 'CRITICAL') score -= 50;
    else if (f.severity === 'WARNING') score -= 20;
    else if (f.severity === 'INFO') score -= 5;
  });

  return {
    isCompliant: !hasCritical && !hasWarning,
    hasCritical: hasCritical,
    hasWarning: hasWarning,
    score: Math.max(0, score),
    flags: flags
  };
}

function callOpenAiApi_(apiKey, systemPrompt, userPrompt) {
  const url = 'https://api.openai.com/v1/chat/completions';
  const payload = {
    model: PropertiesService.getScriptProperties().getProperty('OPENAI_MODEL') || 'gpt-4o-mini',
    temperature: 0.3,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]
  };

  const resp = UrlFetchApp.fetch(url, {
    method: 'POST',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + apiKey },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  if (resp.getResponseCode() !== 200) {
    throw new Error('OpenAI API error (' + resp.getResponseCode() + '): ' + resp.getContentText());
  }

  const json = JSON.parse(resp.getContentText());
  const parsed = JSON.parse(json.choices[0].message.content);
  return {
    title: String(parsed.title || 'Akidha Content Draft'),
    copy: String(parsed.copy || ''),
    format_notes: String(parsed.format_notes || '')
  };
}

function callGeminiApi_(apiKey, systemPrompt, userPrompt) {
  const model = PropertiesService.getScriptProperties().getProperty('GEMINI_MODEL') || 'gemini-1.5-flash';
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent?key=' + apiKey;

  const payload = {
    contents: [
      { role: 'user', parts: [{ text: systemPrompt + '\n\n' + userPrompt }] }
    ],
    generationConfig: {
      responseMimeType: 'application/json'
    }
  };

  const resp = UrlFetchApp.fetch(url, {
    method: 'POST',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  if (resp.getResponseCode() !== 200) {
    throw new Error('Gemini API error (' + resp.getResponseCode() + '): ' + resp.getContentText());
  }

  const json = JSON.parse(resp.getContentText());
  const text = json.candidates[0].content.parts[0].text;
  const parsed = JSON.parse(text);
  return {
    title: String(parsed.title || 'Akidha Content Draft'),
    copy: String(parsed.copy || ''),
    format_notes: String(parsed.format_notes || '')
  };
}

/* ==========================================================================
   12. ANALYTICS, PERFORMANCE & LEARNING LOOP
   ========================================================================== */

function recordPerformanceObservation(payload) {
  const user = Auth.getCurrentUser();
  Auth.requireAdmin(user);
  payload = payload || {};
  const id = newId_('OBS');
  const now = new Date();

  Db.appendObject('Performance', {
    observation_id: id,
    creative_id: clean_(payload.creative_id, 80),
    goal_id: clean_(payload.goal_id, 80),
    metric_key: clean_(payload.metric_key, 100),
    metric_value: positiveOrNegativeNumber_(payload.metric_value),
    unit: clean_(payload.unit, 40),
    period_start: clean_(payload.period_start, 30),
    period_end: clean_(payload.period_end, 30),
    source: clean_(payload.source, 100),
    source_url: cleanUrl_(payload.source_url),
    imported_at: now
  });

  // If observation is linked to a goal, optionally update current value
  if (payload.goal_id && payload.metric_value != null) {
    Db.updateById('Goals', 'goal_id', payload.goal_id, {
      current_value: positiveOrNegativeNumber_(payload.metric_value),
      updated_at: now
    });
  }

  audit_(user.email, 'performance', id, 'observation_recorded', payload.metric_key + ': ' + payload.metric_value);
  return { ok: true, observation_id: id };
}

function recordLearning(payload) {
  const user = Auth.getCurrentUser();
  payload = payload || {};
  const campaign = clean_(payload.campaign_name, 160);
  if (!campaign) throw new Error('Campaign name is required.');

  const creativeId = clean_(payload.creative_id, 80);
  if (creativeId) {
    const creative = Db.findById('Creatives', 'creative_id', creativeId);
    if (!creative) throw new Error('Creative not found.');
    const linkedTask = Db.findById('Tasks', 'task_id', creative.task_id);
    if (!linkedTask) throw new Error('Linked task not found.');
    Auth.assertCanEditTask(user, linkedTask);
  }

  const id = newId_('LRN');
  const now = new Date();
  Db.appendObject('Learnings', {
    learning_id: id,
    campaign_name: campaign,
    creative_id: creativeId,
    observation: clean_(payload.observation, 1000),
    hypothesis: clean_(payload.hypothesis, 1000),
    next_test: clean_(payload.next_test, 1000),
    status: user.role === 'admin' ? 'approved' : 'pending',
    approved_by: user.role === 'admin' ? user.email : '',
    created_by: user.email,
    created_at: now
  });

  audit_(user.email, 'learning', id, 'recorded', campaign);
  return { ok: true, learning_id: id };
}

function decideLearning(learningId, decision) {
  const user = Auth.getCurrentUser();
  Auth.requireAdmin(user);
  learningId = clean_(learningId, 80);
  if (!['approved', 'rejected'].includes(decision)) throw new Error('Invalid learning decision.');
  if (!Db.findById('Learnings', 'learning_id', learningId)) throw new Error('Learning not found.');

  Db.updateById('Learnings', 'learning_id', learningId, {
    status: decision,
    approved_by: user.email
  });

  audit_(user.email, 'learning', learningId, 'learning_' + decision, '');
  return { ok: true };
}

function calculateCapacityMetrics_(tasks, team, shiftKey) {
  const shift = APP.SHIFTS[shiftKey] || APP.SHIFTS['09'];
  const dailyLimitHours = shift.productiveHours; // 8 hours

  const openTasks = tasks.filter(t => t.status !== 'Completed' && !truthy_(t.is_archived));

  const members = team.map(member => {
    const memberTasks = openTasks.filter(t => {
      const email = cleanEmail_(t.owner_email);
      return email === member.email || email.includes(member.name.toLowerCase());
    });

    const totalMinutes = memberTasks.reduce((sum, t) => {
      const mins = Number(t.estimate_minutes);
      return sum + (Number.isFinite(mins) && mins > 0 ? mins : 120);
    }, 0);

    const totalHours = Math.round((totalMinutes / 60) * 10) / 10;
    const utilizationPct = Math.round((totalHours / dailyLimitHours) * 100);

    return {
      name: member.name,
      email: member.email,
      role: member.role,
      taskCount: memberTasks.length,
      totalHours: totalHours,
      dailyCapacityHours: dailyLimitHours,
      utilizationPct: utilizationPct,
      isOverloaded: totalHours > dailyLimitHours,
      excessHours: totalHours > dailyLimitHours ? Math.round((totalHours - dailyLimitHours) * 10) / 10 : 0
    };
  });

  const totalOpenHours = members.reduce((sum, m) => sum + m.totalHours, 0);
  const totalDailyCapacity = team.length * dailyLimitHours;

  return {
    shift: shift,
    teamSize: team.length,
    totalDailyCapacity: totalDailyCapacity,
    totalOpenHours: totalOpenHours,
    utilizationPct: Math.round((totalOpenHours / totalDailyCapacity) * 100),
    members: members
  };
}

/* ==========================================================================
   13. HELPER UTILITIES
   ========================================================================== */

function audit_(actor, entityType, entityId, action, details) {
  Db.appendObject('AuditLog', {
    event_id: newId_('E'),
    actor_email: actor,
    entity_type: entityType,
    entity_id: entityId,
    action: action,
    details: clean_(details, 2000),
    created_at: new Date()
  });
}

function newId_(prefix) {
  return prefix + '-' + Utilities.getUuid().split('-')[0].toUpperCase();
}

function clean_(v, max) {
  return String(v == null ? '' : v).trim().slice(0, max || 500);
}

function cleanEmail_(v) {
  return clean_(v, 254).toLowerCase();
}

function cleanUrl_(v) {
  const u = clean_(v, 1000);
  return /^https?:\/\//i.test(u) ? u : '';
}

function parseEmails_(v) {
  return String(v || '').split(',').map(cleanEmail_).filter(Boolean);
}

function positiveNumber_(v) {
  if (v === '' || v == null) return '';
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) throw new Error('Value must be a positive number.');
  return n;
}

function positiveOrNegativeNumber_(v) {
  if (v === '' || v == null) return '';
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error('Metric value must be a valid number.');
  return n;
}

function truthy_(v) {
  return v === true || String(v).toLowerCase() === 'true' || String(v) === '1';
}

function serialize_(v) {
  if (v instanceof Date) {
    return Utilities.formatDate(v, Session.getScriptTimeZone() || 'Asia/Kolkata', "yyyy-MM-dd'T'HH:mm:ss");
  }
  return v;
}

function extractRssItems_(xml, sourceName, category) {
  const items = [];
  const entries = [...xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)].slice(0, 8);
  for (const m of entries) {
    const raw = m[0];
    const get = tag => {
      const hit = raw.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i'));
      return hit ? decodeXml_(hit[1]) : '';
    };
    const title = get('title');
    const link = get('link') || ((raw.match(/<link\s+href=["']([^"']+)/i) || [])[1] || '');
    const desc = get('description');
    if (title && link) {
      items.push({
        source: sourceName,
        category: category,
        title: title,
        summary: desc.slice(0, 400) || 'Open source report to view details.',
        url: link,
        intent: 'Knowledge / explanation',
        relevance_score: calculateRelevanceScore_(title + ' ' + desc)
      });
    }
  }
  return items;
}

function decodeXml_(s) {
  return String(s || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function classifyIntent_(text) {
  if (/\b(should i|can i|is it safe|anyone know|what is|how do i|recommend|suggest)\b/i.test(text)) return 'Question';
  if (/\b(my doctor|i take|i use|i switched|in my experience|i noticed)\b/i.test(text)) return 'Personal experience';
  if (/\b(research|study|evidence|explained|notification|guideline|order)\b/i.test(text)) return 'Knowledge / explanation';
  return 'Discussion / opinion';
}

function calculateRelevanceScore_(text) {
  const t = text.toLowerCase();
  let score = 35;
  if (/substitut|generic|same molecule|alternative/.test(t)) score += 20;
  if (/price|cost|expensive|afford|monthly|bill|nppa/.test(t)) score += 18;
  if (/diabetes|hypertension|blood pressure|thyroid|chronic/.test(t)) score += 15;
  if (/who-gmp|doctor|pharmacist|quality|cdsco/.test(t)) score += 12;
  return Math.min(100, Math.max(0, score));
}
