import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateTeamCapacity, build14DaySchedule, SHIFT_CONFIG } from '../../src/capacityPlanner.js';

test('Capacity Planner: computes workload against 8-hour daily limit', () => {
  const team = [
    { name: 'Nikita', role: 'Writer', email: 'nikita@akidha.in' },
    { name: 'Sai', role: 'Video Editor', email: 'sai@akidha.in' }
  ];

  const tasks = [
    // Nikita has 2 tasks of 180 min and 240 min = 420 min = 7.0 hours
    { task_id: 'T-1', owner_email: 'nikita@akidha.in', estimate_minutes: 180, status: 'In progress' },
    { task_id: 'T-2', owner_email: 'nikita@akidha.in', estimate_minutes: 240, status: 'Scripting' },
    // Sai has 1 task of 600 min = 10.0 hours (over 8h limit!)
    { task_id: 'T-3', owner_email: 'sai@akidha.in', estimate_minutes: 600, status: 'Asset Creation' }
  ];

  const result = calculateTeamCapacity(tasks, team, '09');
  assert.equal(result.shift.productiveHours, 8);

  const nikita = result.members.find(m => m.name === 'Nikita');
  assert.equal(nikita.totalHours, 7);
  assert.equal(nikita.isOverloaded, false);
  assert.equal(nikita.utilizationPct, 88); // 7 / 8 = 87.5% -> 88%

  const sai = result.members.find(m => m.name === 'Sai');
  assert.equal(sai.totalHours, 10);
  assert.equal(sai.isOverloaded, true);
  assert.equal(sai.excessHours, 2.0);
  assert.equal(sai.utilizationPct, 125);
});

test('Capacity Planner: ignores completed or archived tasks', () => {
  const team = [
    { name: 'Tanvi', role: 'Ops', email: 'tanvi@akidha.in' }
  ];
  const tasks = [
    { task_id: 'T-1', owner_email: 'tanvi@akidha.in', estimate_minutes: 480, status: 'Completed' },
    { task_id: 'T-2', owner_email: 'tanvi@akidha.in', estimate_minutes: 480, status: 'In progress', is_archived: true },
    { task_id: 'T-3', owner_email: 'tanvi@akidha.in', estimate_minutes: 120, status: 'In progress' }
  ];

  const result = calculateTeamCapacity(tasks, team, '09');
  const tanvi = result.members[0];
  assert.equal(tanvi.totalHours, 2.0);
  assert.equal(tanvi.taskCount, 1);
});

test('Capacity Planner: generates 14-day schedule with weekday and task allocations', () => {
  const today = new Date('2026-10-20T00:00:00Z');
  const tasks = [
    { task_id: 'T-1', title: 'Ad Brief', due_date: '2026-10-20', estimate_minutes: 120 }
  ];

  const schedule = build14DaySchedule(tasks, today);
  assert.equal(schedule.length, 14);
  assert.equal(schedule[0].date, '2026-10-20');
  assert.equal(schedule[0].tasks.length, 1);
  assert.equal(schedule[0].totalHours, 2.0);
});

