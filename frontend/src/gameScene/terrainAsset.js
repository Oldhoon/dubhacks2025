import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';

const loader = new GLTFLoader();
const loadCache = new Map();
const TEMP_BOX = new THREE.Box3();
const ZERO_VECTOR = new THREE.Vector3();

export default class TerrainAsset {
    constructor({
        name,
        modelPath,
        scale = { x: 1, y: 1, z: 1 },
        offset = { x: 0, y: 0, z: 0 },
        fitRatio = 0.8
    } = {}) {
        if (!name) {
            throw new Error('TerrainAsset requires a name.');
        }
        if (!modelPath) {
            throw new Error(`TerrainAsset "${name}" requires a modelPath.`);
        }

        this.name = name;
        this.modelPath = modelPath;
        this.scale = new THREE.Vector3(scale.x, scale.y, scale.z);
        this.offset = new THREE.Vector3(offset.x, offset.y, offset.z);
        this.fitRatio = fitRatio;
    }

    setScale(scale) {
        this.scale.set(scale.x, scale.y, scale.z);
        return this;
    }

    setOffset(offset) {
        this.offset.set(offset.x, offset.y, offset.z);
        return this;
    }

    setFitRatio(ratio) {
        this.fitRatio = ratio;
        return this;
    }

    async loadSource() {
        if (!loadCache.has(this.modelPath)) {
            const loadPromise = new Promise((resolve, reject) => {
                loader.load(
                    this.modelPath,
                    (gltf) => {
                        const scene = gltf.scene;
                        scene.traverse((child) => {
                            if (child.isMesh) {
                                child.castShadow = true;
                                child.receiveShadow = true;
                            }
                        });
                        resolve({
                            scene,
                            animations: gltf.animations ? gltf.animations.slice() : []
                        });
                    },
                    undefined,
                    (error) => reject(error)
                );
            });
            loadCache.set(this.modelPath, loadPromise);
        }

        return loadCache.get(this.modelPath);
    }

    async createInstance(cellSize) {
        const { scene, animations } = await this.loadSource();
        const skinnedClone = cloneSkinned(scene);

        const container = new THREE.Group();
        container.name = `${this.name}-container`;
        container.userData.type = this.name;

        const root = new THREE.Group();
        root.name = `${this.name}-root`;
        container.add(root);

        root.add(skinnedClone);
        skinnedClone.scale.copy(this.scale);

        root.updateMatrixWorld(true);

        TEMP_BOX.setFromObject(root);
        const width = TEMP_BOX.max.x - TEMP_BOX.min.x;
        const depth = TEMP_BOX.max.z - TEMP_BOX.min.z;
        const maxHorizontal = Math.max(width, depth);

        if (cellSize && maxHorizontal > 0) {
            const desired = cellSize * this.fitRatio;
            const factor = desired / maxHorizontal;
            root.scale.multiplyScalar(factor);
        }

        root.updateMatrixWorld(true);
        TEMP_BOX.setFromObject(root);
        const bottom = TEMP_BOX.min.y;
        root.position.y -= bottom;

        if (!this.offset.equals(ZERO_VECTOR)) {
            root.position.add(this.offset);
        }

        container.userData.assetRoot = root;
        container.userData.assetClone = skinnedClone;
        container.userData.animations = animations ?? [];

        if (animations && animations.length) {
            const mixer = new THREE.AnimationMixer(skinnedClone);
            const actions = animations.map((clip, index) => {
                const action = mixer.clipAction(clip);
                if (index === 0) {
                    action.play();
                }
                return action;
            });
            container.userData.animationMixer = mixer;
            container.userData.animationActions = actions;
        }

        return container;
    }
}
