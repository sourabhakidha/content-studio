import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateGoalProgress } from '../../src/goalMetrics.js';

test('Goal Metrics: calculates progress when higher is better', () => {
  const goal = {
    baseline_value: 10,
    target_value: 50,
    current_value: 30,
    direction: 'higher'
  };

  const result = calculateGoalProgress(goal);
  // (30 - 10) / (50 - 10) = 20 / 40 = 50%
  assert.equal(result.percentage, 50);
  assert.equal(result.isComplete, false);
  assert.equal(result.status, 'needs_attention');
});

test('Goal Metrics: calculates progress when lower is better (e.g. Cost Per Lead)', () => {
  const goal = {
    baseline_value: 500, // starting CPL was ₹500
    target_value: 200,   // target CPL is ₹200
    current_value: 260,  // current actual CPL is ₹260
    direction: 'lower'
  };

  const result = calculateGoalProgress(goal);
  // (500 - 260) / (500 - 200) = 240 / 300 = 80%
  assert.equal(result.percentage, 80);
  assert.equal(result.status, 'on_track');
});

test('Goal Metrics: clamps percentage at 100% when target is exceeded', () => {
  const goal = {
    baseline_value: 0,
    target_value: 20,
    current_value: 25,
    direction: 'higher'
  };

  const result = calculateGoalProgress(goal);
  assert.equal(result.percentage, 100);
  assert.equal(result.isComplete, true);
  assert.equal(result.status, 'achieved');
});

test('Goal Metrics: clamps percentage at 0% when value moves in wrong direction', () => {
  const goal = {
    baseline_value: 500,
    target_value: 300,
    current_value: 600, // CPL increased to ₹600
    direction: 'lower'
  };

  const result = calculateGoalProgress(goal);
  assert.equal(result.percentage, 0);
  assert.equal(result.status, 'at_risk');
});

