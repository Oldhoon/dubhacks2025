/**
 * ActionResolver - Maps player actions to code semantics
 * Validates actions against current code line, emits state diffs
 */
export default class ActionResolver {
    constructor(worldState, codeLineTracker) {
        this.worldState = worldState;
        this.codeLineTracker = codeLineTracker;

        // Action handlers registry
        this.actionHandlers = new Map();

        // Register default handlers
        this.registerDefaultHandlers();
    }

    /**
     * Register default action handlers
     */
    registerDefaultHandlers() {
        // Assignment: place entity at position
        this.registerHandler('assign', this.handleAssignment.bind(this));

        // Swap: exchange two entities
        this.registerHandler('swap', this.handleSwap.bind(this));

        // Move: relocate entity
        this.registerHandler('move', this.handleMove.bind(this));

        // Dereference: pointer operation
        this.registerHandler('deref', this.handleDereference.bind(this));

        // Place: add entity from tray
        this.registerHandler('place', this.handlePlace.bind(this));

        // Remove: delete entity
        this.registerHandler('remove', this.handleRemove.bind(this));

        // Increment/Decrement
        this.registerHandler('increment', this.handleIncrement.bind(this));
        this.registerHandler('decrement', this.handleDecrement.bind(this));
    }

    /**
     * Register custom action handler
     */
    registerHandler(actionType, handler) {
        this.actionHandlers.set(actionType, handler);
    }

    /**
     * Resolve an action
     * Returns: { success: boolean, stateDiff: {}, message: string, feedback: {} }
     */
    async resolveAction(action) {
        const currentLine = this.codeLineTracker.getCurrentLine();

        if (!currentLine) {
            return {
                success: false,
                message: 'No current code line',
                feedback: { type: 'error', text: 'Level complete or not started' }
            };
        }

        // Create snapshot before attempting action
        const stateBefore = this.worldState.snapshot();

        try {
            // Mark as waiting
            this.codeLineTracker.setWaiting();

            // Get handler for this action type
            const handler = this.actionHandlers.get(action.verb);

            if (!handler) {
                throw new Error(`No handler registered for action: ${action.verb}`);
            }

            // Execute action handler
            const result = await handler(action, currentLine);

            if (!result.success) {
                // Roll back on failure
                this.worldState.restore(stateBefore);
                this.codeLineTracker.setError();

                return {
                    success: false,
                    message: result.message || 'Action failed validation',
                    feedback: result.feedback || {
                        type: 'error',
                        text: 'That action doesn\'t match the current code line'
                    }
                };
            }

            // Validate against expected state
            const validation = this.validateAgainstExpected(currentLine);

            if (!validation.success) {
                // Roll back if state doesn't match expectations
                this.worldState.restore(stateBefore);
                this.codeLineTracker.setError();

                return {
                    success: false,
                    message: 'State validation failed',
                    mismatches: validation.mismatches,
                    feedback: {
                        type: 'mismatch',
                        text: this.generateMismatchFeedback(validation.mismatches),
                        mismatches: validation.mismatches
                    }
                };
            }

            // Success! Record action and advance
            this.worldState.recordAction({
                ...action,
                lineIndex: this.codeLineTracker.currentIndex,
                line: currentLine
            });

            this.codeLineTracker.setSuccess();

            // Check if we should auto-advance
            const shouldAdvance = currentLine.metadata?.autoAdvance !== false;
            const isComplete = !this.codeLineTracker.advance();

            return {
                success: true,
                message: result.message || 'Action successful',
                stateDiff: this.computeStateDiff(stateBefore, this.worldState.snapshot()),
                feedback: {
                    type: 'success',
                    text: result.message || 'Correct! Advancing to next line.',
                    advanced: shouldAdvance,
                    levelComplete: isComplete
                }
            };

        } catch (error) {
            // Roll back on error
            this.worldState.restore(stateBefore);
            this.codeLineTracker.setError();

            return {
                success: false,
                message: error.message,
                feedback: {
                    type: 'error',
                    text: `Error: ${error.message}`
                }
            };
        }
    }

