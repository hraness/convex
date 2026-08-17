---
title: Repository agent context
type: agent-context
scope: .
tags:
  - agents
  - architecture
  - context-engineering
---

# Repository agent context

The root `AGENTS.md` is the repository's normative control plane. Its rules apply before deeper lookup. This repository publishes `@hraness/convex`, a product-neutral parser and build-planning package.

## Authority and repository seams

`AGENTS.md` owns instructions needed before editing. `docs/` owns current multi-step procedures. Types, tests, and deterministic checkers own executable contracts. The KB owns pull-based rationale, history, evidence, maintained synthesis, plans, and relationships.

[[../notes/documentation-ownership|Documentation ownership]] preserves that split. [[../notes/repository-seams|Repository seams]] records package ownership, immutable dependency policy, and independent consumer upgrades. [[../notes/fail-closed-build-planning|Fail-closed build planning]] records the security rationale. This hub can explain those rules but cannot override them.

## Correctness and parallel work

Apply unreasonably robust programming when agent work is cheap. Keep invalid states out of the model, parse foreign values from `unknown`, and pair readable deterministic regression examples with property tests for general laws. Freeze public interfaces before parallel lanes begin and assign convergence files to one owner.

## Writing and planning

`WRITING.md` governs internal prose. `STYLE.md` adds the public prose contract. KB plans retain decisions, deviations, review findings, and reproducible evidence. Maintained notes own conclusions worth reusing after a plan reaches a terminal state.
