/**
 * Akidha Marketing OS — Task Dependency & Blocker Engine
 * Prevents downstream execution when prerequisite tasks remain incomplete,
 * and detects circular dependencies.
 */

/**
 * Checks if a task is blocked by incomplete prerequisites.
 * @param {object|string} taskOrId - The task object or task ID.
 * @param {Array<object>} allTasks - All tasks in the workspace.
 * @param {Array<object>} dependencies - Array of { task_id, depends_on_task_id }.
 * @returns {object} { isBlocked: boolean, blockingTasks: Array<object> }
 */
export function evaluateTaskDependencies(taskOrId, allTasks = [], dependencies = []) {
  const taskId = typeof taskOrId === 'object' && taskOrId ? taskOrId.task_id : String(taskOrId || '');
  if (!taskId) return { isBlocked: false, blockingTasks: [] };

  const taskMap = new Map(allTasks.map(t => [String(t.task_id), t]));
  const currentTask = taskMap.get(taskId);

  // Collect dependencies from dependency table
  const directDeps = dependencies
    .filter(d => String(d.task_id) === taskId)
    .map(d => String(d.depends_on_task_id));

  // Also collect inline dependencies if task has comma-separated dependencies field
  if (currentTask && currentTask.dependencies) {
    const inline = String(currentTask.dependencies)
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    inline.forEach(id => {
      if (!directDeps.includes(id)) directDeps.push(id);
    });
  }

  const blockingTasks = [];
  for (const depId of directDeps) {
    const depTask = taskMap.get(depId);
    if (!depTask) {
      // If prerequisite doesn't exist, treat as blocked until verified
      blockingTasks.push({
        task_id: depId,
        title: `Unknown Prerequisite (${depId})`,
        status: 'Missing'
      });
    } else if (depTask.status !== 'Completed') {
      blockingTasks.push(depTask);
    }
  }

  return {
    isBlocked: blockingTasks.length > 0,
    blockingTasks
  };
}

/**
 * Validates that adding a new dependency does not cause a circular dependency loop.
 * @param {string} taskId - The dependent task ID.
 * @param {string} dependsOnTaskId - The prerequisite task ID.
 * @param {Array<object>} existingDependencies - Existing dependency relations.
 * @returns {boolean} True if safe (no cycle), false if cycle would be created.
 */
export function wouldCreateCycle(taskId, dependsOnTaskId, existingDependencies = []) {
  if (taskId === dependsOnTaskId) return true;

  // Build adjacency list: node -> prerequisites
  const adj = new Map();
  for (const d of existingDependencies) {
    const u = String(d.task_id);
    const v = String(d.depends_on_task_id);
    if (!adj.has(u)) adj.set(u, []);
    adj.get(u).push(v);
  }

  // Tentatively add the edge taskId -> dependsOnTaskId
  if (!adj.has(taskId)) adj.set(taskId, []);
  adj.get(taskId).push(dependsOnTaskId);

  // Check if dependsOnTaskId can reach taskId (which would mean a cycle)
  const visited = new Set();
  const queue = [dependsOnTaskId];

  while (queue.length > 0) {
    const curr = queue.shift();
    if (curr === taskId) return true; // Cycle detected!
    if (!visited.has(curr)) {
      visited.add(curr);
      const neighbors = adj.get(curr) || [];
      for (const n of neighbors) {
        if (!visited.has(n)) queue.push(n);
      }
    }
  }

  return false;
}

