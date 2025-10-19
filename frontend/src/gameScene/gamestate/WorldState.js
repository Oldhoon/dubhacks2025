/**
 * WorldState - Authoritative model of the game world
 * Single source of truth for grid cells, entities, variables, and inventory
 */
export default class WorldState {
    constructor(config = {}) {
        // Grid configuration
        this.gridRows = config.gridRows ?? 5;
        this.gridCols = config.gridCols ?? 5;

        // Grid cells: 2D array where each cell can contain entities
        // grid[row][col] = { entities: [], terrain: null, metadata: {} }
        this.grid = this.initializeGrid();

        // Entity registry: Map of entityId -> entity data
        // entity = { id, type, position: {row, col}, variables: {}, metadata: {} }
        this.entities = new Map();

        // Variable bindings: code variables mapped to game state
        // variables['x'] = { type: 'int', value: 5, boundTo: 'entity-id' }
        this.variables = new Map();

        // Inventory/Tray state
        this.tray = {
            available: [], // Available items/units that can be placed
            cooldowns: new Map(), // itemType -> timestamp when available again
            slots: config.traySlots ?? 4
        };

        // Action history for undo/replay
        this.actionHistory = [];
        this.actionIndex = 0; // Current position in history

        // Level metadata
        this.levelId = config.levelId ?? null;
        this.levelMetadata = config.levelMetadata ?? {};
    }

    /**
     * Initialize empty grid
     */
    initializeGrid() {
        const grid = [];
        for (let row = 0; row < this.gridRows; row++) {
            grid[row] = [];
            for (let col = 0; col < this.gridCols; col++) {
                grid[row][col] = {
                    entities: [],
                    terrain: null,
                    metadata: {}
                };
            }
        }
        return grid;
    }

    /**
     * Add an entity to the world
     */
    addEntity(entity) {
        if (!entity.id) {
            throw new Error('Entity must have an id');
        }

        if (this.entities.has(entity.id)) {
            throw new Error(`Entity with id ${entity.id} already exists`);
        }

        const entityData = {
            id: entity.id,
            type: entity.type,
            position: entity.position ? { ...entity.position } : null,
            variables: entity.variables ?? {},
            metadata: entity.metadata ?? {}
        };

        this.entities.set(entity.id, entityData);

        // Place on grid if position provided
        if (entityData.position) {
            this.placeEntityOnGrid(entity.id, entityData.position);
        }

        return entityData;
    }

    /**
     * Remove an entity from the world
     */
    removeEntity(entityId) {
        const entity = this.entities.get(entityId);
        if (!entity) {
            return false;
        }

        // Remove from grid
        if (entity.position) {
            this.removeEntityFromGrid(entityId, entity.position);
        }

        // Remove from entity registry
        this.entities.delete(entityId);

        return true;
    }

    /**
     * Place entity on grid at given position
     */
    placeEntityOnGrid(entityId, position) {
        const { row, col } = position;

        if (!this.isValidPosition(row, col)) {
            throw new Error(`Invalid grid position: (${row}, ${col})`);
        }

        const entity = this.entities.get(entityId);
        if (!entity) {
            throw new Error(`Entity ${entityId} not found`);
        }

        // Remove from old position if exists
        if (entity.position) {
            this.removeEntityFromGrid(entityId, entity.position);
        }

        // Add to new position
        this.grid[row][col].entities.push(entityId);
        entity.position = { row, col };
    }

    /**
     * Remove entity from grid
     */
    removeEntityFromGrid(entityId, position) {
        const { row, col } = position;

        if (!this.isValidPosition(row, col)) {
            return false;
        }

        const cell = this.grid[row][col];
        const index = cell.entities.indexOf(entityId);

        if (index !== -1) {
            cell.entities.splice(index, 1);
            return true;
        }

        return false;
    }

    /**
     * Move entity from one position to another
     */
    moveEntity(entityId, newPosition) {
        const entity = this.entities.get(entityId);
        if (!entity) {
            throw new Error(`Entity ${entityId} not found`);
        }

        this.placeEntityOnGrid(entityId, newPosition);
    }

    /**
     * Swap two entities' positions
     */
    swapEntities(entityId1, entityId2) {
        const entity1 = this.entities.get(entityId1);
        const entity2 = this.entities.get(entityId2);

        if (!entity1 || !entity2) {
            throw new Error('Both entities must exist');
        }

        const pos1 = entity1.position ? { ...entity1.position } : null;
        const pos2 = entity2.position ? { ...entity2.position } : null;

        if (pos2) this.placeEntityOnGrid(entityId1, pos2);
        if (pos1) this.placeEntityOnGrid(entityId2, pos1);
    }

