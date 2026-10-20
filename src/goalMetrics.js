/**
 * Akidha Marketing OS — Goal & Metric Attribution Engine
 * Accurately tracks business OKR progress across directions (higher is better vs lower is better).
 */

/**
 * Calculates percentage completion of a goal.
 * @param {object} goal - Goal record with baseline, target, current, and direction.
 * @returns {object} { percentage: number, status: string, delta: number }
 */
export function calculateGoalProgress(goal = {}) {
  const baseline = Number(goal.baseline_value);
  const target = Number(goal.target_value);
  const current = Number(goal.current_value);
  const direction = String(goal.direction || 'higher').toLowerCase();

  if (!Number.isFinite(baseline) || !Number.isFinite(target) || !Number.isFinite(current)) {
    return { percentage: 0, status: 'unmeasured', delta: 0, isComplete: false };
  }

  if (target === baseline) {
    return { percentage: current >= target ? 100 : 0, status: 'achieved', delta: 0, isComplete: current >= target };
  }

  let pct = 0;
  if (direction === 'lower') {
    // Lower is better (e.g., Cost Per Lead, Blocker turnaround hours)
    pct = ((baseline - current) / (baseline - target)) * 100;
  } else {
    // Higher is better (e.g., Qualified inquiries, approved creatives)
    pct = ((current - baseline) / (target - baseline)) * 100;
  }

  const clampedPct = Math.max(0, Math.min(100, Math.round(pct * 10) / 10));
  const isComplete = clampedPct >= 100;

  let status = 'in_progress';
  if (isComplete) status = 'achieved';
  else if (clampedPct >= 70) status = 'on_track';
  else if (clampedPct >= 35) status = 'needs_attention';
  else status = 'at_risk';

  return {
    percentage: clampedPct,
    rawPercentage: Math.round(pct * 10) / 10,
    status,
    isComplete,
    delta: Math.round((current - baseline) * 100) / 100
  };
}

