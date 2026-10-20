/**
 * Akidha Marketing OS — Schema Migration Engine
 * Safely and idempotently upgrades Google Sheet database tabs to support new application fields
 * without deleting, renaming, or reordering existing columns or modifying existing data rows.
 */

export const SCHEMA_V1 = {
  Users: ['user_id', 'email', 'display_name', 'role', 'active', 'created_at'],
  Tasks: [
    'task_id', 'title', 'brief', 'owner_email', 'status', 'priority', 'category',
    'goal_id', 'theme', 'due_date', 'estimate_minutes', 'actual_minutes', 'blocker_reason',
    'completion_requested_by', 'completion_requested_at', 'completed_by', 'completed_at',
    'created_by', 'created_at', 'updated_at'
  ],
  Goals: [
    'goal_id', 'title', 'owner_email', 'metric_key', 'unit', 'direction',
    'baseline_value', 'target_value', 'current_value', 'measurement_source',
    'start_date', 'end_date', 'status', 'updated_at'
  ],
  TaskDependencies: ['task_id', 'depends_on_task_id', 'dependency_type', 'created_at'],
  Approvals: [
    'approval_id', 'task_id', 'requested_by', 'reviewer_email', 'decision',
    'comments', 'requested_at', 'decided_at'
  ],
  Themes: ['theme_id', 'name', 'description', 'audience_segment', 'status', 'created_at'],
  WorkBlocks: [
    'block_id', 'task_id', 'owner_email', 'starts_at', 'ends_at', 'status',
    'proposed_by', 'confirmed_by', 'confirmed_at', 'override_reason'
  ],
  Creatives: [
    'creative_id', 'task_id', 'title', 'platform', 'format', 'workflow_stage',
    'medical_review_required', 'medical_review_status', 'publish_url', 'published_at',
    'created_at', 'updated_at'
  ],
  Performance: [
    'observation_id', 'creative_id', 'goal_id', 'metric_key', 'metric_value',
    'unit', 'period_start', 'period_end', 'source', 'source_url', 'imported_at'
  ],
  AuditLog: [
    'event_id', 'actor_email', 'entity_type', 'entity_id', 'action',
    'details', 'created_at'
  ]
};

