import * as THREE from 'three';

/**
 * Sprite - Represents a game character/unit on the terrain
 * Currently uses sphere geometry as placeholder, will support GLB/OBJ models
 */
class Sprite {
    constructor(portraitIndex, position = new THREE.Vector3(0, 0, 0)) {
        this.portraitIndex = portraitIndex;
        this.position = position;
        this.mesh = null;
        this.modelPath = null; // Future: path to GLB/OBJ file

        this.createMesh();
    }

    /**
     * Create the 3D mesh for this sprite
     * Currently creates a sphere, will be replaced with model loading
     */
    createMesh() {
        // Placeholder sphere geometry
        const geometry = new THREE.SphereGeometry(0.5, 16, 16);

        // Different color based on portrait index
        const material = new THREE.MeshLambertMaterial({
            color: this.getSpriteColor(this.portraitIndex)
        });

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;

        // Position the mesh
        this.mesh.position.copy(this.position);

        // Store reference to this sprite in mesh userData
        this.mesh.userData.sprite = this;
    }

    /**
     * Get color for sprite based on portrait index
     */
    getSpriteColor(index) {
        const colors = [0xff6b6b, 0x4ecdc4, 0xffe66d, 0x95e1d3];
        return colors[index % colors.length];
    }

    /**
     * Set position of the sprite
     */
    setPosition(x, y, z) {
        this.position.set(x, y, z);
        if (this.mesh) {
            this.mesh.position.copy(this.position);
        }
    }

    /**
     * Add sprite to scene
     */
    addToScene(scene) {
        if (this.mesh) {
            scene.add(this.mesh);
        }
    }

    /**
     * Remove sprite from scene
     */
    removeFromScene(scene) {
        if (this.mesh) {
            scene.remove(this.mesh);
        }
    }

    /**
     * Load a 3D model (GLB/OBJ) - Placeholder for future implementation
     */
    loadModel(modelPath) {
        this.modelPath = modelPath;
        // TODO: Implement GLTFLoader or OBJLoader
        // This will replace the sphere geometry with the actual model
        console.log(`Model loading not yet implemented. Path: ${modelPath}`);
    }

    /**
     * Cleanup resources
     */
    dispose() {
        if (this.mesh) {
            this.mesh.geometry.dispose();
            this.mesh.material.dispose();
        }
    }
}

export default Sprite;
