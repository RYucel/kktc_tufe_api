# Manager-Implementer Autonomous Execution Rule

## Core Philosophy: Preventing Asymptotic Stalling
Over long-horizon coding tasks, language models experience context bloat, lose momentum, and get trapped in minutiae. To prevent this stalling:
- Break complex goals into clear, sequential phases.
- Separate high-level orchestration (Manager) from deep technical execution (Implementer).
- Work strictly one phase at a time (piecemeal execution).

## Operational Rules

### 1. Two-Tier Agent Architecture
- **Manager Agent**:
  - Builds a comprehensive checklist of all project requirements.
  - Groups checklist items into logical **Phases** (Phase 1, Phase 2, etc.).
  - Orchestrates execution using `/goal` mode.
  - Hands off only **one phase at a time** to the Implementer subagent.
- **Implementer Agent**:
  - Operates in a dedicated subagent thread.
  - Focuses exclusively on the current assigned phase.
  - Reports back only when the assigned phase is complete and verified.

### 2. Prompt Directives & Language Precision
- **Use "Extremely Well", Avoid "Perfect"**:
  - Prompts must instruct: `"Complete Phase [N] completely, extremely well."`
  - Never instruct the agent to make code "perfect", as this triggers endless loops on trivialities. "Extremely well" allows the agent to satisfy the Definition of Done and move forward.

### 3. Visual & Transparent Tracking (`progress.html`)
- The Implementer maintains a lightweight `progress.html` checklist dashboard in the project:
  - Lists all phases and individual tasks with checkboxes.
  - Displays a completion counter & progress bar (`X / Y tasks completed`).
  - Records completion timestamps/chart to visualize velocity over time.
- The dashboard is updated after every meaningful step.

### 4. Closed-Loop Verification
- Implementer tests its own code (unit tests, running local servers, inspecting logs) before reporting completion.
- Manager verifies phase completion against the checklist criteria before triggering the next phase.
