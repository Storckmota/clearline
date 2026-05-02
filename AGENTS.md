# AGENTS.md — Clearline Agent Operating System

## 1. Purpose

This file defines how AI agents must work inside the Clearline project.

It does not define product behavior.

It does not replace:

- `PROJECT.md`
- `SPEC.md`
- `ARCHITECTURE.md`
- `ACCEPTANCE_CRITERIA.md`
- `TASKS.md`

Those core documents remain the source of truth.

`AGENTS.md` only defines how agents should read, execute, review, verify, and hand off work.

---

## 2. Core Rule

Agents must not invent requirements.

Every implementation decision must trace back to one of these files:

1. `PROJECT.md`
2. `SPEC.md`
3. `ARCHITECTURE.md`
4. `ACCEPTANCE_CRITERIA.md`
5. `TASKS.md`

If behavior is unclear, stop and ask.

Do not guess.

---

## 3. Required Read Order

Before starting any work, every agent must read files in this order:

1. `AGENTS.md`
2. Selected role file from `agents/`
3. `PROJECT.md`
4. `SPEC.md`
5. `ARCHITECTURE.md`
6. `ACCEPTANCE_CRITERIA.md`
7. `TASKS.md`

Example:

If working as implementation agent:

1. Read `AGENTS.md`
2. Read `agents/implementation.md`
3. Read `PROJECT.md`
4. Read `SPEC.md`
5. Read `ARCHITECTURE.md`
6. Read `ACCEPTANCE_CRITERIA.md`
7. Read `TASKS.md`

---

## 4. Source of Truth Hierarchy

If any file conflicts with another, follow this order:

1. `PROJECT.md`
2. `SPEC.md`
3. `ARCHITECTURE.md`
4. `ACCEPTANCE_CRITERIA.md`
5. `TASKS.md`
6. `AGENTS.md`
7. Selected file inside `agents/`

Core docs always win over agent instructions.

Agent files explain how to work.

Core docs define what to build.

---

## 5. Available Agent Roles

Agent role files live inside the `agents/` folder.

Current roles:

- `agents/implementation.md`
- `agents/code-review.md`
- `agents/qa-acceptance.md`
- `agents/security-review.md`
- `agents/handoff.md`
- `agents/colosseum-review.md`
- `agents/ux-ui-review.md`

Use only one role at a time unless explicitly instructed.

---

## 6. Role Selection Guide

Use `agents/implementation.md` when:

- building a task from `TASKS.md`
- creating files
- editing code
- implementing APIs
- implementing scripts
- implementing UI
- updating `TASKS.md` after verified work

Use `agents/code-review.md` when:

- reviewing changed code
- checking bugs
- checking maintainability
- checking refactor opportunities
- checking scope drift
- checking if implementation matches the approved docs

Use `agents/qa-acceptance.md` when:

- verifying completed work against `ACCEPTANCE_CRITERIA.md`
- checking whether a task can be marked complete
- identifying pass/fail/unverified behavior

Use `agents/security-review.md` when reviewing:

- environment variables
- secret exposure
- Supabase service role usage
- webhook authorization
- replay endpoint security
- API route safety
- payment classification risks

Use `agents/handoff.md` when:

- moving from Antigravity to Codex
- moving from Codex to Claude
- moving from one AI session to another
- summarizing current project state
- preserving context without relying on chat memory

Use `agents/colosseum-review.md` when:

- invoking Colosseum Copilot
- reviewing Solana-specific implementation risk
- reviewing hackathon competitiveness
- reviewing demo positioning
- reviewing checkpoint decisions

Use `agents/ux-ui-review.md` only after the core data path works.

Do not use UX/UI review before:

- Solana Pay reference flow works
- Helius ingestion works
- parser/RPC fallback works
- shared ingestion pipeline works
- replay endpoint works
- proof page exists

---

## 7. Universal Agent Rules

All agents must:

- work only within the current requested role
- follow the official read order
- respect `TASKS.md`
- respect `ACCEPTANCE_CRITERIA.md`
- avoid unrelated changes
- keep diffs small when possible
- document blockers immediately
- preserve existing approved scope
- avoid adding features not listed in approved docs
- update `TASKS.md` only after verification

All agents must not:

- redesign the product
- rewrite the architecture without approval
- add forbidden scope
- add auth
- add RLS
- add multi-wallet support
- add cron
- add email notifications
- add CSV export
- add AI features
- add custom smart contracts
- add mainnet deployment as a requirement
- add heuristic matching by amount or sender
- add invoice features
- add dashboards or charts
- add accounting features
- add production queue infrastructure

If a feature does not help classify incoming USDC transfers, do not build it.

---

## 8. Task Execution Rules

Implementation agents must work from `TASKS.md`.

Before starting a task, state:

