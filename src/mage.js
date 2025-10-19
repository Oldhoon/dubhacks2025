import * as THREE from 'three';
import { loadGLTFAsync } from './setup.js';

const DEFAULT_MODEL_PATH = 'assets/sprites/mage/scene.gltf';
const DEFAULT_SCALE = { x: 0.05, y: 0.05, z: 0.05 };
const DEFAULT_OFFSET = { x: 0, y: 0.5, z: 1 };

export default class Mage {
    constructor({
        modelPath = DEFAULT_MODEL_PATH,
        scale = DEFAULT_SCALE,
        offset = DEFAULT_OFFSET,
    } = {}) {
        this.modelPath = modelPath;
        this.scale = new THREE.Vector3(scale.x, scale.y, scale.z);
        this.offset = new THREE.Vector3(offset.x, offset.y, offset.z);

        this.root = new THREE.Group();
        this.root.name = 'MageRoot';

        this.model = null;
        this.parent = null;
        this.mixer = null;
        this.actions = {};
        this.activeAction = null;
        this.activeClipName = null;

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
            this.model = gltfScene;
            this.root.add(gltfScene);
            this.setupAnimations(gltfScene, gltf.animations);
        });
    }

    attachTo(target, { depth } = {}) {
        const parent = target?.mesh ?? target;
        if (!parent || typeof parent.add !== 'function') {
            throw new Error('Mage.attachTo requires a Terrain instance or THREE.Object3D.');
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

    setupAnimations(scene, animations = []) {
        if (!animations.length) return;

        this.mixer = new THREE.AnimationMixer(scene);
        animations.forEach((clip, index) => {
            const clipName = clip.name && clip.name.length ? clip.name : `clip_${index}`;
            const action = this.mixer.clipAction(clip);
            this.actions[clipName] = action;

            if (!this.activeAction) {
                action.play();
                this.activeAction = action;
                this.activeClipName = clipName;
            }
        });
    }

    playAnimation(clipName, { fadeDuration = 0.25 } = {}) {
        if (!this.mixer || !this.actions[clipName]) return;

        const nextAction = this.actions[clipName];
        if (this.activeAction === nextAction) return;

        nextAction.reset().play();
        nextAction.enabled = true;

        if (this.activeAction) {
            this.activeAction.crossFadeTo(nextAction, fadeDuration, false);
        }

        this.activeAction = nextAction;
        this.activeClipName = clipName;
    }

    update(delta) {
        if (this.mixer) {
            this.mixer.update(delta);
        }
    }

    get object3d() {
        return this.root;
    }
}
