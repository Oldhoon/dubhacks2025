# GameState Engine

A reusable engine that blends code comprehension puzzles with 3D gameplay, where every successful action executes the next line of a C code snippet.

## Architecture

The GameState Engine separates presentation (3D grid, drag/drop) from deterministic game-state evaluation.

### Core Components

#### 1. **WorldState** (`WorldState.js`)
The authoritative model of the game world. Single source of truth for:
- Grid cells and entity placements
- Code variables and their bindings to game entities
- Inventory/tray state
- Action history for undo/replay

```javascript
const worldState = new WorldState({
    gridRows: 5,
    gridCols: 5,
    levelId: 'level-1'
});

// Add entity
worldState.addEntity({
    id: 'catapult-1',
    type: 'catapult',
    position: { row: 0, col: 0 }
});

// Set variable
worldState.setVariable('x', 5);
worldState.bindVariable('x', 'catapult-1');
```

#### 2. **CodeLineTracker** (`CodeLineTracker.js`)
Manages progression through code lines:
- Tracks current/next line
- Exposes highlighting info for UI
- Resolves success/failure
- Manages checkpoints and statistics

```javascript
const tracker = new CodeLineTracker([
    { code: 'int x = 5;', operation: 'assign', operands: { variable: 'x', value: 5 } },
    { code: 'int y = 3;', operation: 'assign', operands: { variable: 'y', value: 3 } }
]);

tracker.start();
const currentLine = tracker.getCurrentLine();
tracker.advance(); // Move to next line
```

#### 3. **ActionResolver** (`ActionResolver.js`)
Maps player actions to code semantics:
- Validates actions against current code line
- Emits state diffs
- Handles rollback on failure
- Supports operations: assign, swap, move, deref, increment, decrement

```javascript
const resolver = new ActionResolver(worldState, tracker);

const result = await resolver.resolveAction({
    verb: 'place',
    params: {
        entityId: 'catapult-1',
        target: { row: 0, col: 0 },
        createIfMissing: true
    }
});

if (result.success) {
    console.log('Action succeeded!', result.feedback);
}
```

#### 4. **LevelScriptLoader** (`LevelScriptLoader.js`)
Loads and parses C snippet metadata:
- Parses code lines with annotations
- Extracts operations and operands
- Defines expected states
- Supports inline metadata comments

```javascript
const loader = new LevelScriptLoader();

const level = loader.loadLevel({
    id: 'level-1',
    title: 'Assignment 101',
    codeLines: [
        {
            code: 'int x = 5; // @hint: Place catapult at (0,0)',
            operation: 'assign',
            operands: { variable: 'x', value: 5 },
            expectedState: {
                variables: { x: 5 },
                entities: { 'entity-x': { row: 0, col: 0 } }
            }
        }
    ]
});
```

#### 5. **GameStateManager** (`GameStateManager.js`)
Main controller that coordinates all subsystems:
- High-level API for level management
- Event system for UI integration
- Save/load progress
- Hint system integration

```javascript
const manager = new GameStateManager({
    autoSave: true,
    saveKey: 'my-game-progress'
});

// Load level
await manager.loadLevel(levelConfig);

// Listen for events
manager.on('actionSuccess', ({ action, result }) => {
    console.log('Action succeeded!');
});

manager.on('levelComplete', ({ level, stats }) => {
    console.log('Level complete!', stats);
});

// Execute action
const result = await manager.executeAction({
    verb: 'place',
    params: { entityId: 'cat-1', target: { row: 0, col: 0 } }
});

// Get hint
const hint = manager.getHint(1); // tier 0=nudge, 1=contextual, 2=explicit
```

## Data Models

### Level Definition
```javascript
{
    id: 'level-1',
    title: 'Assignment 101',
    description: 'Learn variable assignment',
    codeSnippet: 'int x = 5;\\nint y = 3;',
    codeLines: [
        {
            lineNumber: 1,
            code: 'int x = 5;',
            operation: 'assign',
            operands: { variable: 'x', value: 5 },
            expectedState: { variables: { x: 5 } },
            hint: 'Place a unit at position (0,0)',
            metadata: { autoAdvance: true }
        }
    ],
    initialState: {
        grid: { rows: 5, cols: 5 },
        entities: [],
        variables: {},
        tray: { items: [] }
    },
    trayConfig: { slots: 4, items: ['catapult', 'mage'] }
}
```

### Action Event
```javascript
{
    actorId: 'player',
    verb: 'place',
    params: {
        entityId: 'catapult-1',
        target: { row: 0, col: 0 },
        createIfMissing: true,
        entityType: 'catapult'
    },
    timestamp: 1234567890
}
```

## Gameplay Loop

1. **Load Level** → Initialize WorldState and CodeTracker from level config
2. **Highlight First Line** → UI displays current code line with hint
3. **Player Action** → Drag unit to grid, triggering action event
4. **Resolve Action** → ActionResolver validates and simulates effect
5. **Validate State** → Compare result to expectedState
6. **On Success** → Advance CodeLineTracker, animate feedback, unlock tray items
7. **On Failure** → Roll back state, display hint, keep line highlighted
8. **Level Complete** → All lines executed successfully

## Supported Operations

- **assign**: `x = 5;` - Place entity with value
- **swap**: `swap(a, b);` - Exchange entity positions
- **move**: Move entity to new position
- **deref**: `*ptr = value;` - Pointer dereference
- **increment**: `x++;` - Increment variable
- **decrement**: `x--;` - Decrement variable
- **place**: Add entity from tray to grid
- **remove**: Delete entity from grid

## Events

The GameStateManager emits these events:

- `levelLoaded` - Level has been loaded
- `actionSuccess` - Action succeeded and state updated
- `actionFailure` - Action failed validation
- `lineAdvanced` - Code execution moved to next line
- `levelComplete` - All code lines executed successfully
- `levelReset` - Level was reset

## Example Usage

```javascript
import { GameStateManager } from './gamestate';
import level1 from './levels/level1.js';

// Initialize
const game = new GameStateManager();

// Load level
await game.loadLevel(level1);

// Listen for events
game.on('actionSuccess', ({ result }) => {
    // Update 3D scene
    animateSuccess(result.stateDiff);
});

game.on('lineAdvanced', ({ line }) => {
    // Highlight next line in code viewer
    highlightCodeLine(line.lineNumber);
});

// Player drags catapult to grid position (0,0)
const result = await game.executeAction({
    verb: 'place',
    params: {
        entityId: 'catapult-1',
        entityType: 'catapult',
        target: { row: 0, col: 0 },
        createIfMissing: true
    }
});

if (result.success) {
    console.log('Level progress:', game.getGameState());
}
```

## Future Extensions

- **TrayManager**: Manage inventory cooldowns and availability
- **HintSystem**: Multi-tier hint system with escalating help
- **ProgressionManager**: Level unlocking and completion tracking
- **Custom Operations**: Register domain-specific code operations
- **Undo/Redo**: Full history navigation
- **Multiplayer**: Shared world state with conflict resolution