    /**
     * Handle assignment operation
     * Example: x = 5; (place entity with value 5 at position bound to x)
     */
    async handleAssignment(action, codeLine) {
        const { operands } = codeLine;
        const { entityId, target } = action.params;

        // Validate operands
        if (!operands || !operands.variable) {
            return {
                success: false,
                message: 'Assignment requires variable operand'
            };
        }

        // Get or create entity
        let entity = this.worldState.getEntity(entityId);

        if (!entity && action.params.createIfMissing) {
            entity = this.worldState.addEntity({
                id: entityId,
                type: action.params.entityType || 'default',
                position: target
            });
        }

        if (!entity) {
            return {
                success: false,
                message: 'Entity not found'
            };
        }

        // Place entity at target position
        if (target) {
            this.worldState.placeEntityOnGrid(entityId, target);
        }

        // Set variable value
        if (operands.value !== undefined) {
            this.worldState.setVariable(operands.variable, operands.value);
            this.worldState.bindVariable(operands.variable, entityId);
        }

        return {
            success: true,
            message: `Assigned ${operands.variable} = ${operands.value}`
        };
    }

    /**
     * Handle swap operation
     * Example: swap(a, b);
     */
    async handleSwap(action, codeLine) {
        const { operands } = codeLine;
        const { entityId1, entityId2 } = action.params;

        if (!operands || operands.length < 2) {
            return {
                success: false,
                message: 'Swap requires two operands'
            };
        }

        // Perform swap
        this.worldState.swapEntities(entityId1, entityId2);

        // Update variable bindings
        const var1 = operands[0];
        const var2 = operands[1];

        const val1 = this.worldState.getVariableValue(var1);
        const val2 = this.worldState.getVariableValue(var2);

        this.worldState.setVariable(var1, val2);
        this.worldState.setVariable(var2, val1);

        return {
            success: true,
            message: `Swapped ${var1} and ${var2}`
        };
    }

    /**
     * Handle move operation
     */
    async handleMove(action, codeLine) {
        const { entityId, target } = action.params;

        this.worldState.moveEntity(entityId, target);

        return {
            success: true,
            message: `Moved entity to (${target.row}, ${target.col})`
        };
    }

    /**
     * Handle dereference operation
     * Example: *ptr = value;
     */
    async handleDereference(action, codeLine) {
        const { operands } = codeLine;
        const { entityId, value } = action.params;

        if (!operands || !operands.pointer) {
            return {
                success: false,
                message: 'Dereference requires pointer operand'
            };
        }

        // Get pointer variable
        const pointerVar = this.worldState.getVariable(operands.pointer);

        if (!pointerVar || !pointerVar.boundTo) {
            return {
                success: false,
                message: 'Pointer not bound to entity'
            };
        }

        // Update the entity that pointer points to
        const targetEntity = this.worldState.getEntity(pointerVar.boundTo);

        if (!targetEntity) {
            return {
                success: false,
                message: 'Target entity not found'
            };
        }

        // Set value in entity's variables
        if (value !== undefined) {
            targetEntity.variables.value = value;
        }

        return {
            success: true,
            message: `Dereferenced ${operands.pointer} and set value`
        };
    }

    /**
     * Handle place operation (from tray)
     */
    async handlePlace(action, codeLine) {
        const { itemType, target, trayIndex } = action.params;

        // Remove from tray
        const item = this.worldState.removeFromTray(trayIndex);

        if (!item || item.type !== itemType) {
            return {
                success: false,
                message: 'Item not available in tray'
            };
        }

        // Create entity and place
        const entityId = `${itemType}-${Date.now()}`;
        this.worldState.addEntity({
            id: entityId,
            type: itemType,
            position: target,
            metadata: item.metadata
        });

        return {
            success: true,
            message: `Placed ${itemType} at (${target.row}, ${target.col})`
        };
    }

    /**
     * Handle remove operation
     */
    async handleRemove(action, codeLine) {
        const { entityId } = action.params;

        const success = this.worldState.removeEntity(entityId);

        return {
            success,
            message: success ? 'Entity removed' : 'Entity not found'
        };
    }

    /**
     * Handle increment operation
     */
    async handleIncrement(action, codeLine) {
        const { operands } = codeLine;

        if (!operands || !operands.variable) {
            return {
                success: false,
                message: 'Increment requires variable'
            };
        }

        const currentValue = this.worldState.getVariableValue(operands.variable);

        if (typeof currentValue !== 'number') {
            return {
                success: false,
                message: 'Variable must be numeric'
            };
        }

        this.worldState.setVariable(operands.variable, currentValue + 1);

        return {
            success: true,
            message: `Incremented ${operands.variable} to ${currentValue + 1}`
        };
    }

