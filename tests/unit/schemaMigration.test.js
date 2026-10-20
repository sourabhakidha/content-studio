import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SCHEMA_V1,
  SCHEMA_V2,
  computeSchemaDiff,
  migrateSpreadsheetSchema
} from '../../src/schemaMigration.js';

// Realistic in-memory Google Sheets mock tracking columns, headers, formatting, and rows
class MockGoogleSheet {
  constructor(name, headers = [], initialRows = []) {
    this.name = name;
    this.headers = [...headers];
    this.rows = initialRows.map(r => [...r]);
    this.frozenRows = 0;
  }
  getLastRow() {
    return this.headers.length > 0 ? this.rows.length + 1 : 0;
  }
  getLastColumn() {
    return this.headers.length;
  }
  setFrozenRows(n) {
    this.frozenRows = n;
  }
  autoResizeColumns() {}
  getRange(row, col, numRows = 1, numCols = 1) {
    return {
      getValues: () => {
        if (row === 1) {
          return [this.headers.slice(col - 1, col - 1 + numCols)];
        }
        const dataRowIdx = row - 2;
        if (dataRowIdx >= 0 && dataRowIdx < this.rows.length) {
          return [this.rows[dataRowIdx].slice(col - 1, col - 1 + numCols)];
        }
        return [[]];
      },
      setValues: (values) => {
        const newVals = values[0] || [];
        if (row === 1) {
          // Setting or appending headers in row 1
          for (let i = 0; i < newVals.length; i++) {
            this.headers[col - 1 + i] = String(newVals[i]);
          }
        } else {
          // Setting data in row 2..N
          const dataRowIdx = row - 2;
          while (this.rows.length <= dataRowIdx) this.rows.push([]);
          for (let i = 0; i < newVals.length; i++) {
            this.rows[dataRowIdx][col - 1 + i] = newVals[i];
          }
        }
      }
    };
  }
}

class MockGoogleSpreadsheet {
  constructor() {
    this.sheets = new Map();
  }
  getSheetByName(name) {
    return this.sheets.get(name) || null;
  }
  insertSheet(name) {
    const s = new MockGoogleSheet(name);
    this.sheets.set(name, s);
    return s;
  }
  addExistingSheet(name, headers, rows = []) {
    const s = new MockGoogleSheet(name, headers, rows);
    this.sheets.set(name, s);
    return s;
  }
}

test('Schema Diff: Accurately identifies missing v2 tabs and columns from v1 baseline', () => {
  const diff = computeSchemaDiff(SCHEMA_V1, SCHEMA_V2);

  assert.equal(diff.hasChanges, true);
  // Missing tabs
  assert.deepEqual(diff.missingTabs.sort(), ['Learnings', 'MarketSignals'].sort());

  // Tasks missing doc_url, dependencies, is_archived
  assert.deepEqual(diff.columnsToAdd.Tasks, ['doc_url', 'dependencies', 'is_archived']);

  // Creatives missing medical_review_notes, asset_drive_url, compliance_flags, is_archived
  assert.deepEqual(diff.columnsToAdd.Creatives, [
    'medical_review_notes', 'asset_drive_url', 'compliance_flags', 'is_archived'
  ]);

  // Goals missing is_archived
  assert.deepEqual(diff.columnsToAdd.Goals, ['is_archived']);

  // Already up-to-date tabs
  assert.ok(diff.upToDateTabs.includes('Users'));
  assert.ok(diff.upToDateTabs.includes('Themes'));
  assert.ok(diff.upToDateTabs.includes('Performance'));
  assert.ok(diff.upToDateTabs.includes('AuditLog'));
});

