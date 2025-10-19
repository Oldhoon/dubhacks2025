import * as THREE from 'three';
import { loadGLTFAsync } from './setup.js';

const DEFAULT_MODEL_PATH = 'assets/catapult/scene.gltf';
const DEFAULT_SCALE = { x: 0.2, y: 0.2, z: 0.2 };
const DEFAULT_OFFSET = { x: -0.5, y: 0.5, z: 0.5 };

export default class Catapult {
    constructor({
        modelPath = DEFAULT_MODEL_PATH,
        scale = DEFAULT_SCALE,
        offset = DEFAULT_OFFSET,
    } = {}) {
        this.modelPath = modelPath;
        this.scale = new THREE.Vector3(scale.x, scale.y, scale.z);
        this.offset = new THREE.Vector3(offset.x, offset.y, offset.z);

        this.root = new THREE.Group();
        this.root.name = 'CatapultRoot';

        this.model = null;
        this.parent = null;

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

    detach() {
        if (this.parent) {
            this.parent.remove(this.root);
            this.parent = null;
        }
    }

    get object3d() {
        return this.root;
    }
}
