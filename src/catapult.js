import * as THREE from 'three';
import { loadGLTFAsync } from './setup.js';

const DEFAULT_MODEL_PATH = 'assets/catapult/scene.gltf';
const DEFAULT_SCALE = { x: 0.2, y: 0.2, z: 0.2 };
const DEFAULT_OFFSET = { x: 0, y: 0, z: 0 };

const TEMP_BOX = new THREE.Box3();
const TEMP_CENTER = new THREE.Vector3();

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
        this.modelBounds = null;

        loadGLTFAsync([this.modelPath], (models) => {
            const gltf = models[0];
            const gltfScene = gltf.scene;
            gltfScene.scale.set(this.scale.x, this.scale.y, this.scale.z);
            gltfScene.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            this._normalizeModelFrame(gltfScene);
            this.model = gltfScene;
            this.root.add(gltfScene);
        });
    }

    attachTo(target, { depth } = {}) {
        const parent = this._resolveParent(target);
        if (!parent || typeof parent.add !== 'function') {
            throw new Error('Catapult.attachTo requires a Terrain instance or THREE.Object3D.');
        }

        if (this.parent && this.parent !== parent) {
            this.parent.remove(this.root);
        }

        parent.add(this.root);
        this.parent = parent;

        const surfaceHeight = this._getParentSurfaceHeight(parent, depth);

        this.root.position.set(
            this.offset.x,
            surfaceHeight + this.offset.y,
            this.offset.z
        );

        this.root.updateMatrixWorld(true);
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

    _normalizeModelFrame(model) {
        TEMP_BOX.setFromObject(model);
        if (TEMP_BOX.isEmpty()) {
            return;
        }

        TEMP_BOX.getCenter(TEMP_CENTER);
        const bottomCenter = new THREE.Vector3(
            TEMP_CENTER.x,
            TEMP_BOX.min.y,
            TEMP_CENTER.z
        );

        model.position.sub(bottomCenter);
        model.updateMatrixWorld(true);

        const size = new THREE.Vector3();
        TEMP_BOX.getSize(size);
        this.modelBounds = {
            size,
            bottomCenter
        };
    }

    _resolveParent(target) {
        if (!target) {
            return null;
        }

        if (target.mesh instanceof THREE.Object3D) {
            return target.mesh;
        }

        if (target.userData?.terrain?.mesh instanceof THREE.Object3D) {
            return target.userData.terrain.mesh;
        }

        return target;
    }

    _getParentSurfaceHeight(parent, overrideDepth) {
        if (typeof overrideDepth === 'number') {
            return overrideDepth;
        }

        if (parent?.isMesh && parent.geometry) {
            const geometry = parent.geometry;
            if (!geometry.boundingBox) {
                geometry.computeBoundingBox();
            }
            const bbox = geometry.boundingBox;
            const scaleY = parent.scale?.y ?? 1;
            return bbox.max.y * scaleY;
        }

        if (parent?.userData?.terrain?.depth) {
            return parent.userData.terrain.depth;
        }

        return 0;
    }
}