    /**
     * Handle decrement operation
     */
    async handleDecrement(action, codeLine) {
        const { operands } = codeLine;

        if (!operands || !operands.variable) {
            return {
                success: false,
                message: 'Decrement requires variable'
            };
        }

        const currentValue = this.worldState.getVariableValue(operands.variable);

        if (typeof currentValue !== 'number') {
            return {
                success: false,
                message: 'Variable must be numeric'
            };
        }

        this.worldState.setVariable(operands.variable, currentValue - 1);

        return {
            success: true,
            message: `Decremented ${operands.variable} to ${currentValue - 1}`
        };
    }

    /**
     * Validate current state against expected state
     */
    validateAgainstExpected(codeLine) {
        if (!codeLine.expectedState) {
            // No validation required
            return { success: true, mismatches: [] };
        }

        const actualState = this.extractRelevantState();
        return this.codeLineTracker.validateState(actualState, codeLine.expectedState);
    }

    /**
     * Extract relevant state for validation
     */
    extractRelevantState() {
        const state = {
            variables: {},
            entities: {},
            grid: {}
        };

        // Extract variables
        for (const [name, variable] of this.worldState.variables.entries()) {
            state.variables[name] = variable.value;
        }

        // Extract entity positions
        for (const [id, entity] of this.worldState.entities.entries()) {
            if (entity.position) {
                state.entities[id] = entity.position;
            }
        }

        // Extract grid (sparse representation)
        for (let row = 0; row < this.worldState.gridRows; row++) {
            for (let col = 0; col < this.worldState.gridCols; col++) {
                const cell = this.worldState.grid[row][col];
                if (cell.entities.length > 0 || cell.terrain) {
                    state.grid[`${row},${col}`] = {
                        entities: [...cell.entities],
                        terrain: cell.terrain
                    };
                }
            }
        }

        return state;
    }

    /**
     * Compute state difference between two snapshots
     */
    computeStateDiff(before, after) {
        const diff = {
            variables: { changed: [], added: [], removed: [] },
            entities: { moved: [], added: [], removed: [] },
            grid: { changed: [] }
        };

        // Compare variables
        const beforeVars = before.variables;
        const afterVars = after.variables;

        for (const [name, afterVar] of afterVars.entries()) {
            const beforeVar = beforeVars.get(name);

            if (!beforeVar) {
                diff.variables.added.push({ name, value: afterVar.value });
            } else if (beforeVar.value !== afterVar.value) {
                diff.variables.changed.push({
                    name,
                    before: beforeVar.value,
                    after: afterVar.value
                });
            }
        }

        for (const [name] of beforeVars.entries()) {
            if (!afterVars.has(name)) {
                diff.variables.removed.push({ name });
            }
        }

        // Compare entities
        const beforeEntities = before.entities;
        const afterEntities = after.entities;

        for (const [id, afterEntity] of afterEntities.entries()) {
            const beforeEntity = beforeEntities.get(id);

            if (!beforeEntity) {
                diff.entities.added.push({ id, entity: afterEntity });
            } else if (
                beforeEntity.position?.row !== afterEntity.position?.row ||
                beforeEntity.position?.col !== afterEntity.position?.col
            ) {
                diff.entities.moved.push({
                    id,
                    from: beforeEntity.position,
                    to: afterEntity.position
                });
            }
        }

        for (const [id] of beforeEntities.entries()) {
            if (!afterEntities.has(id)) {
                diff.entities.removed.push({ id });
            }
        }

        return diff;
    }

    /**
     * Generate feedback message from mismatches
     */
    generateMismatchFeedback(mismatches) {
        if (mismatches.length === 0) {
            return 'Perfect!';
        }

        const firstMismatch = mismatches[0];

        switch (firstMismatch.type) {
            case 'variable':
                return `Variable ${firstMismatch.name} should be ${firstMismatch.expected}, but is ${firstMismatch.actual}`;

            case 'entity_position':
                return `Entity should be at (${firstMismatch.expected.row}, ${firstMismatch.expected.col})`;

            case 'grid_content':
                return `Grid cell at (${firstMismatch.position.row}, ${firstMismatch.position.col}) has incorrect content`;

            default:
                return 'State doesn\'t match expected result';
        }
    }
}