- current phase
- current task
- files expected to change
- relevant acceptance criteria

During implementation:

- do not jump ahead
- do not polish UI before the data path works
- do not add unrequested abstractions
- do not create new architecture without approval
- do not mark incomplete tasks as complete

After implementation:

- verify the task
- check relevant acceptance criteria
- update `TASKS.md` only if verified
- report changed files
- report remaining blockers

---

## 9. Acceptance Criteria Rule

A task is not complete just because code exists.

A task is complete only when:

- implementation matches `PROJECT.md`
- implementation matches `SPEC.md`
- implementation matches `ARCHITECTURE.md`
- relevant criteria in `ACCEPTANCE_CRITERIA.md` pass
- relevant command, script, test, or manual verification runs without obvious error
- no forbidden scope was added
- `TASKS.md` is updated after verification

If acceptance criteria are not applicable, the agent must explain why.

If acceptance criteria fail, the task is not complete.

---

## 10. Documentation Update Rule

Do not update core docs casually.

Only update:

- `PROJECT.md`
- `SPEC.md`
- `ARCHITECTURE.md`
- `ACCEPTANCE_CRITERIA.md`
- `TASKS.md`

when the change is required and approved.

If implementation reveals that a core document is wrong, incomplete, or conflicting:

1. stop
2. document the issue
3. explain the proposed change
4. ask for approval before editing the core document

---

## 11. Tool Usage Guidance

### Antigravity

Use Antigravity primarily for implementation while tokens are available.

Prompt pattern:

```txt
Read AGENTS.md.
Use agents/implementation.md.
Then read PROJECT.md, SPEC.md, ARCHITECTURE.md, ACCEPTANCE_CRITERIA.md, and TASKS.md.
Identify the current unchecked task.
Work only on that task.
Verify relevant acceptance criteria before marking complete.
Update TASKS.md only after verification.
```

### Codex

Use Codex when:

- Antigravity tokens run out
- code review is needed
- QA acceptance review is needed
- Colosseum Copilot checkpoint review is needed

Codex should use the same Markdown files.

Do not require `.codex/agents` yet.

### Colosseum Copilot

Use Colosseum Copilot only at high-value checkpoints:

- after classification engine works
- after Solana Pay reference proof works
- after Helius real payload capture
- after parser + RPC fallback works
- after shared ingestion + replay endpoint works
- before final demo/submission

Do not use Colosseum Copilot for every small change.

### Claude / Cloud Code / Perplexity / ChatGPT

These tools may be used for review, research, or fallback work.

They must still follow this file and the selected role file.

---

## 12. Handoff Rule

When switching tools or sessions, use `agents/handoff.md`.

A handoff must include:

- current phase
- current task
- completed tasks
- changed files
- unverified behavior
- blockers
- next recommended task
- relevant acceptance criteria
- any warnings for the next agent

Do not rely on chat memory.

The repo files are the memory.

---

## 13. Output Format For Agents

When completing work, agents must report:

```txt
Task completed:
- Task:
- Phase:
- Changed files:
- Acceptance criteria checked:
- Verification performed:
- Behavior unverified:
- Blockers:
- TASKS.md updated:
```

When blocked, agents must report:

```txt
Task blocked:
- Task:
- Phase:
- Blocker:
- Acceptance criteria blocked:
- Files inspected:
- Required next step:
```

When reviewing, agents must report:

```txt
Review result:
- Scope drift:
- Bugs found:
- Acceptance criteria issues:
- Security issues:
- Maintainability issues:
- Required fixes:
- Optional improvements:
```

---

## 14. Protected Instruction Files

The following files are protected instruction files:

- `AGENTS.md`
- `agents/implementation.md`
- `agents/code-review.md`
- `agents/qa-acceptance.md`
- `agents/security-review.md`
- `agents/handoff.md`
- `agents/colosseum-review.md`
- `agents/ux-ui-review.md`
- `PROJECT.md`
- `SPEC.md`
- `ARCHITECTURE.md`
- `ACCEPTANCE_CRITERIA.md`
- `TASKS.md`

Agents must not modify these files unless explicitly instructed by the user.

These files are the operating system, memory, product definition, architecture, acceptance gate, and execution tracker for the project.

Do not rewrite them.

Do not simplify them.

Do not reorganize them.

Do not “improve” them without explicit approval.

Do not update them just because implementation seems easier with a different interpretation.

If an agent believes one of these files is wrong, incomplete, outdated, or conflicting, it must:

1. stop
2. explain the issue
3. explain the proposed change
4. wait for explicit approval before editing

The default behavior is:

- read protected files
- follow protected files
- do not modify protected files

---

## 15. Final Rule

Build Clearline.

Do not build an agent-management system.

Use agents to reduce confusion, not to create more process.