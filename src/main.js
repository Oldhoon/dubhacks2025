import * as THREE from 'three';
import Terrain from './terrain.js';
import Catapult from './catapult.js';
import Crosshair from './crosshair.js';

// Configuration constants
const TERRAIN_SIZE = 20;
const TERRAIN_SEGMENTS = 10;

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
camera.position.set(0, 20, 15);  // angle downward
camera.lookAt(0, 0, 0);
scene.add(camera);

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
plane.position.y = -0.05; // Slightly below tiles to avoid z-fighting
plane.receiveShadow = true;
scene.add(plane);


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
const GRASS_ATLAS = { columns: 2, rows: 2, randomize: true, randomRotate: true };
const createGrassTile = () => new Terrain(3, 0x3a9d3a, GRASS_TEXTURE_PATH, undefined, GRASS_ATLAS);
const starterTile = createGrassTile();
const catapult = new Catapult();
catapult.attachTo(starterTile);
const crosshair = new Crosshair();
crosshair.attachTo(camera);


// Grid definition with textured tiles
const GRID_ROWS = 5;
const GRID_COLS = 5;
const GRID = Array.from({ length: GRID_ROWS }, () =>
  Array.from({ length: GRID_COLS }, () => createGrassTile())
);
GRID[2][0] = starterTile; // maintain the catapult's ground tile



// --- grid constants
const TILE_SIZE = 3;         // tile size in world units
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

// Build / place tiles
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
  }
}









// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    renderer.render(scene, camera);
}

animate();