    /**
     * Get all entities at a specific grid position
     */
    getEntitiesAt(row, col) {
        if (!this.isValidPosition(row, col)) {
            return [];
        }

        return this.grid[row][col].entities.map(id => this.entities.get(id));
    }

    /**
     * Get entity by ID
     */
    getEntity(entityId) {
        return this.entities.get(entityId);
    }

    /**
     * Check if position is valid
     */
    isValidPosition(row, col) {
        return row >= 0 && row < this.gridRows && col >= 0 && col < this.gridCols;
    }

    /**
     * Set a code variable
     */
    setVariable(name, value, type = 'auto', boundTo = null) {
        this.variables.set(name, {
            type: type === 'auto' ? typeof value : type,
            value,
            boundTo
        });
    }

    /**
     * Get a code variable
     */
    getVariable(name) {
        return this.variables.get(name);
    }

    /**
     * Get variable value
     */
    getVariableValue(name) {
        const variable = this.variables.get(name);
        return variable ? variable.value : undefined;
    }

    /**
     * Bind a variable to an entity
     */
    bindVariable(varName, entityId) {
        const variable = this.variables.get(varName);
        const entity = this.entities.get(entityId);

        if (!variable) {
            throw new Error(`Variable ${varName} not found`);
        }

        if (!entity) {
            throw new Error(`Entity ${entityId} not found`);
        }

        variable.boundTo = entityId;
    }

    /**
     * Add item to tray
     */
    addToTray(itemType, metadata = {}) {
        if (this.tray.available.length >= this.tray.slots) {
            return false;
        }

        this.tray.available.push({
            type: itemType,
            metadata,
            addedAt: Date.now()
        });

        return true;
    }

    /**
     * Remove item from tray
     */
    removeFromTray(index) {
        if (index < 0 || index >= this.tray.available.length) {
            return null;
        }

        return this.tray.available.splice(index, 1)[0];
    }

    /**
     * Set cooldown for item type
     */
    setCooldown(itemType, duration) {
        this.tray.cooldowns.set(itemType, Date.now() + duration);
    }

    /**
     * Check if item type is on cooldown
     */
    isOnCooldown(itemType) {
        const cooldownEnd = this.tray.cooldowns.get(itemType);
        if (!cooldownEnd) {
            return false;
        }

        if (Date.now() >= cooldownEnd) {
            this.tray.cooldowns.delete(itemType);
            return false;
        }

        return true;
    }

    /**
     * Create a snapshot of current state for comparison/rollback
     */
    snapshot() {
        return {
            grid: JSON.parse(JSON.stringify(this.grid)),
            entities: new Map(
                Array.from(this.entities.entries()).map(([id, entity]) => [
                    id,
                    JSON.parse(JSON.stringify(entity))
                ])
            ),
            variables: new Map(
                Array.from(this.variables.entries()).map(([name, variable]) => [
                    name,
                    JSON.parse(JSON.stringify(variable))
                ])
            ),
            tray: JSON.parse(JSON.stringify(this.tray))
        };
    }

    /**
     * Restore state from snapshot
     */
    restore(snapshot) {
        this.grid = JSON.parse(JSON.stringify(snapshot.grid));
        this.entities = new Map(
            Array.from(snapshot.entities.entries()).map(([id, entity]) => [
                id,
                JSON.parse(JSON.stringify(entity))
            ])
        );
        this.variables = new Map(
            Array.from(snapshot.variables.entries()).map(([name, variable]) => [
                name,
                JSON.parse(JSON.stringify(variable))
            ])
        );
        this.tray = JSON.parse(JSON.stringify(snapshot.tray));
    }

    /**
     * Record an action in history
     */
    recordAction(action) {
        // Remove any actions after current index (undo/redo support)
        this.actionHistory = this.actionHistory.slice(0, this.actionIndex);

        this.actionHistory.push({
            ...action,
            timestamp: Date.now(),
            stateBefore: this.snapshot()
        });

        this.actionIndex++;
    }

    /**
     * Undo last action
     */
    undo() {
        if (this.actionIndex <= 0) {
            return false;
        }

        this.actionIndex--;
        const action = this.actionHistory[this.actionIndex];
        this.restore(action.stateBefore);

        return true;
    }

    /**
     * Redo action
     */
    redo() {
        if (this.actionIndex >= this.actionHistory.length) {
            return false;
        }

        // Execute the action again (would need ActionResolver integration)
        this.actionIndex++;
        return true;
    }

    /**
     * Get current state summary for debugging
     */
    getSummary() {
        return {
            grid: `${this.gridRows}x${this.gridCols}`,
            entityCount: this.entities.size,
            variableCount: this.variables.size,
            trayItems: this.tray.available.length,
            actionHistorySize: this.actionHistory.length
        };
    }
}
