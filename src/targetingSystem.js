import * as THREE from 'three';

/**
 * TargetingSystem - Manages tile targeting for catapult aiming
 * Shows visual indicator on target tile and allows WASD navigation
 */
class TargetingSystem {
    constructor(scene, gridData) {
        this.scene = scene;
        this.gridData = gridData; // { GRID, ROWS, COLS, gridToWorld function }

        this.isTargetingMode = false;
        this.targetRow = 2; // Start in center
        this.targetCol = 2;

        this.targetIndicator = null;
        this.TARGET_COLOR = 0xff0000; // Red indicator
        this.TARGET_OPACITY = 0.5;

        this.createTargetIndicator();
        this.setupKeyboardControls();
    }

    /**
     * Create the visual indicator for the target tile
     */
    createTargetIndicator() {
        // Create a semi-transparent red plane that sits above the tile
        const indicatorGeometry = new THREE.PlaneGeometry(3, 3);
        const indicatorMaterial = new THREE.MeshBasicMaterial({
            color: this.TARGET_COLOR,
            transparent: true,
            opacity: this.TARGET_OPACITY,
            side: THREE.DoubleSide,
            depthTest: false,
            depthWrite: false
        });

        this.targetIndicator = new THREE.Mesh(indicatorGeometry, indicatorMaterial);
        this.targetIndicator.rotation.x = -Math.PI / 2; // Lay flat
        this.targetIndicator.position.y = 0.6; // Slightly above tiles
        this.targetIndicator.visible = false;
        this.targetIndicator.renderOrder = 1000; // Render on top

        this.scene.add(this.targetIndicator);
    }

    /**
     * Setup keyboard controls for targeting
     */
    setupKeyboardControls() {
        window.addEventListener('keydown', (event) => {
            // Spacebar - Toggle targeting mode
            if (event.key === ' ') {
                event.preventDefault(); // Prevent page scroll
                this.toggleTargetingMode();
                return;
            }

            // Only handle WASD when in targeting mode
            if (!this.isTargetingMode) return;

            let moved = false;

            // WASD to move target
            if (event.key === 'w' || event.key === 'W') {
                if (this.targetRow > 0) {
                    this.targetRow--;
                    moved = true;
                }
            } else if (event.key === 's' || event.key === 'S') {
                if (this.targetRow < this.gridData.ROWS - 1) {
                    this.targetRow++;
                    moved = true;
                }
            } else if (event.key === 'a' || event.key === 'A') {
                if (this.targetCol > 0) {
                    this.targetCol--;
                    moved = true;
                }
            } else if (event.key === 'd' || event.key === 'D') {
                if (this.targetCol < this.gridData.COLS - 1) {
                    this.targetCol++;
                    moved = true;
                }
            }

            if (moved) {
                this.updateTargetPosition();
            }
        });
    }

    /**
     * Toggle targeting mode on/off
     */
    toggleTargetingMode() {
        this.isTargetingMode = !this.isTargetingMode;
        this.targetIndicator.visible = this.isTargetingMode;

        if (this.isTargetingMode) {
            this.updateTargetPosition();
            console.log('Targeting mode ON - Use WASD to move target, Spacebar to exit');
        } else {
            console.log('Targeting mode OFF');
        }
    }

    /**
     * Update the visual indicator position based on target row/col
     */
    updateTargetPosition() {
        const worldPos = this.gridData.gridToWorld(this.targetCol, this.targetRow);
        this.targetIndicator.position.x = worldPos.x;
        this.targetIndicator.position.z = worldPos.z;

        console.log(`Target: Row ${this.targetRow}, Col ${this.targetCol}`);
    }

    /**
     * Get the currently targeted tile coordinates
     */
    getTargetTile() {
        return {
            row: this.targetRow,
            col: this.targetCol,
            tile: this.gridData.GRID[this.targetRow][this.targetCol]
        };
    }

    /**
     * Get targeting mode state
     */
    isInTargetingMode() {
        return this.isTargetingMode;
    }

    /**
     * Update animation (for pulsing effect if desired)
     */
    update() {
        // Optional: Add pulsing animation to indicator
        if (this.targetIndicator.visible) {
            const time = Date.now() * 0.001;
            this.targetIndicator.material.opacity = this.TARGET_OPACITY + Math.sin(time * 3) * 0.2;
        }
    }

    /**
     * Cleanup resources
     */
    dispose() {
        if (this.targetIndicator) {
            this.targetIndicator.geometry.dispose();
            this.targetIndicator.material.dispose();
            this.scene.remove(this.targetIndicator);
        }
    }
}

export default TargetingSystem;
