import * as THREE from 'three';
import { loadGLTFAsync } from './setup.js';

const DEFAULT_MODEL_PATH = 'assets/catapult/scene.gltf';
const DEFAULT_SCALE = { x: 0.2, y: 0.2, z: 0.2 };
const DEFAULT_OFFSET = { x: -0.5, y: 0.5, z: 0.5 };

// Shared geometry for all unit spheres to reduce memory usage
const SHARED_UNIT_GEOMETRY = new THREE.SphereGeometry(0.5, 16, 16);

/**
 * Catapult/Unit class - Represents game entities (units, structures) on the terrain
 * Supports both GLTF models and simple geometry as placeholders
 */
export default class Catapult {
    constructor({
        modelPath = DEFAULT_MODEL_PATH,
        scale = DEFAULT_SCALE,
        offset = DEFAULT_OFFSET,
        portraitIndex = null,
        useGeometry = false,
    } = {}) {
        this.modelPath = modelPath;
        this.scale = new THREE.Vector3(scale.x, scale.y, scale.z);
        this.offset = new THREE.Vector3(offset.x, offset.y, offset.z);
        this.portraitIndex = portraitIndex;
        this.useGeometry = useGeometry;

        this.root = new THREE.Group();
        this.root.name = 'CatapultRoot';

        this.model = null;
        this.parent = null;

        if (this.useGeometry) {
            // Create simple geometry for non-catapult units
            this.createGeometryMesh();
        } else {
            // Load GLTF model for catapults
            loadGLTFAsync([this.modelPath], (models) => {
                const gltfScene = models[0].scene;
                gltfScene.scale.set(this.scale.x, this.scale.y, this.scale.z);
                gltfScene.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });
                this.model = gltfScene;
                this.root.add(gltfScene);
            });
        }
    }

    /**
     * Create a simple geometry mesh (sphere) for non-model entities
     * Uses shared geometry to reduce memory usage
     */
    createGeometryMesh() {
        const material = new THREE.MeshLambertMaterial({
            color: this.getEntityColor(this.portraitIndex)
        });

        const mesh = new THREE.Mesh(SHARED_UNIT_GEOMETRY, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        this.model = mesh;
        this.root.add(mesh);
    }

    /**
     * Get color for entity based on portrait index
     */
    getEntityColor(index) {
        const colors = [0xff6b6b, 0x4ecdc4, 0xffe66d, 0x95e1d3];
        return colors[index % colors.length];
    }

    attachTo(target, { depth } = {}) {
        const parent = target?.mesh ?? target;
        if (!parent || typeof parent.add !== 'function') {
            throw new Error('Catapult.attachTo requires a Terrain instance or THREE.Object3D.');
        }

        if (this.parent && this.parent !== parent) {
            this.parent.remove(this.root);
        }

        const tileDepth = typeof depth === 'number' ? depth : (target?.depth ?? 0);

        parent.add(this.root);
        this.parent = parent;

        this.root.position.set(
            this.offset.x,
            tileDepth + this.offset.y,
            this.offset.z
        );
    }

    /**
     * Add entity directly to scene at a specific position
     * Alternative to attachTo for placing units in world space
     */
    addToScene(scene, position = new THREE.Vector3(0, 0, 0)) {
        if (this.parent && this.parent !== scene) {
            this.parent.remove(this.root);
        }
        
        scene.add(this.root);
        this.parent = scene;
        this.root.position.copy(position);
    }

    /**
     * Remove entity from its parent (scene or terrain)
     * Alias: detach()
     */
    removeFromScene(scene) {
        if (this.parent) {
            // For safety, verify the scene matches if provided
            if (scene && this.parent !== scene) {
                console.warn('Catapult: scene parameter does not match tracked parent');
            }
            this.parent.remove(this.root);
            this.parent = null;
        }
    }

    /**
     * Alias for removeFromScene() for backward compatibility
     */
    detach() {
        this.removeFromScene();
    }

    /**
     * Cleanup resources
     * Note: Simple geometry is shared, so we only dispose of materials for those
     */
    dispose() {
        if (!this.model) return;

        if (this.useGeometry && this.model.isMesh) {
            // Simple geometry unit - only dispose material (geometry is shared)
            this.model.material.dispose();
        } else {
            // GLTF model - traverse and dispose all meshes and materials
            this.model.traverse((child) => {
                if (child.isMesh) {
                    if (child.geometry) {
                        child.geometry.dispose();
                    }
                    if (child.material) {
                        // Handle both single material and material arrays
                        if (Array.isArray(child.material)) {
                            child.material.forEach(material => material.dispose());
                        } else {
                            child.material.dispose();
                        }
                    }
                }
            });
        }
    }

    get object3d() {
        return this.root;
    }
}
