import WorldState from './WorldState.js';
import CodeLineTracker from './CodeLineTracker.js';
import ActionResolver from './ActionResolver.js';
import LevelScriptLoader from './LevelScriptLoader.js';

/**
 * GameStateManager - Main controller for the gamestate engine
 * Coordinates all subsystems and provides high-level API
 */
export default class GameStateManager {
    constructor(config = {}) {
        this.levelLoader = new LevelScriptLoader();
        this.worldState = null;
        this.codeTracker = null;
        this.actionResolver = null;

        this.currentLevel = null;
        this.eventHandlers = new Map();

        // Configuration
        this.config = {
            autoSave: config.autoSave ?? true,
            saveKey: config.saveKey ?? 'gamestate',
            ...config
        };
    }

    /**
     * Load and start a level
     */
    async loadLevel(levelConfig) {
        // Load level definition
        const level = this.levelLoader.loadLevel(levelConfig);
        this.currentLevel = level;

        // Initialize WorldState from level config
        this.worldState = new WorldState({
            gridRows: level.initialState.grid?.rows ?? 5,
            gridCols: level.initialState.grid?.cols ?? 5,
            levelId: level.id,
            levelMetadata: level.metadata
        });

        // Initialize entities from level
        if (level.initialState.entities) {
            for (const entityConfig of level.initialState.entities) {
                this.worldState.addEntity(entityConfig);
            }
        }

        // Initialize variables
        if (level.initialState.variables) {
            for (const [name, value] of Object.entries(level.initialState.variables)) {
                this.worldState.setVariable(name, value);
            }
        }

        // Initialize tray
        if (level.initialState.tray?.items) {
            for (const item of level.initialState.tray.items) {
                this.worldState.addToTray(item.type, item.metadata);
            }
        }

        // Initialize CodeLineTracker
        this.codeTracker = new CodeLineTracker(level.codeLines);
        this.codeTracker.start();

        // Initialize ActionResolver
        this.actionResolver = new ActionResolver(this.worldState, this.codeTracker);

        // Emit level loaded event
        this.emit('levelLoaded', { level, worldState: this.worldState });

        return level;
    }

    /**
     * Execute a player action
     */
    async executeAction(action) {
        if (!this.actionResolver) {
            throw new Error('No level loaded');
        }

        // Resolve the action
        const result = await this.actionResolver.resolveAction(action);

        // Emit events based on result
        if (result.success) {
            this.emit('actionSuccess', { action, result });

            if (result.feedback?.levelComplete) {
                this.emit('levelComplete', {
                    level: this.currentLevel,
                    stats: this.codeTracker.getStats()
                });
            } else if (result.feedback?.advanced) {
                this.emit('lineAdvanced', {
                    line: this.codeTracker.getCurrentLine(),
                    index: this.codeTracker.currentIndex
                });
            }
        } else {
            this.emit('actionFailure', { action, result });
        }

        // Auto-save if enabled
        if (this.config.autoSave) {
            this.saveProgress();
        }

        return result;
    }

    /**
     * Get current game state
     */
    getGameState() {
        return {
            level: this.currentLevel,
            worldState: this.worldState ? this.worldState.getSummary() : null,
            codeTracker: this.codeTracker ? this.codeTracker.getSummary() : null,
            currentLine: this.codeTracker ? this.codeTracker.getCurrentLine() : null,
            highlightInfo: this.codeTracker ? this.codeTracker.getHighlightInfo() : null
        };
    }

    /**
     * Get hint for current line
     */
    getHint(tier = 0) {
        if (!this.codeTracker) {
            return null;
        }

        const currentLine = this.codeTracker.getCurrentLine();
        if (!currentLine) {
            return null;
        }

        // Record hint usage
        this.codeTracker.recordHintUsed();

        // Return hint based on tier
        if (tier === 0) {
            // Nudge hint
            return {
                tier: 0,
                text: `Think about the operation: ${currentLine.operation}`,
                type: 'nudge'
            };
        } else if (tier === 1) {
            // Contextual hint
            return {
                tier: 1,
                text: currentLine.hint || `Execute: ${currentLine.code}`,
                type: 'contextual'
            };
        } else {
            // Explicit hint
            const hint = this.generateExplicitHint(currentLine);
            return {
                tier: 2,
                text: hint,
                type: 'explicit'
            };
        }
    }

    /**
     * Generate explicit hint from expected state
     */
    generateExplicitHint(codeLine) {
        const { operation, operands, expectedState } = codeLine;

        switch (operation) {
            case 'assign':
                if (expectedState?.entities) {
                    const entityId = Object.keys(expectedState.entities)[0];
                    const pos = expectedState.entities[entityId];
                    return `Place a unit at position (${pos.row}, ${pos.col}) to assign ${operands.variable} = ${operands.value}`;
                }
                return `Assign ${operands.variable} = ${operands.value}`;

            case 'swap':
                return `Swap the positions of ${operands.args[0]} and ${operands.args[1]}`;

            case 'move':
                return `Move the entity to a new position`;

            default:
                return `Execute: ${codeLine.code}`;
        }
    }

    /**
     * Undo last action
     */
    undo() {
        if (this.worldState) {
            return this.worldState.undo();
        }
        return false;
    }

    /**
     * Reset current level
     */
    async resetLevel() {
        if (!this.currentLevel) {
            return false;
        }

        // Reload the level
        await this.loadLevel(this.currentLevel);
        this.emit('levelReset', { level: this.currentLevel });

        return true;
    }

    /**
     * Save progress
     */
    saveProgress() {
        if (!this.worldState || !this.codeTracker) {
            return;
        }

        const saveData = {
            levelId: this.currentLevel?.id,
            worldSnapshot: this.worldState.snapshot(),
            codeIndex: this.codeTracker.currentIndex,
            stats: this.codeTracker.getStats(),
            timestamp: Date.now()
        };

        try {
            localStorage.setItem(this.config.saveKey, JSON.stringify(saveData));
        } catch (error) {
            console.error('Failed to save progress:', error);
        }
    }

    /**
     * Load saved progress
     */
    loadProgress() {
        try {
            const data = localStorage.getItem(this.config.saveKey);
            if (!data) {
                return null;
            }

            return JSON.parse(data);
        } catch (error) {
            console.error('Failed to load progress:', error);
            return null;
        }
    }

    /**
     * Register event handler
     */
    on(event, handler) {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, []);
        }
        this.eventHandlers.get(event).push(handler);
    }

    /**
     * Unregister event handler
     */
    off(event, handler) {
        if (!this.eventHandlers.has(event)) {
            return;
        }

        const handlers = this.eventHandlers.get(event);
        const index = handlers.indexOf(handler);

        if (index !== -1) {
            handlers.splice(index, 1);
        }
    }

    /**
     * Emit event
     */
    emit(event, data) {
        if (!this.eventHandlers.has(event)) {
            return;
        }

        const handlers = this.eventHandlers.get(event);
        for (const handler of handlers) {
            try {
                handler(data);
            } catch (error) {
                console.error(`Error in ${event} handler:`, error);
            }
        }
    }

    /**
     * Get available levels
     */
    getAvailableLevels() {
        return this.levelLoader.getAllLevels();
    }

    /**
     * Check if level is unlocked (can be extended with progression logic)
     */
    isLevelUnlocked(levelId) {
        // TODO: Implement proper progression logic
        return true;
    }
}
