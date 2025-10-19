/**
 * CodeLineTracker - Manages progression through code lines
 * Tracks current/next line, exposes highlighting info, resolves success/failure
 */
export default class CodeLineTracker {
    constructor(codeLines = []) {
        // Array of code line objects
        // Each line: { lineNumber, code, operation, operands, expectedState, hint, metadata }
        this.codeLines = codeLines;

        // Current line index
        this.currentIndex = 0;

        // Execution state
        this.state = 'ready'; // 'ready', 'waiting', 'success', 'error'

        // Checkpoint system for save/restore
        this.checkpoints = [];

        // Statistics
        this.stats = {
            attempts: 0,
            successes: 0,
            failures: 0,
            hintsUsed: 0,
            startTime: null,
            completionTime: null
        };
    }

    /**
     * Get current code line
     */
    getCurrentLine() {
        if (this.currentIndex >= this.codeLines.length) {
            return null;
        }
        return this.codeLines[this.currentIndex];
    }

    /**
     * Get next code line (for preview)
     */
    getNextLine() {
        const nextIndex = this.currentIndex + 1;
        if (nextIndex >= this.codeLines.length) {
            return null;
        }
        return this.codeLines[nextIndex];
    }

    /**
     * Get line by index
     */
    getLine(index) {
        if (index < 0 || index >= this.codeLines.length) {
            return null;
        }
        return this.codeLines[index];
    }

    /**
     * Get all code lines
     */
    getAllLines() {
        return [...this.codeLines];
    }

    /**
     * Get highlighting info for UI
     */
    getHighlightInfo() {
        return {
            currentLine: this.currentIndex,
            totalLines: this.codeLines.length,
            state: this.state,
            line: this.getCurrentLine()
        };
    }

    /**
     * Advance to next line
     */
    advance() {
        if (this.currentIndex < this.codeLines.length - 1) {
            this.currentIndex++;
            this.state = 'ready';
            this.stats.successes++;
            return true;
        }

        // Level completed
        this.state = 'success';
        this.stats.completionTime = Date.now();
        return false;
    }

    /**
     * Mark current line as waiting for action
     */
    setWaiting() {
        this.state = 'waiting';
        this.stats.attempts++;
    }

    /**
     * Mark current line as error
     */
    setError() {
        this.state = 'error';
        this.stats.failures++;
    }

    /**
     * Mark current line as success (before advancing)
     */
    setSuccess() {
        this.state = 'success';
    }

    /**
     * Reset to ready state
     */
    resetState() {
        this.state = 'ready';
    }

    /**
     * Check if level is complete
     */
    isComplete() {
        return this.currentIndex >= this.codeLines.length - 1 && this.state === 'success';
    }

    /**
     * Check if this is the first line
     */
    isFirstLine() {
        return this.currentIndex === 0;
    }

    /**
     * Check if this is the last line
     */
    isLastLine() {
        return this.currentIndex === this.codeLines.length - 1;
    }

    /**
     * Get progress percentage
     */
    getProgress() {
        if (this.codeLines.length === 0) {
            return 0;
        }
        return (this.currentIndex / this.codeLines.length) * 100;
    }

    /**
     * Create checkpoint at current position
     */
    createCheckpoint(name = null) {
        this.checkpoints.push({
            name: name ?? `checkpoint-${this.checkpoints.length}`,
            index: this.currentIndex,
            state: this.state,
            timestamp: Date.now(),
            stats: { ...this.stats }
        });

        return this.checkpoints.length - 1;
    }

    /**
     * Restore from checkpoint
     */
    restoreCheckpoint(checkpointIndex) {
        if (checkpointIndex < 0 || checkpointIndex >= this.checkpoints.length) {
            return false;
        }

        const checkpoint = this.checkpoints[checkpointIndex];
        this.currentIndex = checkpoint.index;
        this.state = checkpoint.state;
        this.stats = { ...checkpoint.stats };

        return true;
    }

    /**
     * Get checkpoint by name
     */
    getCheckpointByName(name) {
        return this.checkpoints.find(cp => cp.name === name);
    }

    /**
     * Reset to beginning
     */
    reset() {
        this.currentIndex = 0;
        this.state = 'ready';
        this.stats = {
            attempts: 0,
            successes: 0,
            failures: 0,
            hintsUsed: 0,
            startTime: Date.now(),
            completionTime: null
        };
    }

    /**
     * Start timer
     */
    start() {
        if (!this.stats.startTime) {
            this.stats.startTime = Date.now();
        }
        this.state = 'ready';
    }

    /**
     * Record hint usage
     */
    recordHintUsed() {
        this.stats.hintsUsed++;
    }

    /**
     * Get statistics
     */
    getStats() {
        const stats = { ...this.stats };

        if (stats.startTime && stats.completionTime) {
            stats.duration = stats.completionTime - stats.startTime;
        } else if (stats.startTime) {
            stats.currentDuration = Date.now() - stats.startTime;
        }

        return stats;
    }

    /**
     * Get completion summary
     */
    getSummary() {
        return {
            progress: this.getProgress(),
            currentLine: this.currentIndex + 1,
            totalLines: this.codeLines.length,
            state: this.state,
            isComplete: this.isComplete(),
            stats: this.getStats()
        };
    }

    /**
     * Validate expected state against actual state
     * Returns { success: boolean, mismatches: [] }
     */
    validateState(actualState, expectedState) {
        const mismatches = [];

        // Check variables
        if (expectedState.variables) {
            for (const [varName, expectedValue] of Object.entries(expectedState.variables)) {
                const actualValue = actualState.variables?.[varName];

                if (actualValue !== expectedValue) {
                    mismatches.push({
                        type: 'variable',
                        name: varName,
                        expected: expectedValue,
                        actual: actualValue
                    });
                }
            }
        }

        // Check entity positions
        if (expectedState.entities) {
            for (const [entityId, expectedPos] of Object.entries(expectedState.entities)) {
                const actualPos = actualState.entities?.[entityId];

                if (!actualPos ||
                    actualPos.row !== expectedPos.row ||
                    actualPos.col !== expectedPos.col) {
                    mismatches.push({
                        type: 'entity_position',
                        entityId,
                        expected: expectedPos,
                        actual: actualPos
                    });
                }
            }
        }

        // Check grid state
        if (expectedState.grid) {
            for (const [position, expectedContent] of Object.entries(expectedState.grid)) {
                const [row, col] = position.split(',').map(Number);
                const actualContent = actualState.grid?.[row]?.[col];

                if (JSON.stringify(actualContent) !== JSON.stringify(expectedContent)) {
                    mismatches.push({
                        type: 'grid_content',
                        position: { row, col },
                        expected: expectedContent,
                        actual: actualContent
                    });
                }
            }
        }

        return {
            success: mismatches.length === 0,
            mismatches
        };
    }
}
