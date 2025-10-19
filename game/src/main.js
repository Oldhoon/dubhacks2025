import * as THREE from 'three';
import Terrain from './terrain.js';
import Catapult from './catapult.js';
import PortraitSlots from './portraitSlots.js';
import SelectionManager from './selectionManager.js';
import CameraController from './cameraController.js';
import TargetingSystem from './targetingSystem.js';
import { loadGLTFAsync } from './setup.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

// Configuration constants
const TERRAIN_SIZE = 50;
const TERRAIN_SEGMENTS = 10;

const TILE_SIZE = 4.5;

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
camera.position.set(0, 30, 22);  // angle downward
camera.lookAt(0, 0, 4);
scene.add(camera);

// Renderer setup
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
// Enable physically based rendering pipeline
renderer.physicallyCorrectLights = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;
const container = document.getElementById('game-container');
if (!container) {
    throw new Error('Game container element with ID "game-container" not found');
}
container.appendChild(renderer.domElement);

// Lighting setup
// Ambient light for overall scene illumination
const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
scene.add(ambientLight);

// Directional light (sun) with shadows
const directionalLight = new THREE.DirectionalLight(0xffffff, 3.0);
directionalLight.position.set(10, 20, 10);
directionalLight.castShadow = true;
directionalLight.shadow.camera.left = -20;
directionalLight.shadow.camera.right = 20;
directionalLight.shadow.camera.top = 20;
directionalLight.shadow.camera.bottom = -20;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
scene.add(directionalLight);

// Image-based lighting environment for PBR
const pmremGenerator = new THREE.PMREMGenerator(renderer);
const envMap = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environment = envMap;

// Flat plane terrain (low-poly style)
const planeGeometry = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE - 1, TERRAIN_SEGMENTS, TERRAIN_SEGMENTS);
const planeMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x3a9d3a,
    roughness: 1.0,
    metalness: 0.0,
    flatShading: true // Low-poly effect
});
// Apply base grass texture with repeating so blades are small
const BASE_GRASS_PATH = 'assets/tiles/Texture/Base Grass IMG.png';
const baseGrassTex = new THREE.TextureLoader().load(BASE_GRASS_PATH);
baseGrassTex.wrapS = THREE.RepeatWrapping;
baseGrassTex.wrapT = THREE.RepeatWrapping;
baseGrassTex.colorSpace = THREE.SRGBColorSpace;
baseGrassTex.magFilter = THREE.NearestFilter;
baseGrassTex.minFilter = THREE.NearestFilter;
// Repeat across the plane; tweak for desired density
baseGrassTex.repeat.set(6, 6);
planeMaterial.map = baseGrassTex;
planeMaterial.needsUpdate = true;
const plane = new THREE.Mesh(planeGeometry, planeMaterial);
plane.rotation.x = -Math.PI / 2;
plane.position.y = -0.05; // Slightly below tiles to avoid z-fighting
plane.receiveShadow = true;
scene.add(plane);

// flat plane for displaying unit selection
const selectionPlaneGeometry = new THREE.PlaneGeometry(20, 5);
const selectionPlaneMaterial = new THREE.MeshBasicMaterial({ 
    color: 0xffffff,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.8
}); 
const selectionPlane = new THREE.Mesh(selectionPlaneGeometry, selectionPlaneMaterial);
selectionPlane.position.set(0, 1, 13.5); 
selectionPlane.rotation.x = -Math.PI / 2 + 0.5;

scene.add(selectionPlane);

const clock = new THREE.Clock();

// Add terrain block using Terrain class
// const terrainBlock = new Terrain();
// terrainBlock.addToScene(scene);

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });


// Grass tiles across the entire grid
const GRASS_TEXTURE_PATH = 'assets/tiles/Texture/TX Tileset Grass.png';
const GRASS_ATLAS = { columns: 2, rows: 2, randomize: true, randomRotate: false };
const createGrassTile = () => new Terrain(
  TILE_SIZE,                      // size
  0x3a9d3a,                       // color
  GRASS_TEXTURE_PATH,             // texturePath
  undefined,                      // baseScale (will use default)
  GRASS_ATLAS,                    // atlas
  {                               // options
    jagged: { enabled: true, amount: 0.45 },
    topJagged: { enabled: true, amount: 0.12, innerRadius: 0.8 },
    widthSegments: 14,
    heightSegments: 12,
    depthSegments: 14,
    randomOrientation: false,
    orientationSteps: 4,
    sideTexturePath: 'assets/tiles/Texture/Side Cliff IMG.png'
  }
);
// Grid definition with textured tiles
const GRID_ROWS = 4;
const GRID_COLS = 4;
const GRID = Array.from({ length: GRID_ROWS }, () =>
  Array.from({ length: GRID_COLS }, () => createGrassTile())
);



// --- grid constants
const TILE_GAP = 0.75;        // gap between tiles in world units
const TILE_SPACING = TILE_SIZE + TILE_GAP; // total spacing
const ROWS = GRID.length;
const COLS = GRID[0].length;

function gridToWorld(col, row) {
  const offsetX = (COLS - 1) * 0.5;
  const offsetZ = (ROWS - 1) * 0.5;
  return {
    x: (col - offsetX) * TILE_SPACING,
    z: (row - offsetZ) * TILE_SPACING,
  };
}

