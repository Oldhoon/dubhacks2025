import * as THREE from 'three';

const TERRAIN_SIZE = 4;
const TERRAIN_COLOR = 0x228B22; // Forest green
const TERRAIN_DEPTH = 1;
const TERRAIN_BASE_SCALE = 1.2; // how much wider the base is vs top
const DEFAULT_SEGMENTS = { width: 8, height: 4, depth: 8 };
const DEFAULT_JAGGED = { enabled: false, amount: 0.25 };
const DEFAULT_TOP_JAGGED = { enabled: false, amount: 0.15, innerRadius: 0.8 };

/**
 * Terrain class representing a simple square block with optional texture overlay
 */
// (procedural side texture removed for simplicity)

export default class Terrain {
    constructor(
        size = TERRAIN_SIZE,
        color = TERRAIN_COLOR,
        texturePath = null,
        baseScale = TERRAIN_BASE_SCALE,
        atlas = null, // { columns, rows, randomize?: boolean, index?: number, randomRotate?: boolean }
        options = {}
    ) {
        this.size = size;
        this.color = color;
        this.depth = TERRAIN_DEPTH;
        this.texturePath = texturePath;
        this.baseScale = baseScale;
        this.atlas = atlas;
        this.sideTexturePath = options.sideTexturePath ?? null;
        this.segments = {
            width: options.widthSegments ?? DEFAULT_SEGMENTS.width,
            height: options.heightSegments ?? DEFAULT_SEGMENTS.height,
            depth: options.depthSegments ?? DEFAULT_SEGMENTS.depth,
        };
        this.jagged = {
            enabled: options.jagged?.enabled ?? options.jagged ?? DEFAULT_JAGGED.enabled,
            amount: options.jagged?.amount ?? options.jaggedAmount ?? DEFAULT_JAGGED.amount,
        };
        this.topJagged = {
            enabled: options.topJagged?.enabled ?? options.topJagged ?? DEFAULT_TOP_JAGGED.enabled,
            amount: options.topJagged?.amount ?? options.topJaggedAmount ?? DEFAULT_TOP_JAGGED.amount,
            innerRadius: options.topJagged?.innerRadius ?? DEFAULT_TOP_JAGGED.innerRadius,
        };
        this.orientation = 0;
        this.randomOrientation = !!options.randomOrientation;
        this.orientationSteps = Math.max(1, Math.floor(options.orientationSteps ?? 4));
        this.jaggedSeed = (this.jagged.enabled ? (options.jaggedSeed ?? Math.random() * 10000) : 0);

        this.mesh = this.createTerrain();
    }

