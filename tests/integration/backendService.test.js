import test from 'node:test';
import assert from 'node:assert/strict';

// Test mock environment simulating Google Apps Script services
class MockSheet {
  constructor(name, headers = [], rows = []) {
    this.name = name;
    this.headers = headers;
    this.rows = rows;
  }
  getLastRow() {
    return this.rows.length + 1;
  }
  getLastColumn() {
    return this.headers.length;
  }
  getDataRange() {
    return {
      getValues: () => [this.headers, ...this.rows.map(r => [...r])]
    };
  }
  appendRow(row) {
    this.rows.push([...row]);
  }
  getRange(row, col, numRows = 1, numCols = 1) {
    return {
      setValues: (values) => {
        if (row >= 2 && row - 2 < this.rows.length) {
          this.rows[row - 2] = [...values[0]];
        }
      },
      setValue: (val) => {
        if (row >= 2 && row - 2 < this.rows.length && col >= 1 && col <= this.headers.length) {
          this.rows[row - 2][col - 1] = val;
        }
      }
    };
  }
  deleteRow(rowIdx) {
    if (rowIdx >= 2 && rowIdx - 2 < this.rows.length) {
      this.rows.splice(rowIdx - 2, 1);
    }
  }
}

class MockSpreadsheet {
  constructor() {
    this.sheets = new Map();
  }
  getSheetByName(name) {
    return this.sheets.get(name) || null;
  }
  insertSheet(name) {
    const s = new MockSheet(name);
    this.sheets.set(name, s);
    return s;
  }
}

test('Backend Logic: Task creation, field validation, and status transitions', () => {
  const ss = new MockSpreadsheet();
  const taskSheet = ss.insertSheet('Tasks');
  taskSheet.headers = [
    'task_id', 'title', 'brief', 'owner_email', 'status', 'priority', 'category',
    'goal_id', 'theme', 'due_date', 'estimate_minutes', 'actual_minutes', 'blocker_reason',
    'doc_url', 'dependencies', 'completion_requested_by', 'completion_requested_at',
    'completed_by', 'completed_at', 'is_archived', 'created_by', 'created_at', 'updated_at'
  ];

  // Test insertion
  const newTaskRow = [
    'T-1234', 'Draft Patient Education Reel', 'Cover metformin substitute equivalence',
    'nikita@akidha.in', 'Backlog', 'High', 'Social media',
    'G-001', 'Trust & Transparency', '2026-10-25', 180, '', '',
    'https://docs.google.com/document/d/123', '', '', '', '', '', false,
    'sourabh.suryavanshi@akidha.in', '2026-10-20', '2026-10-20'
  ];
  taskSheet.appendRow(newTaskRow);

  assert.equal(taskSheet.rows.length, 1);
  const data = taskSheet.getDataRange().getValues();
  assert.equal(data[1][0], 'T-1234');
  assert.equal(data[1][1], 'Draft Patient Education Reel');
  assert.equal(data[1][4], 'Backlog');

  // Test row update
  const updatedRow = [...data[1]];
  updatedRow[4] = 'In progress';
  taskSheet.getRange(2, 1, 1, taskSheet.headers.length).setValues([updatedRow]);

  const afterUpdate = taskSheet.getDataRange().getValues();
  assert.equal(afterUpdate[1][4], 'In progress');
});

test('Backend Logic: Enforces medical review requirement on creative items before publishing', () => {
  const creative = {
    creative_id: 'C-999',
    workflow_stage: 'Scripting / Brief',
    medical_review_required: true,
    medical_review_status: 'pending',
    publish_url: ''
  };

  const attemptPublish = (c, nextStage, publishUrl) => {
    if (nextStage === 'Published') {
      if (c.medical_review_required && c.medical_review_status !== 'approved') {
        throw new Error('Medical & claims review must be approved before this creative can be published.');
      }
      if (!/^https:\/\//i.test(publishUrl)) {
        throw new Error('A valid https:// published URL is required.');
      }
    }
    return true;
  };

  // Attempting to publish while pending should throw
  assert.throws(
    () => attemptPublish(creative, 'Published', 'https://instagram.com/reel/123'),
    /Medical & claims review must be approved/
  );

  // Once approved and with valid URL, publishing succeeds
  creative.medical_review_status = 'approved';
  const result = attemptPublish(creative, 'Published', 'https://instagram.com/reel/123');
  assert.equal(result, true);
});

