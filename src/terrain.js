import * as THREE from 'three';

const TERRAIN_SIZE = 5; 
const TERRAIN_COLOR = 0x228B22; // Forest green
const TERRAIN_DEPTH = 1;
/**
 * Terrain class representing a simple square block
 */
export default class Terrain {
    constructor(size = TERRAIN_SIZE, color = TERRAIN_COLOR) {
        this.size = size;
        this.color = color;
        this.depth = TERRAIN_DEPTH
        this.mesh = this.createTerrain();
    }

    /**
     * Creates a simple square block terrain
     * @returns {THREE.Mesh} The terrain mesh
     */
    createTerrain() {
        // Create a box geometry for a simple square block
        const geometry = new THREE.BoxGeometry(this.size, this.depth, this.size);

        // Low-poly material with flat shading
        const material = new THREE.MeshLambertMaterial({
            color: this.color,
            flatShading: true
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.receiveShadow = true;
        mesh.castShadow = true;

        // Position the block so its top is at y = 0
        mesh.position.y = -0.25;

        return mesh;
    }

    /**
     * Adds the terrain to a scene
     * @param {THREE.Scene} scene - The Three.js scene
     */
    addToScene(scene) {
        scene.add(this.mesh);
    }

    /**
     * Removes the terrain from a scene
     * @param {THREE.Scene} scene - The Three.js scene
     */
    removeFromScene(scene) {
        scene.remove(this.mesh);
    }

    /**
     * Updates the terrain color
     * @param {number} color - The new color in hex format
     */
    setColor(color) {
        this.color = color;
        this.mesh.material.color.setHex(color);
    }
}
