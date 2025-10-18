import * as THREE from 'three';

const TERRAIN_SIZE = 3;
const TERRAIN_COLOR = 0x228B22; // Forest green
const TERRAIN_DEPTH = 1;

/**
 * Terrain class representing a single square of ground.
 * It can either generate its own primitive geometry or use a supplied mesh factory.
 */
export default class Terrain {
    constructor(options = {}) {
        if (typeof options === 'number') {
            options = { size: options };
        }

        const {
            size = TERRAIN_SIZE,
            color = TERRAIN_COLOR,
            depth = TERRAIN_DEPTH,
            meshFactory = null,
        } = options;

        this.size = size;
        this.color = color;
        this.depth = depth;
        this.meshFactory = meshFactory;
        this.mesh = this.createTerrain();
    }

    /**
     * Creates a simple square block terrain or delegates to the provided mesh factory.
     * @returns {THREE.Object3D} The terrain mesh or group.
     */
    createTerrain() {
        if (typeof this.meshFactory === 'function') {
            const mesh = this.meshFactory();
            if (!mesh) {
                throw new Error('Terrain meshFactory must return a THREE.Object3D.');
            }
            return mesh;
        }

        // Create a box geometry for a simple square block
        const geometry = new THREE.BoxGeometry(this.size, this.depth, this.size);

        const material = new THREE.MeshStandardMaterial({
            color: this.color,
            roughness: 0.9,
            metalness: 0.05,
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.receiveShadow = true;
        mesh.castShadow = true;

        // Position the block so its top is at y = 0
        mesh.position.y = -this.depth / 2;

        return mesh;
    }

    /**
     * Adds the terrain to a scene.
     * @param {THREE.Scene} scene - The Three.js scene
     */
    addToScene(scene) {
        scene.add(this.mesh);
    }

    /**
     * Removes the terrain from a scene.
     * @param {THREE.Scene} scene - The Three.js scene
     */
    removeFromScene(scene) {
        scene.remove(this.mesh);
    }

    /**
     * Updates the terrain color. Only applies to primitive terrains with a single material.
     * @param {number} color - The new color in hex format
     */
    setColor(color) {
        this.color = color;
        const { material } = this.mesh;
        if (!material) {
            return;
        }
        if (Array.isArray(material)) {
            material.forEach((mat) => {
                if (mat && mat.color) {
                    mat.color.setHex(color);
                }
            });
            return;
        }
        if (material.color) {
            material.color.setHex(color);
        }
    }

    get object3d() {
        return this.mesh;
    }
}
