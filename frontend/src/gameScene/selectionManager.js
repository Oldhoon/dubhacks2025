import * as THREE from 'three';

/**
 * SelectionManager - Manages selection and highlighting of game objects
 * Highlights the tile that the selected object is placed on
 */
class SelectionManager {
    constructor(scene) {
        this.scene = scene;
        this.selectableObjects = []; // Array of objects that can be selected
        this.currentIndex = -1; // Currently selected object index
        this.currentHighlightedTile = null;
        this.originalTileMaterial = null;

        this.HIGHLIGHT_COLOR = 0x00ff00; // Green highlight
        this.HIGHLIGHT_EMISSIVE = 0x00ff00;
        this.HIGHLIGHT_EMISSIVE_INTENSITY = 0.3;

        this.handleKeyDown = this.onKeyDown.bind(this);
        this.setupKeyboardControls();
    }

    /**
     * Setup keyboard controls for cycling through objects
     */
    setupKeyboardControls() {
        window.addEventListener('keydown', this.handleKeyDown);
    }

    onKeyDown(event) {
        if (event.key === 'e' || event.key === 'E') {
            this.selectNext();
        } else if (event.key === 'q' || event.key === 'Q') {
            this.selectPrevious();
        } else if (event.key === 'Escape') {
            this.deselect();
        }
    }

    /**
     * Register an object as selectable
     * @param {THREE.Object3D} object - The 3D object to select
     * @param {Object} userData - Additional data (should include 'tile' reference)
     */
    addSelectableObject(object, userData = {}) {
        this.selectableObjects.push({
            object: object,
            userData: userData,
            tile: userData.tile // Reference to the tile mesh this object is on
        });
    }

    /**
     * Remove an object from selectable list
     */
    removeSelectableObject(object) {
        const index = this.selectableObjects.findIndex(item => item.object === object);
        if (index !== -1) {
            if (this.currentIndex === index) {
                this.deselect();
            }
            this.selectableObjects.splice(index, 1);
            if (this.currentIndex > index) {
                this.currentIndex--;
            }
        }
    }

    /**
     * Select the next object in the list
     */
    selectNext() {
        if (this.selectableObjects.length === 0) return;

        this.currentIndex = (this.currentIndex + 1) % this.selectableObjects.length;
        this.updateHighlight();
    }

    /**
     * Select the previous object in the list
     */
    selectPrevious() {
        if (this.selectableObjects.length === 0) return;

        this.currentIndex--;
        if (this.currentIndex < 0) {
            this.currentIndex = this.selectableObjects.length - 1;
        }
        this.updateHighlight();
    }

    /**
     * Select a specific object by index
     */
    selectByIndex(index) {
        if (index >= 0 && index < this.selectableObjects.length) {
            this.currentIndex = index;
            this.updateHighlight();
        }
    }

    /**
     * Deselect current object and restore tile appearance
     */
    deselect() {
        // Restore original tile appearance
        if (this.currentHighlightedTile && this.originalTileMaterial) {
            this.currentHighlightedTile.material = this.originalTileMaterial;
            this.currentHighlightedTile = null;
            this.originalTileMaterial = null;
        }

        this.currentIndex = -1;
    }

    /**
     * Update highlight - change tile appearance
     */
    updateHighlight() {
        // First, restore previous tile if any
        if (this.currentHighlightedTile && this.originalTileMaterial) {
            this.currentHighlightedTile.material = this.originalTileMaterial;
            this.currentHighlightedTile = null;
            this.originalTileMaterial = null;
        }

        if (this.currentIndex === -1 || this.selectableObjects.length === 0) {
            return;
        }

        const selected = this.selectableObjects[this.currentIndex];
        const tile = selected.tile;

        if (!tile) {
            console.warn('Selected object has no associated tile');
            return;
        }

        // Store original material
        this.originalTileMaterial = tile.material;
        this.currentHighlightedTile = tile;

        // Handle both single material and material array
        if (Array.isArray(this.originalTileMaterial)) {
            // Multi-material mesh - clone each material
            const highlightMaterials = this.originalTileMaterial.map(mat => {
                const cloned = mat.clone();
                cloned.emissive = new THREE.Color(this.HIGHLIGHT_EMISSIVE);
                cloned.emissiveIntensity = this.HIGHLIGHT_EMISSIVE_INTENSITY;
                return cloned;
            });
            tile.material = highlightMaterials;
        } else {
            // Single material
            const highlightMaterial = this.originalTileMaterial.clone();
            highlightMaterial.emissive = new THREE.Color(this.HIGHLIGHT_EMISSIVE);
            highlightMaterial.emissiveIntensity = this.HIGHLIGHT_EMISSIVE_INTENSITY;
            tile.material = highlightMaterial;
        }

        console.log(`Selected object ${this.currentIndex + 1}/${this.selectableObjects.length}`, selected.userData);
    }

    /**
     * Get the currently selected object
     */
    getSelectedObject() {
        if (this.currentIndex === -1 || this.selectableObjects.length === 0) {
            return null;
        }
        return this.selectableObjects[this.currentIndex];
    }

    /**
     * Update animation - no longer needed for tile highlighting
     * Kept for compatibility
     */
    update() {
        // No animation needed for tile highlighting
    }

    /**
     * Cleanup resources
     */
    dispose() {
        // Restore tile material if any is highlighted
        this.deselect();

        if (this.handleKeyDown) {
            window.removeEventListener('keydown', this.handleKeyDown);
        }
    }
}

export default SelectionManager;
