import * as THREE from 'three';

const TERRAIN_SIZE = 3;
const TERRAIN_COLOR = 0x228B22; // Forest green
const TERRAIN_DEPTH = 1;

/**
 * Terrain class representing a simple square block with optional texture overlay
 */
export default class Terrain {
    constructor(size = TERRAIN_SIZE, color = TERRAIN_COLOR, texturePath = null) {
        this.size = size;
        this.color = color;
        this.depth = TERRAIN_DEPTH;
        this.texturePath = texturePath;
        this.mesh = this.createTerrain();
    }

    /**
     * Creates a simple square block terrain with optional texture on top
     * @returns {THREE.Mesh} The terrain mesh
     */
    createTerrain() {
        // Create a box geometry for a simple square block
        const geometry = new THREE.BoxGeometry(this.size, this.depth, this.size);

        // Create materials array for each face of the box
        let materials;

        if (this.texturePath) {
            // Load texture for the top face
            const textureLoader = new THREE.TextureLoader();
            const texture = textureLoader.load(this.texturePath);
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            texture.magFilter = THREE.NearestFilter; // Pixelated look for low-poly style
            texture.minFilter = THREE.NearestFilter;

            // Create material with texture for top face
            const topMaterial = new THREE.MeshLambertMaterial({
                map: texture,
                flatShading: true
            });

            // Create solid color material for other faces
            const sideMaterial = new THREE.MeshLambertMaterial({
                color: this.color,
                flatShading: true
            });

            // Box faces order: right, left, top, bottom, front, back
            materials = [
                sideMaterial, // right
                sideMaterial, // left
                topMaterial,  // top (this is where the texture goes)
                sideMaterial, // bottom
                sideMaterial, // front
                sideMaterial  // back
            ];
        } else {
            // No texture, use single color material
            materials = new THREE.MeshLambertMaterial({
                color: this.color,
                flatShading: true
            });
        }

        const mesh = new THREE.Mesh(geometry, materials);
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
        
        // Handle both single material and array of materials
        if (Array.isArray(this.mesh.material)) {
            // For textured tiles with multiple materials, update all materials
            this.mesh.material.forEach(material => {
                if (material.color) {
                    material.color.setHex(color);
                }
            });
        } else {
            // For single material tiles
            if (this.mesh.material.color) {
                this.mesh.material.color.setHex(color);
            }
        }
    }

    get object3d() {
        return this.mesh;
    }
}
