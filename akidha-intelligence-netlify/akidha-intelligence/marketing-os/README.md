# Akidha Marketing OS — Foundation MVP

This branch starts the first module: the shared task model and a browser prototype for the task board.

## Scope
- Four team roles: Owner, Senior Associate, Writer / Content Strategist, Video Editor / Creative Producer.
- Task fields: name, category, brief, assignee, creator, priority, effort estimate, deadline, status, dependencies.
- Board and deadline-calendar views over the same task records.
- Nine-hour shift configurable as 09:00–18:00 or 10:00–19:00, with one hour reserved for breaks (eight schedulable hours).
- Dependency guard: a task cannot be marked complete until its prerequisite task is complete.
- Capacity warnings for task estimates that exceed the daily capacity assumption.

## Architecture direction
- Frontend: static web app hosted on Netlify, source-controlled in GitHub.
- Shared records: PostgreSQL (Supabase is the current candidate) once the prototype workflow is validated.
- Authentication: individual accounts and role-based access before real team use.
- Files: object storage for scripts, images, storyboards and final creatives.
- Server-side functions: secure database operations, scheduling, AI calls and external integrations.
- Secrets stay server-side; never place API keys in frontend code.

## Scheduling rules for the prototype
1. A task requires an effort estimate and deadline.
2. Prerequisite tasks must complete before dependent work can be considered unblocked.
3. Scheduling should respect the selected shift and eight productive hours per person per day.
4. Priority and deadline break ties between otherwise schedulable tasks.
5. If constraints cannot be met, show a conflict instead of silently overbooking.
6. The prototype uses illustrative data and does not yet promise an optimal schedule.

## Out of scope for this first slice
- Real multi-user login or cross-device syncing.
- Live Meta, Instagram, Reddit or news integrations.
- AI-generated recommendations and automatic publishing.
- Production-grade calendar time-slot optimization.

## Next implementation steps
1. Validate task creation and workflow with sample data.
2. Agree on the schedule allocation rules and edge cases.
3. Add a shared database and authentication.
4. Add creative records and link tasks to ideas/campaigns.
5. Add metrics and learning-loop records.
