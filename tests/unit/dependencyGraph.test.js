import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateTaskDependencies, wouldCreateCycle } from '../../src/dependencyGraph.js';

test('Dependency Graph: accurately identifies when task is blocked by incomplete prerequisite', () => {
  const allTasks = [
    { task_id: 'T-100', title: 'Write Carousel Copy', status: 'In progress' },
    { task_id: 'T-101', title: 'Review Carousel Copy', status: 'Backlog' }
  ];
  const deps = [
    { task_id: 'T-101', depends_on_task_id: 'T-100' }
  ];

  const result = evaluateTaskDependencies('T-101', allTasks, deps);
  assert.equal(result.isBlocked, true);
  assert.equal(result.blockingTasks.length, 1);
  assert.equal(result.blockingTasks[0].task_id, 'T-100');
});

test('Dependency Graph: unblocks task when all prerequisites are Completed', () => {
  const allTasks = [
    { task_id: 'T-100', title: 'Write Carousel Copy', status: 'Completed' },
    { task_id: 'T-101', title: 'Review Carousel Copy', status: 'Backlog' }
  ];
  const deps = [
    { task_id: 'T-101', depends_on_task_id: 'T-100' }
  ];

  const result = evaluateTaskDependencies('T-101', allTasks, deps);
  assert.equal(result.isBlocked, false);
  assert.equal(result.blockingTasks.length, 0);
});

test('Dependency Graph: detects direct circular dependency loop', () => {
  // A -> B already exists
  const existingDeps = [
    { task_id: 'T-B', depends_on_task_id: 'T-A' }
  ];

  // Try to add B -> A (would create A -> B -> A)
  const isCycle = wouldCreateCycle('T-A', 'T-B', existingDeps);
  assert.equal(isCycle, true, 'Should detect circular dependency');
});

test('Dependency Graph: detects indirect transitive circular dependency loop', () => {
  // A -> B -> C
  const existingDeps = [
    { task_id: 'T-B', depends_on_task_id: 'T-A' },
    { task_id: 'T-C', depends_on_task_id: 'T-B' }
  ];

  // Try to add A -> C (C depends on A, so A depending on C creates A -> C -> B -> A)
  const isCycle = wouldCreateCycle('T-A', 'T-C', existingDeps);
  assert.equal(isCycle, true, 'Should detect transitive cycle');
});

test('Dependency Graph: permits valid DAG additions', () => {
  // A -> B, and now add A -> C
  const existingDeps = [
    { task_id: 'T-B', depends_on_task_id: 'T-A' }
  ];

  const isCycle = wouldCreateCycle('T-C', 'T-A', existingDeps);
  assert.equal(isCycle, false, 'Valid DAG should not be flagged as cycle');
});

