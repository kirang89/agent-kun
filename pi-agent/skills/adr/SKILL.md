---
name: adr
description: >
  Write Architecture Decision Records (ADRs) when the user or agent makes architecturally significant decisions — 
  those affecting structure, non-functional characteristics, dependencies, interfaces, or construction techniques.
  Use when a design choice is debated, a technology is selected, or an approach is chosen among alternatives.
---

# Architecture Decision Records

## What qualifies as a recordable decision?

Only system design decisions should be recorded. A decision qualifies if it falls into one of these categories:

- **Technology/infrastructure choices** — Choosing one technology over another (e.g., PostgreSQL over SQLite, Redis over Memcached)
- **Major refactoring from dependency changes** — Switching an ORM, replacing a core library, migrating frameworks
- **Core workflow changes** — Modifying or redesigning workflows that are central to how the system operates
- **Domain modeling changes** — Changing abstractions, entities, or mental models that affect how users or developers think about a workflow
- **New API surfaces** — Adding a new API endpoint, protocol, or integration surface
- **Structural changes** — Reorganizing module boundaries, splitting/merging services, changing layering
- **Non-functional trade-offs** — Decisions affecting performance, security, scalability, or reliability characteristics

Do NOT record:
- Minor implementation details (variable naming, formatting, small refactors)
- Bug fixes or routine maintenance
- Code style or linting choices
- Test-only changes that don't affect system design
- Tooling preferences (editor, CLI tools) unless they affect the build/deploy pipeline

Decisions are the central piece. The same forces may appear in multiple ADRs.
Small, modular documents have the best chance of being kept up to date.

## ADR format (MADR minimal template)

Each ADR file follows this exact format:

```markdown
# {Short title as noun phrase, e.g. "Use PostgreSQL for persistent storage"}

- **Date:** {YYYY-MM-DD}
- **Parent:** [{parent ADR filename}]({parent ADR filename})  <!-- only when this decision supersedes a previous one -->

## Context and Problem Statement

{Describe the context and forces at play in 2-3 sentences. Use value-neutral language — describe facts, not opinions. Articulate the problem as a question when possible. Call out tensions between forces.}

## Considered Options

* {Option 1}
* {Option 2}
* {Option 3}

## Decision Outcome

Chosen option: "{Option N}", because {justification — reference forces, constraints, or trade-offs that led to this choice}.

### Consequences

* Good, because {positive consequence}
* Bad, because {negative consequence}
```

### Required metadata

Every ADR must include:

1. **Date** — The date the decision was recorded (`YYYY-MM-DD`).
2. **Parent** — A link to the parent ADR when this decision supersedes or evolves a previous one. Omit when the decision is entirely new.

## File naming

ADRs are numbered sequentially and monotonically. Numbers are never reused.

```
adrs/
├── 0001-use-postgresql-for-persistent-storage.md
├── 0002-adopt-event-sourcing-for-order-domain.md
└── 0003-choose-react-for-frontend-framework.md
```

Format: `NNNN-{kebab-case-title}.md`

To determine the next number, check the existing files in the `adrs/` directory and increment.

## Lifecycle

- ADRs are **immutable** — never edit the prose of a past decision. Write a new ADR instead.
- A new ADR that changes or evolves an existing decision must include a **Parent** link to the original.
- When a child ADR is created, the parent gets a single notice prepended: `> **Superseded by [NNNN-title.md](NNNN-title.md)**`
  This notice is the only permitted modification to an existing ADR.
- Superseded ADRs remain in the repository — they are historical records of what *was* decided.

## Guidelines

- Title should be a short noun phrase (e.g., "ADR 5: LDAP for Multitenant Integration")
- Context section: describe forces (technological, political, social, project-local) in tension
- Decision section: use full sentences with active voice — "We will ..."
- Keep each ADR short and digestible — aim for a single page
- Store ADRs in the project repository under `adrs/`