test('Schema Migration: Upgrades existing v1 database while preserving all existing rows and columns', () => {
  const ss = new MockGoogleSpreadsheet();

  // Seed with realistic v1 production data
  const sampleTaskData = [
    'T-001', 'Educational Carousel', 'Brief text', 'sourabh.suryavanshi@akidha.in',
    'In progress', 'High', 'Social media', 'G-100', 'Trust & Transparency',
    '2026-10-25', 180, 0, '', '', '', '', '', 'sourabh.suryavanshi@akidha.in', '2026-10-10', '2026-10-12'
  ];
  assert.equal(sampleTaskData.length, SCHEMA_V1.Tasks.length);

  for (const [tab, cols] of Object.entries(SCHEMA_V1)) {
    const rows = tab === 'Tasks' ? [sampleTaskData] : [];
    ss.addExistingSheet(tab, cols, rows);
  }

  // 1. Dry Run First
  const dryReport = migrateSpreadsheetSchema(ss, SCHEMA_V2, { dryRun: true });
  assert.equal(dryReport.dryRun, true);
  assert.equal(dryReport.tabsCreated.length, 2);
  assert.ok(dryReport.columnsAdded.Tasks.includes('doc_url'));
  // Ensure dry run did not touch spreadsheet
  assert.equal(ss.getSheetByName('Learnings'), null);
  assert.equal(ss.getSheetByName('Tasks').headers.length, 20);

  // 2. Real Migration Run
  const report = migrateSpreadsheetSchema(ss, SCHEMA_V2, { dryRun: false });
  assert.equal(report.dryRun, false);

  // Assert new tabs created
  assert.ok(ss.getSheetByName('Learnings') !== null);
  assert.ok(ss.getSheetByName('MarketSignals') !== null);
  assert.equal(ss.getSheetByName('Learnings').headers.length, SCHEMA_V2.Learnings.length);

  // Assert Tasks tab upgraded
  const taskSheet = ss.getSheetByName('Tasks');
  assert.equal(taskSheet.headers.length, 23); // 20 original + 3 new
  // Original 20 columns untouched in exact original positions
  for (let i = 0; i < 20; i++) {
    assert.equal(taskSheet.headers[i], SCHEMA_V1.Tasks[i]);
  }
  // New columns appended at end
  assert.equal(taskSheet.headers[20], 'doc_url');
  assert.equal(taskSheet.headers[21], 'dependencies');
  assert.equal(taskSheet.headers[22], 'is_archived');

  // Assert data row preserved
  assert.equal(taskSheet.rows.length, 1);
  assert.equal(taskSheet.rows[0][0], 'T-001');
  assert.equal(taskSheet.rows[0][1], 'Educational Carousel');

  // Assert Creatives tab upgraded
  const creativeSheet = ss.getSheetByName('Creatives');
  assert.equal(creativeSheet.headers.length, 16); // 12 original + 4 new
  assert.equal(creativeSheet.headers[12], 'medical_review_notes');
  assert.equal(creativeSheet.headers[13], 'asset_drive_url');
  assert.equal(creativeSheet.headers[14], 'compliance_flags');
  assert.equal(creativeSheet.headers[15], 'is_archived');
});

test('Schema Migration: Handles partially upgraded schemas without duplicating existing columns', () => {
  const ss = new MockGoogleSpreadsheet();

  // Partially upgraded Tasks: already has 'is_archived', but missing 'doc_url' and 'dependencies'
  const partialTaskHeaders = [...SCHEMA_V1.Tasks, 'is_archived'];
  ss.addExistingSheet('Tasks', partialTaskHeaders);

  // Learnings tab already created, but MarketSignals missing
  ss.addExistingSheet('Learnings', SCHEMA_V2.Learnings);

  const report = migrateSpreadsheetSchema(ss, SCHEMA_V2, { dryRun: false });

  // Only missing columns are added
  assert.deepEqual(report.columnsAdded.Tasks, ['doc_url', 'dependencies']);
  // 'is_archived' must NOT be duplicated
  const taskSheet = ss.getSheetByName('Tasks');
  const archivedOccurrences = taskSheet.headers.filter(h => h === 'is_archived');
  assert.equal(archivedOccurrences.length, 1, 'is_archived should appear exactly once');

  // Learnings was already up to date
  assert.ok(report.tabsAlreadyUpToDate.includes('Learnings'));
  // MarketSignals was created
  assert.ok(report.tabsCreated.includes('MarketSignals'));
});

test('Schema Migration: Idempotency check on already-migrated database', () => {
  const ss = new MockGoogleSpreadsheet();

  // Pre-seed all tabs with full V2 schema
  for (const [tab, cols] of Object.entries(SCHEMA_V2)) {
    ss.addExistingSheet(tab, cols, [['sample_id']]);
  }

  // Run migration on already upgraded database
  const report = migrateSpreadsheetSchema(ss, SCHEMA_V2, { dryRun: false });

  assert.equal(report.isUpToDate, true);
  assert.equal(report.tabsCreated.length, 0);
  assert.equal(Object.keys(report.columnsAdded).length, 0);
  assert.equal(report.tabsAlreadyUpToDate.length, 12);

  // Ensure no duplicate headers were added
  for (const [tab, cols] of Object.entries(SCHEMA_V2)) {
    assert.equal(ss.getSheetByName(tab).headers.length, cols.length);
  }
});

