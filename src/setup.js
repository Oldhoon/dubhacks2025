import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

async function loadGLTFAsync(files, postLoading) {
    const manager = new THREE.LoadingManager();
    manager.onProgress = function (item, loaded, total) {
        console.log("loading manager log: ", item, loaded, total);
    };

    const onProgress = function (xhr) {
        if (xhr.lengthComputable) {
            const percentComplete = xhr.loaded / xhr.total * 100.0;
            console.log(Math.round(percentComplete, 2) + '% downloaded');
        }
    };
    const loader = new GLTFLoader(manager);
    const models = await Promise.all(files.map(file => loader.loadAsync(file, onProgress)));
    if (typeof postLoading === 'function') {
        postLoading(models);
    }
    return models;
}

async function loadOBJAsync(files, postLoading) {
    const manager = new THREE.LoadingManager();
    manager.onProgress = function (item, loaded, total) {
        console.log("loading manager log: ", item, loaded, total);
    };

    const onProgress = function (xhr) {
        if (xhr.lengthComputable) {
            const percentComplete = xhr.loaded / xhr.total * 100.0;
            console.log(Math.round(percentComplete, 2) + '% downloaded');
        }
    };
    const loader = new OBJLoader(manager);
    const models = await Promise.all(files.map(file => loader.loadAsync(file, onProgress)));
    if (typeof postLoading === 'function') {
        postLoading(models);
    }
    return models;
}

async function loadFBXAsync(files, postLoading) {
    const manager = new THREE.LoadingManager();
    manager.onProgress = function (item, loaded, total) {
        console.log("loading manager log: ", item, loaded, total);
    };

    const onProgress = function (xhr) {
        if (xhr.lengthComputable) {
            const percentComplete = xhr.loaded / xhr.total * 100.0;
            console.log(Math.round(percentComplete, 2) + '% downloaded');
        }
    };

    const loader = new FBXLoader(manager);
    const models = await Promise.all(files.map(file => loader.loadAsync(file, onProgress)));
    if (typeof postLoading === 'function') {
        postLoading(models);
    }
    return models;
}

export {loadGLTFAsync, loadOBJAsync, loadFBXAsync};
