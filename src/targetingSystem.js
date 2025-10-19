import * as THREE from 'three';
import Projectile from './projectile.js';

/**
 * TargetingSystem - Manages tile targeting for catapult aiming
 * Shows visual indicator on target tile and allows WASD navigation
 */
class TargetingSystem {
    constructor(scene, gridData, selectionManager) {
        this.scene = scene;
        this.gridData = gridData; // { GRID, ROWS, COLS, gridToWorld function }
        this.selectionManager = selectionManager;

        this.isTargetingMode = false;
        this.targetRow = 2; // Start in center
        this.targetCol = 2;

        this.targetIndicator = null;
        this.TARGET_COLOR = 0xff0000; // Red indicator
        this.TARGET_OPACITY = 0.5;

        // Projectile management
        this.activeProjectiles = [];
        this.currentTrajectoryPreview = null;

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

            // Only handle WASD and Enter when in targeting mode
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
            } else if (event.key === 'Enter') {
                // Fire projectile on Enter
                this.fireProjectile();
                return;
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
            console.log('Targeting mode ON - Use WASD to move target, Enter to fire, Spacebar to exit');
        } else {
            console.log('Targeting mode OFF');
            // Hide trajectory preview when exiting targeting mode
            if (this.currentTrajectoryPreview) {
                this.currentTrajectoryPreview.dispose();
                this.currentTrajectoryPreview = null;
            }
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
        
        // Update trajectory preview
        this.updateTrajectoryPreview();
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

        const catapultObject = selected.object;

        // Get target world position
        const targetWorldPos = this.gridData.GRID[this.targetRow][this.targetCol].mesh;
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
        
        // Make catapult look at target
        catapultObject.rotation.y = angle - Math.PI / 2;

        console.log(`Catapult aiming at target tile`);
    }

    /**
     * Update the trajectory preview line
     */
    updateTrajectoryPreview() {
        // Remove old preview
        if (this.currentTrajectoryPreview) {
            this.currentTrajectoryPreview.dispose();
            this.currentTrajectoryPreview = null;
        }

        const selected = this.selectionManager.getSelectedObject();
        if (!selected || selected.userData.type !== 'catapult') {
            return;
        }

        // Get catapult and target positions
        const catapultObject = selected.object;
        const startPos = new THREE.Vector3();
        catapultObject.updateMatrixWorld(true);
        catapultObject.getWorldPosition(startPos);
        
        // Adjust launch position to be higher (from catapult arm)
        startPos.y += 1.0;

        const targetTile = this.gridData.GRID[this.targetRow][this.targetCol].mesh;
        const targetPos = new THREE.Vector3();
        targetTile.updateMatrixWorld(true);
        targetTile.getWorldPosition(targetPos);
        
        // Target the top of the tile
        targetPos.y += 0.5;

        // Create trajectory preview (without launching)
        this.currentTrajectoryPreview = new Projectile(this.scene, startPos, targetPos, {
            launchAngle: 45,
            gravity: 9.8
        });
        
        // Show the trajectory line
        this.currentTrajectoryPreview.showTrajectoryLine();
    }

    /**
     * Fire a projectile from the catapult to the target
     */
    fireProjectile() {
        const selected = this.selectionManager.getSelectedObject();
        if (!selected || selected.userData.type !== 'catapult') {
            console.log('No catapult selected');
            return;
        }

        // Get catapult position
        const catapultObject = selected.object;
        const startPos = new THREE.Vector3();
        catapultObject.updateMatrixWorld(true);
        catapultObject.getWorldPosition(startPos);
        
        // Adjust launch position to be higher (from catapult arm)
        startPos.y += 1.0;

        // Get target position
        const targetTile = this.gridData.GRID[this.targetRow][this.targetCol].mesh;
        const targetPos = new THREE.Vector3();
        targetTile.updateMatrixWorld(true);
        targetTile.getWorldPosition(targetPos);
        
        // Target the top of the tile
        targetPos.y += 0.5;

        // Create and launch projectile
        const projectile = new Projectile(this.scene, startPos, targetPos, {
            launchAngle: 45,
            gravity: 9.8
        });
        
        projectile.launch();
        this.activeProjectiles.push(projectile);

        console.log(`Fired projectile from catapult at (${startPos.x.toFixed(2)}, ${startPos.y.toFixed(2)}, ${startPos.z.toFixed(2)}) to target at (${targetPos.x.toFixed(2)}, ${targetPos.y.toFixed(2)}, ${targetPos.z.toFixed(2)})`);
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
    update(deltaTime) {
        // Optional: Add pulsing animation to indicator
        if (this.targetIndicator.visible) {
            const time = Date.now() * 0.001;
            this.targetIndicator.material.opacity = this.TARGET_OPACITY + Math.sin(time * 3) * 0.2;
        }

        // Update all active projectiles
        for (let i = this.activeProjectiles.length - 1; i >= 0; i--) {
            const projectile = this.activeProjectiles[i];
            projectile.update(deltaTime);
            
            // Remove inactive projectiles
            if (!projectile.isActive()) {
                // Keep the projectile mesh visible after landing for now
                // Could add cleanup timer here if desired
                this.activeProjectiles.splice(i, 1);
            }
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

        if (this.currentTrajectoryPreview) {
            this.currentTrajectoryPreview.dispose();
            this.currentTrajectoryPreview = null;
        }

        // Clean up all active projectiles
        for (const projectile of this.activeProjectiles) {
            projectile.dispose();
        }
        this.activeProjectiles = [];
    }
}

export default TargetingSystem;