// Build / place tiles and collect terrain meshes
const terrainMeshes = [];
for (let r = 0; r < ROWS; r++) {
  for (let c = 0; c < COLS; c++) {
    let tile = GRID[r][c];
    if (tile == null) continue;
    if (!(tile instanceof Terrain)) {
      tile = new Terrain();
      GRID[r][c] = tile;
    }

    const { x, z } = gridToWorld(c, r);
    const obj = tile.mesh;

    // set world X/Z (Y already handled by Terrain)
    obj.position.x = x;
    obj.position.z = z;

    // add once
    scene.add(obj);
    terrainMeshes.push(obj);
  }
}

const treeScale = 0.5;

// Load and scatter small trees and stumps to form a forest band
// Simple pine placement (reverted to stable version)
loadGLTFAsync(["assets/trees/small_tree.glb"], (models) => {
  const prefab = models[0].scene;
  prefab.traverse((c) => {
    if (c.isMesh) {
      c.castShadow = true;
      c.receiveShadow = true;
    }
  });

  function randomXZ() {
    let x = Math.random() * 2 - 1;
    let z = Math.random() * 2 - 1;
    return {x, z};
  }

  function randomHeight() {
    const h = treeScale * (Math.random() + 5.0) / 6.0;
    return h;
  }

  const COUNT = 4;
  for (let i = -COUNT; i < COUNT; i++) {
    const inst = prefab.clone(true);
    const s = THREE.MathUtils.lerp(0.7, 1.2, Math.random());
    const h = randomHeight();
    inst.scale.set(h, h, h);
    const {x, z} = randomXZ();
    inst.position.set(i * 3 + x, 0, -12 + z);
    scene.add(inst);
  }
  for (let i = -COUNT; i < COUNT; i++) {
    const inst = prefab.clone(true);
    const s = THREE.MathUtils.lerp(0.7, 1.2, Math.random());
    const h = randomHeight();
    inst.scale.set(h, h, h);
    const {x, z} = randomXZ();
    inst.position.set(i * 3 + x, 0, -15 + z);
    scene.add(inst);
  }
  for (let i = -COUNT - 2; i < COUNT + 2; i++) {
    const inst = prefab.clone(true);
    const s = THREE.MathUtils.lerp(0.7, 1.2, Math.random());
    const h = randomHeight();
    inst.scale.set(h, h, h);
    const {x, z} = randomXZ();
    inst.position.set(-12 + x, 0, -i * 3 + z);
    scene.add(inst);
  }
  for (let i = -COUNT - 2; i < COUNT + 2; i++) {
    const inst = prefab.clone(true);
    const s = THREE.MathUtils.lerp(0.7, 1.2, Math.random());
    const h = randomHeight();
    inst.scale.set(h, h, h);
    const {x, z} = randomXZ();
    inst.position.set(-15 + x, 0, -i * 3 + z);
    scene.add(inst);
  }
  for (let i = -COUNT - 2; i < COUNT + 2; i++) {
    const inst = prefab.clone(true);
    const s = THREE.MathUtils.lerp(0.7, 1.2, Math.random());
    const h = randomHeight();
    inst.scale.set(h, h, h);
    const {x, z} = randomXZ();
    inst.position.set(-18 + x, 0, -i * 3 + z);
    scene.add(inst);
  }
  for (let i = -COUNT - 2; i < COUNT + 2; i++) {
    const inst = prefab.clone(true);
    const s = THREE.MathUtils.lerp(0.7, 1.2, Math.random());
    const h = randomHeight();
    inst.scale.set(h, h, h);
    const {x, z} = randomXZ();
    inst.position.set(12 + x, 0, -i * 3 + z);
    scene.add(inst);
  }
  for (let i = -COUNT - 2; i < COUNT + 2; i++) {
    const inst = prefab.clone(true);
    const s = THREE.MathUtils.lerp(0.7, 1.2, Math.random());
    const h = randomHeight();
    inst.scale.set(h, h, h);
    const {x, z} = randomXZ();
    inst.position.set(15 + x, 0, -i * 3 + z);
    scene.add(inst);
  }
  for (let i = -COUNT - 2; i < COUNT + 2; i++) {
    const inst = prefab.clone(true);
    const s = THREE.MathUtils.lerp(0.7, 1.2, Math.random());
    const h = randomHeight();
    inst.scale.set(h, h, h);
    const {x, z} = randomXZ();
    inst.position.set(18 + x, 0, -i * 3 + z);
    scene.add(inst);
  }
});






// Initialize selection manager for object selection and highlighting
const selectionManager = new SelectionManager(scene);

// Initialize camera controller for perspective switching
const cameraController = new CameraController(camera, selectionManager);

// Initialize targeting system for catapult aiming
const targetingSystem = new TargetingSystem(scene, {
    GRID: GRID,
    ROWS: ROWS,
    COLS: COLS,
    gridToWorld: gridToWorld
}, selectionManager);

// Initialize portrait slots on the selection plane (after terrain is created)
const portraitSlots = new PortraitSlots(selectionPlane, camera, scene, terrainMeshes, selectionManager);






// Animation loop
function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();

    // Update selection manager
    selectionManager.update();

    // Update targeting system (pulsing effect)
    targetingSystem.update();

    // Update animated units (includes catapults and their projectiles)
    portraitSlots.update(delta);

    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const tile = GRID[r][c];
            if (tile && typeof tile.update === 'function') {
                tile.update(delta);
            }
        }
    }

    renderer.render(scene, camera);
}


animate();
