# Akidha Marketing OS

> Comprehensive AI-Powered Marketing Operations Platform for Education-Led Chronic Care Pharmacy.

---

## Overview

**Akidha Marketing OS** is a healthcare marketing operations platform engineered specifically for **Akidha**—an education-led digital pharmacy in India focused on chronic care (diabetes, hypertension, cardiac health, and thyroid). The platform integrates strategic OKRs, market listening, multi-platform creative production, regulatory healthcare compliance scanning, capacity planning, and closed-loop campaign learnings.

---

## Core Capabilities

### 1. Operations & State Management
- **Task & Calendar Engine**: Full task lifecycle (Backlog, Ideation, Scripting, Admin Review, Storyboard, Asset Creation, Final Review, Ready, Published, Completed).
- **Kanban & 14-Day Calendar**: Toggle between stage-based board and daily deadline calendar views.
- **Dependency Guard**: Prerequisite tasks must be marked `Completed` before dependent tasks can proceed or finish.
- **RBAC & Approvals**: Role-based access control (Admin vs. Contributor). Only Admins can approve task completion, decide claims reviews, or mark items published.

### 2. Akidha Market Intelligence Radar
- **Autonomous News & Regulation Collector**: Ingests Google News RSS feeds for Indian pharma policy, NPPA drug price control notifications, CDSCO directives, and chronic disease access.
- **Patient Question & Social Listening**: Ingests Reddit queries tracking chronic illness medicine costs, generic vs. brand trust, and substitute confusion.
- **1-Click Conversion**: Promotes high-relevance signals directly into actionable tasks and linked creative briefs.
- **Scheduled Triggers**: Programmatically installs daily morning cron triggers (08:00 AM IST) via Google Apps Script.

### 3. AI Creative Studio with Healthcare Guardrails
- **Multi-Model LLM Integration**: Configurable support for Google Gemini (`gemini-1.5-flash`) and OpenAI (`gpt-4o-mini`) via `UrlFetchApp`.
- **Akidha Brand Principles**: "Teach first, sell second"; enforces the term "substitutes" over "cheap generics"; strictly forbids advising dosage alterations or unauthorized medication switching.
- **Real-Time Compliance Scanner**: Automatically scans drafts for:
  - Prohibited cure claims (`100% cure`, `permanent cure`, `miracle remedy`).
  - Prescription tampering advice (`stop your medicine`, `change your dose`).
  - Mandatory clinician/pharmacist consultation call-to-action.
  - Discouraged / derogatory terminology.
- **Human-in-the-Loop Gating**: AI is strictly barred from approving its own medical claims or publishing without human sign-off.

### 4. Analytics, Capacity & Closed-Loop Learning
- **8-Hour Shift Capacity Planner**: Models 8 productive schedulable hours per person per day across configurable shifts (`09:00–18:00` or `10:00–19:00` with 1 hour reserved for breaks). Automatically flags team overbooking and workload imbalances.
- **Campaign Retrospective Learning Loop**: Captures structured learnings (Hypothesis $\to$ Observation $\to$ Next Test). Approved learnings are dynamically injected into future AI prompts.
- **Performance Attribution**: Relates campaign metrics (WhatsApp inquiries, CPL, reach) to creative items and overarching business OKRs.

---

## Architecture & Technology Stack

- **Backend**: Google Apps Script (V8 Runtime) hosted in `apps-script/Code.js`.
- **Frontend**: Single-Page Application (SPA) in `apps-script/Index.html` with zero external runtime dependencies.
- **Persistence**: Google Sheets relational model (12 structured tabs: `Users`, `Tasks`, `Goals`, `Creatives`, `Approvals`, `TaskDependencies`, `Themes`, `WorkBlocks`, `Performance`, `Learnings`, `MarketSignals`, `AuditLog`).
- **Performance**: High-performance batched range reads and writes; eliminates $O(N \cdot M)$ sheet scans.

---

## Local Development & Automated Testing

### 1. Run Automated Test Suite
The project includes a Node.js unit and integration test suite:
```bash
# Run all unit and integration tests (23 tests)
npm test

# Check Apps Script syntax
npm run lint:syntax
```

### 2. Clasp Tooling
```bash
# Inspect tracked files
npm run clasp:status
```

---

## Google Apps Script Setup & Deployment

1. Create a dedicated Google Spreadsheet.
2. In Google Apps Script Editor (**Project Settings > Script Properties**), set:
   - `SPREADSHEET_ID`: The ID of your spreadsheet.
   - `ADMIN_EMAILS`: `sourabh.suryavanshi@akidha.in,tanvi@akidha.in`
   - `CONTRIBUTOR_EMAILS`: `nikita@akidha.in,sai@akidha.in`
   - *(Optional for AI)* `AI_PROVIDER`: `gemini` or `openai`
   - *(Optional for AI)* `GEMINI_API_KEY` or `OPENAI_API_KEY`
3. Run `setupDatabase()` once from the Apps Script editor to provision all 12 database tabs, frozen headers, and default seeds.
4. Deploy as Web App with **Execute as: Me**, **Access: Anyone**.

---

## CI/CD Pipeline

- **GitHub Actions CI** (`.github/workflows/ci.yml`): Runs syntax checks, tests, and clasp file verification on every push and pull request.
- **GitHub Actions Deploy** (`.github/workflows/deploy.yml`): Safe manual workflow_dispatch deployment to staging or production with automated pre-deployment test validation.
