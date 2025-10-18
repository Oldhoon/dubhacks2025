import * as THREE from 'three';
import Terrain from './terrain.js';
import { loadGLTFAsync, loadOBJAsync } from './setup.js';

// Configuration constants
const TERRAIN_SIZE = 20;
const TERRAIN_SEGMENTS = 10;
const CHARACTER_RADIUS = 0.3;
const CHARACTER_HEIGHT = 1;
const CHARACTER_RADIAL_SEGMENTS = 4;
const CHARACTER_HEIGHT_SEGMENTS = 8;
const ROTATION_SPEED = 0.01;

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb); // Sky blue background

// Perspective camera setup (adds depth to ground)
const aspect = window.innerWidth / window.innerHeight;
const camera = new THREE.PerspectiveCamera(
    45,    // Field of view (smaller = zoomed in, larger = more wide angle)
    aspect,
    0.1,
    1000
);

// Camera 45° down, but not rotated sideways
camera.position.set(0, 15, 20);  // angle downward
camera.lookAt(0, 0, 0);

// Renderer setup
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const container = document.getElementById('game-container');
if (!container) {
    throw new Error('Game container element with ID "game-container" not found');
}
container.appendChild(renderer.domElement);

// Lighting setup
// Ambient light for overall scene illumination
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

// Directional light (sun) with shadows
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(10, 20, 10);
directionalLight.castShadow = true;
directionalLight.shadow.camera.left = -20;
directionalLight.shadow.camera.right = 20;
directionalLight.shadow.camera.top = 20;
directionalLight.shadow.camera.bottom = -20;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
scene.add(directionalLight);

// Flat plane terrain (low-poly style)
const planeGeometry = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, TERRAIN_SEGMENTS, TERRAIN_SEGMENTS);
const planeMaterial = new THREE.MeshLambertMaterial({ 
    color: 0x3a9d3a,
    flatShading: true // Low-poly effect
});
const plane = new THREE.Mesh(planeGeometry, planeMaterial);
plane.rotation.x = -Math.PI / 2;
plane.receiveShadow = true;
scene.add(plane);

// Character (simple low-poly capsule for now)
const characterGeometry = new THREE.CapsuleGeometry(
    CHARACTER_RADIUS, 
    CHARACTER_HEIGHT, 
    CHARACTER_RADIAL_SEGMENTS, 
    CHARACTER_HEIGHT_SEGMENTS
);
const characterMaterial = new THREE.MeshLambertMaterial({ 
    color: 0xff6b6b,
    flatShading: true // Low-poly effect
});
const character = new THREE.Mesh(characterGeometry, characterMaterial);
character.position.y = 1;
character.castShadow = true;
scene.add(character);

// Add terrain block using Terrain class
const terrainBlock = new Terrain();
terrainBlock.addToScene(scene);

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });



let catapult;

loadGLTFAsync(["assets/catapult/scene.gltf"], function(models) {
    catapult = models[0].scene;

    catapult.scale.set(0.3, 0.3, 0.3);
    catapult.position.set(0.0, 0.0, 0.0);
    // catapult.rotation.y = Math.PI;

    scene.add(catapult);
});


// // Grid definition (0 = empty, 1 = grass, 2 = building, 3 = power, 4 = hole, 5 = start)
// const GRID = [
//     [0, 2, 2, 2, 2],
//     [1, 0, 3, 0, 4],
//     [5, 1, 0, 0, 1],
//     [1, 1, 1, 3, 1],
//     [0, 0, 1, 2, 0]
//   ];


// // Grid constants
// const TILE_SIZE = 1; // spacing between tiles
// const HALF = (GRID.length - 1) * 0.5;

// // Base materials (different colors = different tile types)
// const materials = {
//   0: new THREE.MeshStandardMaterial({ color: 0xaaaaaa }), // empty
//   1: new THREE.MeshStandardMaterial({ color: 0x3fa34d }), // grass
//   2: new THREE.MeshStandardMaterial({ color: 0xcccccc }), // building
//   3: new THREE.MeshStandardMaterial({ color: 0xaa33ff, emissive: 0x551177 }), // power
//   4: new THREE.MeshStandardMaterial({ color: 0x553322 }), // hole
//   5: new THREE.MeshStandardMaterial({ color: 0xff5555 })  // start
// };

// const tileGeo = new THREE.BoxGeometry(TILE_SIZE, 0.1, TILE_SIZE);

// GRID.forEach((row, r) => {
//   row.forEach((tileType, c) => {
//     if (tileType === null) return;

//     const mesh = new THREE.Mesh(tileGeo, materials[tileType]);
//     mesh.position.set(c - HALF, 0, r - HALF);
//     scene.add(mesh);
//   });
// });










// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    // Simple character rotation animation for demonstration
    character.rotation.y += ROTATION_SPEED;
    
    renderer.render(scene, camera);
}

animate();
