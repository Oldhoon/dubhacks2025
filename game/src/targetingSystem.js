import * as THREE from 'three';

/**
 * TargetingSystem - Manages tile targeting for catapult aiming
 * Shows visual indicator on target tile and allows WASD navigation
 */
class TargetingSystem {
    constructor(scene, gridData, selectionManager) {
        this.scene = scene;
        this.gridData = gridData; // { GRID, ROWS, COLS, gridToWorld function }
        this.selectionManager = selectionManager;
        this.selectionManager = selectionManager;

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

            if (event.key === '1' || event.key === '2' || event.key === '3') {
                if (!this.isTargetingMode) return;
                event.preventDefault();
                this.handleSpawnKey(event.key);
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
        // Only allow targeting mode if a catapult is selected
        const selected = this.selectionManager.getSelectedObject();
        if (!selected || selected.userData.type !== 'catapult') {
            console.log('Please select a catapult first to use targeting mode');
            return;
        }

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

        // Rotate selected catapult to face the target
        this.aimCatapultAtTarget();
    }

    /**
     * Rotate the selected catapult to look at the target tile
     */
    aimCatapultAtTarget() {
        const selected = this.selectionManager.getSelectedObject();

        // Only aim if a catapult is selected
        if (!selected || selected.userData.type !== 'catapult') {
            return;
        }


        // test
        const catapultObject = selected.object;

        // Get target world position
        const targetWorldPos = this.gridData.GRID[this.targetRow][this.targetCol].mesh;
        console.log('Target World Position:', targetWorldPos);
        let targetPosition = new THREE.Vector3();
        let catapultPos = new THREE.Vector3();
        catapultObject.updateMatrixWorld(true);
        catapultObject.getWorldPosition(catapultPos);
        targetWorldPos.updateMatrixWorld(true);
        targetWorldPos.getWorldPosition(targetPosition);
        const catXZ = new THREE.Vector2(catapultPos.x, catapultPos.z);
        const tarXZ = new THREE.Vector2(targetPosition.x, targetPosition.z);
        const rotVec = tarXZ.clone().sub(catXZ);
        let angle = Math.atan2(rotVec.x, rotVec.y);
        console.log('Target Position Vector3:', targetPosition);
        // Make catapult look at target
        catapultObject.rotation.y = angle - Math.PI / 2;
        console.log(targetPosition);
        console.log(targetPosition);
        console.log(catapultPos);
        console.log(rotVec);

        // add rotation offset to correct aim 
        // catapultObject.rotation.y -= Math.PI /2;

        console.log(`Catapult aiming at target tile`);
    }

    handleSpawnKey(key) {
        const targetInfo = this.getTargetTile();
        const terrain = targetInfo?.tile;
        if (!terrain) {
            console.warn('No terrain tile available for placement.');
            return;
        }

        let actionResult = null;
        if (key === '1' && typeof terrain.addPotion === 'function') {
            actionResult = terrain.addPotion();
        } else if (key === '2' && typeof terrain.addTree === 'function') {
            actionResult = terrain.addTree();
        } else if (key === '3' && typeof terrain.addGhoul === 'function') {
            actionResult = terrain.addGhoul();
        } else {
            console.warn(`No placement handler for key "${key}".`);
            return;
        }

        if (actionResult && typeof actionResult.then === 'function') {
            actionResult.catch((error) => {
                console.error('Failed to place asset on terrain:', error);
            });
        }
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
