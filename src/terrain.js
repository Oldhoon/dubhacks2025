import * as THREE from 'three';

const TERRAIN_SIZE = 3;
const TERRAIN_COLOR = 0x228B22; // Forest green
const TERRAIN_DEPTH = 1;
const TERRAIN_BASE_SCALE = 1.2; // how much wider the base is vs top

/**
 * Terrain class representing a simple square block with optional texture overlay
 */
export default class Terrain {
    constructor(
        size = TERRAIN_SIZE,
        color = TERRAIN_COLOR,
        texturePath = null,
        baseScale = TERRAIN_BASE_SCALE,
        atlas = null // { columns, rows, randomize?: boolean, index?: number }
    ) {
        this.size = size;
        this.color = color;
        this.depth = TERRAIN_DEPTH;
        this.texturePath = texturePath;
        this.baseScale = baseScale;
        this.atlas = atlas;
        this.mesh = this.createTerrain();
    }

    /**
     * Creates a simple square block terrain with optional texture on top
     * @returns {THREE.Mesh} The terrain mesh
     */
    createTerrain() {
        // Create a box geometry for a simple square block, then taper it (wider base)
        const geometry = new THREE.BoxGeometry(this.size, this.depth, this.size);

        // Make the base wider than the top by scaling bottom vertices
        const position = geometry.attributes.position;
        const halfDepth = this.depth / 2;
        const EPS = 1e-6;
        for (let i = 0; i < position.count; i++) {
            const y = position.getY(i);
            if (Math.abs(y + halfDepth) < EPS) {
                // bottom vertex -> scale outwards
                position.setX(i, position.getX(i) * this.baseScale);
                position.setZ(i, position.getZ(i) * this.baseScale);
            }
        }
        position.needsUpdate = true;
        geometry.computeVertexNormals();
        geometry.computeBoundingBox();
        geometry.computeBoundingSphere();

        // Create materials array for each face of the box
        let materials;

        if (this.texturePath) {
            // Load texture for the top face
            const textureLoader = new THREE.TextureLoader();
            const baseTexture = textureLoader.load(this.texturePath);
            // Clone so each tile has its own Texture instance (per‑tile offsets/rotation)
            const texture = baseTexture.clone();
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            texture.magFilter = THREE.NearestFilter; // Pixelated look for low-poly style
            texture.minFilter = THREE.NearestFilter;

            // If an atlas is provided, pick a tile region (e.g., 2x2 grass variants)
            if (this.atlas && this.atlas.columns && this.atlas.rows) {
                const cols = this.atlas.columns;
                const rows = this.atlas.rows;
                const total = cols * rows;
                let index = 0;
                if (this.atlas.randomize) {
                    index = Math.floor(Math.random() * total);
                } else if (typeof this.atlas.index === 'number') {
                    index = Math.max(0, Math.min(total - 1, Math.floor(this.atlas.index)));
                }
                
                const tileW = 1 / cols;
                const tileH = 1 / rows;
                const col = index % cols;
                const row = Math.floor(index / cols);
                // Account for three.js default flipY on textures: invert Y when selecting rows
                const yOffset = 1 - tileH - row * tileH;
                texture.repeat.set(tileW, tileH);
                texture.offset.set(col * tileW, yOffset);

                // Optional: randomize rotation of the selected sub-tile (0/90/180/270)
                if (this.atlas.randomRotate) {
                    const steps = this.atlas.rotationSteps ? Math.max(1, Math.floor(this.atlas.rotationSteps)) : 4;
                    const stepIndex = Math.floor(Math.random() * steps);
                    const angle = (Math.PI * 2 * stepIndex) / steps;
                    // rotate around the center of the selected quadrant
                    texture.center.set(col * tileW + tileW / 2, yOffset + tileH / 2);
                    texture.rotation = angle;
                }
                texture.needsUpdate = true;
            }

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

        // Position the block so its bottom sits at y = 0
        mesh.position.y = this.depth / 2;

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

    get object3d() {
        return this.mesh;
    }
}
