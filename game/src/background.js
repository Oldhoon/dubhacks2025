import * as THREE from 'three';
import { loadGLTFAsync } from './setup.js';

loadGLTFAsync(["assets/trees/lowpoly_birch_tree_3d_pixel_art.glb"], (models) => {
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