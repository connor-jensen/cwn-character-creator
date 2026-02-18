# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Headless JavaScript engine for Cities Without Number (CWN) tabletop RPG character creation, with a React/Vite demo UI.

## Commands

**Run tests (root):**
```bash
node --test cwn-engine.test.js
```

**Demo app (from `demo/` directory):**
```bash
npm run dev      # Vite dev server
npm run build    # Production build
npm run lint     # ESLint
```

## Architecture

The codebase has two layers with a clean separation:

- **`cwn-engine.js`** — Headless engine exporting all game logic functions. No UI dependencies. Uses ES modules with `import` assertions for JSON data.
- **`demo/src/App.jsx`** — React UI that imports the engine. Manages state via `useState`/`useCallback` with `deepClone()` before any engine mutations.

### Engine Design

Functions take a mutable `char` object and return it for chaining. Functions that trigger player choices (edges, foci, backgrounds) return `{ char, pending }` where `pending` is an array of actions the UI must resolve (types: `pickSkill`, `pickFocus`, `pickAttribute`, `addContact`). The unified `resolvePending(char, pendingItem, choice)` handles all pending types.

### Character Creation Flow

1. `createCharacter()` → 2. `rollAttributes()` → 3. `setStatToFourteen()` (bump one stat) → 4. `applyBackground()` → 5. Growth/learning rolls → 6. Two edges via `applyEdge()` → 7. One focus via `applyFocus()` → 8. `addBonusSkill()` → 9. `calculateDerivedStats()`

### Key Constraints

- Skill cap: level 1 during character creation
- Stat cap: 18 maximum
- Untrained combat penalty: -2
- HP minimum: 1
- House rules: STR→damage soak, WIS→initiative, WIS→trauma target, CHA→contact adjustment

### Data

`cities_without_number_data.json` contains all edges (14), backgrounds (20), and foci (26) with their effects, growth tables, and learning tables.

## Testing

Uses Node.js built-in `node:test` and `node:assert/strict`. Tests cover all engine functions including attribute rolling, skill validation/caps, edge/focus/background application, pending resolution, derived stats, and weapon/armor calculations.

## Conventions

- ES module system (`"type": "module"` in package.json)
- camelCase functions/variables, UPPER_SNAKE_CASE constants
- Attribute keys are lowercase strings (e.g., `"strength"`, `"dexterity"`)
- Errors thrown for invalid operations (bad skill names, cap violations, invalid stats)

## Worktree Workflow

This repo uses git worktrees for parallel development across multiple Claude Code sessions.

- **Never commit directly to `main`** — main is reserved for merging completed work
- **Work on your worktree branch** — check `git branch` to confirm you're on `workspace-1`, `workspace-2`, or `workspace-3`
- **Push your branch** when work is ready for merge: `git push -u origin <branch>`
- **Merges to main use squash merge** — the main session handles this via `git merge --squash <branch>`
