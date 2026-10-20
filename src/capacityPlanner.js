/**
 * Akidha Marketing OS — Shift & Capacity Planning Engine
 * Models 8 productive schedulable hours per person per day across configurable shifts
 * (09:00–18:00 or 10:00–19:00 with 1 hour break).
 */

export const SHIFT_CONFIG = {
  '09': { name: '9:00 AM – 6:00 PM', startHour: 9, endHour: 18, breakHours: 1, productiveHours: 8 },
  '10': { name: '10:00 AM – 7:00 PM', startHour: 10, endHour: 19, breakHours: 1, productiveHours: 8 }
};

export const DEFAULT_TEAM = [
  { name: 'Saurabh', role: 'Owner & Strategy', email: 'sourabh.suryavanshi@akidha.in' },
  { name: 'Tanvi', role: 'Senior Associate / Operations', email: 'tanvi@akidha.in' },
  { name: 'Nikita', role: 'Writer & Content Strategist', email: 'nikita@akidha.in' },
  { name: 'Sai', role: 'Video Editor & Creative Producer', email: 'sai@akidha.in' }
];

/**
 * Computes workload and capacity utilization for team members.
 * @param {Array<object>} tasks - Active task list.
 * @param {Array<object>} team - Team members.
 * @param {string} shiftKey - '09' or '10'.
 * @returns {object} Capacity analysis per person and workspace aggregates.
 */
export function calculateTeamCapacity(tasks = [], team = DEFAULT_TEAM, shiftKey = '09') {
  const shift = SHIFT_CONFIG[shiftKey] || SHIFT_CONFIG['09'];
  const dailyLimitHours = shift.productiveHours; // 8 hours

  const openTasks = tasks.filter(t => t.status !== 'Completed' && !t.is_archived);

  const memberStats = team.map(member => {
    const memberTasks = openTasks.filter(t => {
      const email = String(t.owner_email || '').toLowerCase();
      const memberEmail = String(member.email || '').toLowerCase();
      const memberName = String(member.name || '').toLowerCase();
      return email === memberEmail || email.includes(memberName);
    });

    const totalMinutes = memberTasks.reduce((sum, t) => {
      const mins = Number(t.estimate_minutes);
      return sum + (Number.isFinite(mins) && mins > 0 ? mins : 120); // default 2 hours if unspecified
    }, 0);

    const totalHours = Math.round((totalMinutes / 60) * 10) / 10;
    const utilizationPct = Math.round((totalHours / dailyLimitHours) * 100);
    const isOverloaded = totalHours > dailyLimitHours;
    const excessHours = isOverloaded ? Math.round((totalHours - dailyLimitHours) * 10) / 10 : 0;

    return {
      name: member.name,
      role: member.role,
      email: member.email,
      taskCount: memberTasks.length,
      totalHours,
      dailyCapacityHours: dailyLimitHours,
      utilizationPct,
      isOverloaded,
      excessHours,
      tasks: memberTasks
    };
  });

  const totalOpenHours = memberStats.reduce((sum, m) => sum + m.totalHours, 0);
  const totalDailyCapacity = team.length * dailyLimitHours;

  return {
    shift,
    teamSize: team.length,
    totalDailyCapacity,
    totalOpenHours,
    overallUtilizationPct: Math.round((totalOpenHours / totalDailyCapacity) * 100),
    members: memberStats
  };
}

function formatLocalDate(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Distributes open tasks across a rolling 14-day calendar window.
 * @param {Array<object>} tasks - Active task list.
 * @param {Date} startDate - Base date.
 * @returns {Array<object>} Day-by-day task buckets.
 */
export function build14DaySchedule(tasks = [], startDate = new Date()) {
  const days = [];
  const base = new Date(startDate);
  base.setHours(12, 0, 0, 0);

  for (let i = 0; i < 14; i++) {
    const curr = new Date(base);
    curr.setDate(base.getDate() + i);
    const dateStr = formatLocalDate(curr);

    const dayTasks = tasks.filter(t => {
      if (!t.due_date) return false;
      return String(t.due_date).slice(0, 10) === dateStr;
    });

    const dayHours = dayTasks.reduce((sum, t) => {
      const mins = Number(t.estimate_minutes) || 120;
      return sum + (mins / 60);
    }, 0);

    days.push({
      date: dateStr,
      dayName: curr.toLocaleDateString('en-IN', { weekday: 'short' }),
      formattedDate: curr.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      tasks: dayTasks,
      totalHours: Math.round(dayHours * 10) / 10,
      isWeekend: curr.getDay() === 0 || curr.getDay() === 6
    });
  }

  return days;
}