    /**
     * Creates a simple square block terrain with optional texture on top
     * @returns {THREE.Mesh} The terrain mesh
     */
    createTerrain() {
        // Create a box geometry for a simple square block, then taper it (wider base)
        const geometry = new THREE.BoxGeometry(
            this.size,
            this.depth,
            this.size,
            this.segments.width,
            this.segments.height,
            this.segments.depth
        );

        // Make the base wider than the top with a gradual flare (top=1.0, bottom=baseScale)
        const position = geometry.attributes.position;
        const halfDepth = this.depth / 2;
        for (let i = 0; i < position.count; i++) {
            const y = position.getY(i);
            const t = (halfDepth - y) / this.depth; // 0 at top, 1 at bottom
            const s = 1 + (this.baseScale - 1) * Math.max(0, Math.min(1, t));
            position.setX(i, position.getX(i) * s);
            position.setZ(i, position.getZ(i) * s);
        }
        // Optional: add jagged cliff-like side edges by perturbing side-face vertices
        if (this.jagged.enabled && this.jagged.amount > 0) {
            const halfW = this.size / 2;
            const halfH = this.depth / 2;
            const amt = this.jagged.amount;
            const EPS2 = 1e-4;

            // helper pseudo-random from coordinates (stable across runs for same geometry)
            const fract = (n) => n - Math.floor(n);
            const hash3 = (x, y, z) => {
                // incorporate a per-tile seed to vary shapes across tiles
                const s = Math.sin((x + this.jaggedSeed) * 12.9898 + y * 78.233 + (z + this.jaggedSeed * 1.37) * 37.719) * 43758.5453;
                return fract(s);
            };

            for (let i = 0; i < position.count; i++) {
                const x = position.getX(i);
                const y = position.getY(i);
                const z = position.getZ(i);

                // skip top cap to keep the playable surface flat and aligned
                if (Math.abs(y - halfH) < EPS2) continue;

                // vertical factor: more jagged near the bottom, less near top
                const t = (halfH - y) / (this.depth); // top=0, bottom=1
                const base = 0.35; // ensure some jaggedness even near the top
                const factor = base + (1 - base) * t;
                const rnd = hash3(x, y, z) * 2 - 1; // [-1,1]
                const push = amt * factor * rnd;

                // outward direction in XZ plane from center
                const len = Math.hypot(x, z) || 1.0;
                const dx = (x / len) * push;
                const dz = (z / len) * push;

                let nx = x + dx;
                let nz = z + dz;

                // Do not let upper portions extend beyond the top footprint; allow more flare toward base
                const f = (halfH - y) / (this.depth); // 0 at top, 1 at bottom
                const allowedMax = halfW * (1 + (this.baseScale - 1) * Math.max(0, Math.min(1, f)));
                const rNew = Math.max(Math.abs(nx), Math.abs(nz));
                if (rNew > allowedMax) {
                    const scale = allowedMax / rNew;
                    nx *= scale;
                    nz *= scale;
                }

                position.setX(i, nx);
                position.setZ(i, nz);
            }
        }

        // Simple jagged top rim: nudge only the outer ring of top vertices in XZ
        if (this.topJagged.enabled && this.topJagged.amount > 0) {
            const halfW = this.size / 2;
            const halfH = this.depth / 2;
            const amtTop = this.topJagged.amount;
            const innerR = Math.min(0.999, Math.max(0.0, this.topJagged.innerRadius));
            const EPS2 = 1e-4;

            const fract = (n) => n - Math.floor(n);
            const hash2 = (x, z) => {
                const s = Math.sin((x + this.jaggedSeed * 0.73) * 21.9898 + (z + this.jaggedSeed * 1.19) * 47.233) * 127.1;
                return fract(s);
            };

            for (let i = 0; i < position.count; i++) {
                const x = position.getX(i);
                const y = position.getY(i);
                const z = position.getZ(i);
                if (Math.abs(y - halfH) >= EPS2) continue; // only top cap

                const r = Math.max(Math.abs(x), Math.abs(z)) / halfW; // 0 center, 1 edge
                if (r <= innerR) continue; // only near border
                const edgeFactor = Math.min(1, (r - innerR) / (1 - innerR));

                const rnd = hash2(x, z) * 2 - 1; // [-1,1]
                const push = amtTop * edgeFactor * rnd;

                const len = Math.hypot(x, z) || 1.0;
                const dx = (x / len) * push;
                const dz = (z / len) * push;

                let nx = x + dx;
                let nz = z + dz;
                // clamp to top footprint
                const rNew = Math.max(Math.abs(nx), Math.abs(nz));
                if (rNew > halfW) {
                    const scale = halfW / rNew;
                    nx *= scale;
                    nz *= scale;
                }
                position.setX(i, nx);
                position.setZ(i, nz);
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
            // Use correct color space for albedo maps with PBR
            texture.colorSpace = THREE.SRGBColorSpace;

            // If an atlas is provided, pick a tile region (e.g., 2x2 grass variants)
            if (this.atlas && this.atlas.columns && this.atlas.rows) {
                const cols = this.atlas.columns;
                const rows = this.atlas.rows;
                const total = cols * rows;
                let index = 0;
                if (this.atlas.randomize) {
                    index = Math.floor(Math.random() * (total - 1)) + 1;
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
                // if (this.atlas.randomRotate) {
                //     const steps = this.atlas.rotationSteps ? Math.max(1, Math.floor(this.atlas.rotationSteps)) : 4;
                //     const stepIndex = Math.floor(Math.random() * steps);
                //     const angle = (Math.PI * 2 * stepIndex) / steps;
                //     // rotate around the center of the selected quadrant
                //     // texture.center.set(col * tileW + tileW / 2, yOffset + tileH / 2);
                //     texture.rotation = angle;
                // }
                // No explicit needsUpdate here; TextureLoader will update when image loads
            }

            // Create material with texture for top face
            const topMaterial = new THREE.MeshStandardMaterial({
                map: texture,
                roughness: 1.0,
                metalness: 0.0,
                flatShading: true
            });

            // Side material: use provided cliff texture if available, otherwise flat color
            let sideMaterial;
            if (this.sideTexturePath) {
                const sideBase = textureLoader.load(this.sideTexturePath);
                const sideTex = sideBase.clone();
                sideTex.wrapS = THREE.RepeatWrapping;
                sideTex.wrapT = THREE.RepeatWrapping;
                sideTex.magFilter = THREE.NearestFilter;
                sideTex.minFilter = THREE.NearestFilter;
                sideTex.colorSpace = THREE.SRGBColorSpace;
                // Use a 2:1 window: full width (U=1), half height (V=0.5) with random vertical offset
                const windowV = 0.5;
                const yOffset = Math.random() * (1 - windowV);
                sideTex.repeat.set(1, windowV);
                sideTex.offset.set(0, yOffset);
                // No explicit needsUpdate; image load will trigger update automatically
                sideMaterial = new THREE.MeshStandardMaterial({
                    map: sideTex,
                    roughness: 1.0,
                    metalness: 0.0,
                    flatShading: true
                });
            } else {
                sideMaterial = new THREE.MeshStandardMaterial({
                    color: this.color,
                    roughness: 1.0,
                    metalness: 0.0,
                    flatShading: true
                });
            }

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
        mesh.userData = mesh.userData || {};
        mesh.userData.terrain = this;
        mesh.userData.isTerrain = true;

        // Position the block so its bottom sits at y = 0
        mesh.position.y = this.depth / 2;

        // Optional: randomize orientation (rotates which side is considered front/left/back/right)
        // if (this.randomOrientation) {
        //     const step = Math.floor(Math.random() * this.orientationSteps);
        //     this.orientation = (Math.PI * 2 * step) / this.orientationSteps;
        //     mesh.rotation.y = this.orientation;
        // }

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
