# GameState Engine Plan

## Vision
- Blend code comprehension puzzles with tactile 3D gameplay where every successful action executes the next line of a C snippet (e.g., `levels.c`).
- Make the engine reusable across levels by separating presentation (3D grid, drag/drop tray) from deterministic game-state evaluation.

## Core Systems
- **LevelScriptLoader**: fetch C snippet metadata, annotate each line with required action type, operands, and validation rules.
- **CodeLineTracker**: tracks current/next line, exposes highlighting info, resolves success/failure, and checkpoints progress.
- **ActionResolver**: maps player actions (drag Catapult, swap entities, pointer dereference) onto code semantics; emits state diffs.
- **WorldState**: authoritative model of grid cells, inventory/tray contents, active characters/tools, and their variables.
- **TrayManager**: surfaces characters/tools based on `LevelScriptLoader` hints; handles drag/drop lifecycle and cooldowns.
- **HintSystem**: provides contextual feedback from `CodeLineTracker`, escalating from nudge → explicit instruction.
- **ProgressionManager**: handles level completion, unlock logic, and persistence for new challenges.

## Data Model
- Level definition: `id`, snippet source, ordered `CodeLine` objects with `operation`, `operands`, `expectedState`, hint text.
- World snapshot: grid dimensions, entity placements, variable bindings, inventory state.
- Action events: `{ actorId, toolId, target, verb, params, timestamp }` queued to `ActionResolver`.

## Type-to-Character Mapping
- `int` → Necromancer; summons and manipulates entities to stand in for integer values.
- `char` → Lumberjack; handles byte-sized tasks like planting or cutting individual trees.
- `short` → Mage; grows or transforms plants to represent short integer operations.
- `*` pointer → Catapult; links memory cells and writes through references.
- `[]` array → Field; indicates contiguous memory cells that pointer actions can traverse.

## C-to-Gameplay Mapping
- Declaration (`int x;`): spawn a new character matching the declared type.
- Assignment (`x = 5;`): the spawned character performs an action updating its stored value.
- Pointer creation (`int *p = &x;`): a Catapult connects to the target variable to represent the reference.
- Dereference write (`*p = 4;`): Catapult fires to update the linked variable’s state.
- Dereference read (`int y = *p;`): spawn a new variable entity that copies the pointed value.
- Array access (`trees[1] = trees[3];`): shuffle or swap values between Field tiles to mirror indexed writes.

## Gameplay Loop
- Load level → initialize `WorldState` and tray from level config.
- Highlight first code line; `HintSystem` surfaces goal.
- Player action triggers `ActionResolver`, which simulates effect, compares to `expectedState`, and updates `WorldState`.
- On success: advance `CodeLineTracker`, animate 3D feedback, unlock new tray items if defined.
- On mismatch: roll back world diff, issue hint, keep line highlighted.
- When final line resolves, mark level complete, call `ProgressionManager` to unlock next challenge.

## Milestones
1. Prototype `WorldState` schema and unit conversions between code variables and scene entities.
2. Implement `LevelScriptLoader` with basic parsing of tagged C comments.
3. Build `CodeLineTracker` + `ActionResolver` loop with minimal operations (assignment, swap).
4. Wire 3D grid interactions to action events; support drag/drop validation and rollback animations.
5. Add `HintSystem` tiers and integrate real-time code highlighting UI.
6. Implement persistence for level completion and gating logic in `ProgressionManager`.

## Risks & Mitigations
- **Parsing complexity**: start with curated snippets using metadata comments to avoid full C parsing.
- **State desync**: enforce single source of truth in `WorldState` and replay actions deterministically in tests.
- **UX clarity**: iterative testing with greybox UI to ensure players understand code-to-action mapping before adding polish.