export const SCHEMA_V2 = {
  Users: ['user_id', 'email', 'display_name', 'role', 'active', 'created_at'],
  Tasks: [
    'task_id', 'title', 'brief', 'owner_email', 'status', 'priority', 'category',
    'goal_id', 'theme', 'due_date', 'estimate_minutes', 'actual_minutes', 'blocker_reason',
    'completion_requested_by', 'completion_requested_at', 'completed_by', 'completed_at',
    'created_by', 'created_at', 'updated_at',
    // New v2 fields added to end to guarantee non-destructive column alignment
    'doc_url', 'dependencies', 'is_archived'
  ],
  Goals: [
    'goal_id', 'title', 'owner_email', 'metric_key', 'unit', 'direction',
    'baseline_value', 'target_value', 'current_value', 'measurement_source',
    'start_date', 'end_date', 'status', 'updated_at',
    // New v2 field
    'is_archived'
  ],
  TaskDependencies: [
    'task_id', 'depends_on_task_id', 'dependency_type', 'created_at',
    // New v2 field
    'dependency_id'
  ],
  Approvals: [
    'approval_id', 'task_id', 'requested_by', 'reviewer_email', 'decision',
    'comments', 'requested_at', 'decided_at',
    // New v2 field
    'approval_type'
  ],
  Themes: ['theme_id', 'name', 'description', 'audience_segment', 'status', 'created_at'],
  WorkBlocks: [
    'block_id', 'task_id', 'owner_email', 'starts_at', 'ends_at', 'status',
    'proposed_by', 'confirmed_by', 'confirmed_at', 'override_reason',
    // New v2 fields
    'shift_key', 'created_at'
  ],
  Creatives: [
    'creative_id', 'task_id', 'title', 'platform', 'format', 'workflow_stage',
    'medical_review_required', 'medical_review_status', 'publish_url', 'published_at',
    'created_at', 'updated_at',
    // New v2 fields
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
};

/**
 * Computes difference between existing sheet headers and target schema.
 * @param {object} existingHeadersMap - { tabName: string[] }
 * @param {object} targetSchemaMap - { tabName: string[] }
 * @returns {object} Diff report detailing missing tabs and missing columns per tab.
 */
export function computeSchemaDiff(existingHeadersMap = {}, targetSchemaMap = SCHEMA_V2) {
  const diff = {
    missingTabs: [],
    columnsToAdd: {},
    upToDateTabs: [],
    hasChanges: false
  };

  for (const [tabName, targetCols] of Object.entries(targetSchemaMap)) {
    const existingCols = existingHeadersMap[tabName];
    if (!existingCols) {
      diff.missingTabs.push(tabName);
      diff.columnsToAdd[tabName] = [...targetCols];
      diff.hasChanges = true;
    } else {
      const missing = targetCols.filter(col => !existingCols.includes(col));
      if (missing.length > 0) {
        diff.columnsToAdd[tabName] = missing;
        diff.hasChanges = true;
      } else {
        diff.upToDateTabs.push(tabName);
      }
    }
  }

  return diff;
}

/**
 * Executes a safe, idempotent schema migration on a spreadsheet object.
 * Works seamlessly with Google Apps Script SpreadsheetApp or mock spreadsheets.
 * @param {object} spreadsheet - Spreadsheet instance.
 * @param {object} targetSchemaMap - Target schema definition.
 * @param {object} options - Options: { dryRun: boolean }.
 * @returns {object} Migration execution report.
 */
export function migrateSpreadsheetSchema(spreadsheet, targetSchemaMap = SCHEMA_V2, options = {}) {
  const dryRun = options.dryRun === true;
  const report = {
    timestamp: new Date().toISOString(),
    dryRun,
    tabsCreated: [],
    columnsAdded: {},
    tabsAlreadyUpToDate: [],
    details: []
  };

  for (const [tabName, targetHeaders] of Object.entries(targetSchemaMap)) {
    let sh = spreadsheet.getSheetByName(tabName);

    // 1. Tab does not exist
    if (!sh) {
      report.tabsCreated.push(tabName);
      report.details.push(`Created new sheet tab "${tabName}" with ${targetHeaders.length} columns.`);
      if (!dryRun) {
        sh = spreadsheet.insertSheet(tabName);
        sh.getRange(1, 1, 1, targetHeaders.length).setValues([targetHeaders]);
        if (typeof sh.setFrozenRows === 'function') sh.setFrozenRows(1);
        if (typeof sh.autoResizeColumns === 'function') sh.autoResizeColumns(1, targetHeaders.length);
      }
      continue;
    }

    // 2. Tab exists but is completely empty (0 rows)
    const lastRow = sh.getLastRow ? sh.getLastRow() : 0;
    if (lastRow === 0) {
      report.columnsAdded[tabName] = [...targetHeaders];
      report.details.push(`Initialized empty sheet tab "${tabName}" with ${targetHeaders.length} headers.`);
      if (!dryRun) {
        sh.getRange(1, 1, 1, targetHeaders.length).setValues([targetHeaders]);
        if (typeof sh.setFrozenRows === 'function') sh.setFrozenRows(1);
        if (typeof sh.autoResizeColumns === 'function') sh.autoResizeColumns(1, targetHeaders.length);
      }
      continue;
    }

    // 3. Tab exists with data. Read existing row 1 headers.
    const lastCol = sh.getLastColumn ? sh.getLastColumn() : targetHeaders.length;
    const headerRange = sh.getRange(1, 1, 1, Math.max(1, lastCol));
    const headerValues = headerRange.getValues ? headerRange.getValues() : [[]];
    const existingHeaders = (headerValues[0] || []).map(String);

    // Filter missing columns
    const missing = targetHeaders.filter(col => !existingHeaders.includes(col));

    if (missing.length === 0) {
      report.tabsAlreadyUpToDate.push(tabName);
      continue;
    }

    // Missing columns found. Append them to row 1 to the right of existing columns!
    report.columnsAdded[tabName] = missing;
    const startCol = existingHeaders.length + 1;
    report.details.push(
      `Tab "${tabName}": appended ${missing.length} missing column(s) [${missing.join(', ')}] starting at column index ${startCol}.`
    );

    if (!dryRun) {
      sh.getRange(1, startCol, 1, missing.length).setValues([missing]);
      if (typeof sh.autoResizeColumns === 'function') {
        sh.autoResizeColumns(startCol, missing.length);
      }
    }
  }

  report.isUpToDate = report.tabsCreated.length === 0 && Object.keys(report.columnsAdded).length === 0;
  return report;
}

