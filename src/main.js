import * as THREE from 'three';
import Terrain from './terrain.js';
import Catapult from './catapult.js';
import Crosshair from './crosshair.js';

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
// const terrainBlock = new Terrain();
// terrainBlock.addToScene(scene);

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

// Raycaster and mouse for tile interaction
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let hoveredTile = null;
const clickedTiles = new Set(); // Store tiles that have been clicked

// Color constants for interactions
const HOVER_COLOR = 0xffff00; // Yellow for hover
const CLICK_COLOR = 0xff0000;  // Red for clicked tiles

// Map for efficient tile lookup from mesh
const meshToTileMap = new Map();
const tileMeshes = [];


// Grass tiles across the entire grid
const GRASS_TEXTURE_PATH = 'assets/tiles/Texture/TX Tileset Grass.png';
const createGrassTile = () => new Terrain(3, 0x3a9d3a, GRASS_TEXTURE_PATH);
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
const TILE_SIZE = 3;         // spacing in world units
const ROWS = GRID.length;
const COLS = GRID[0].length;

function gridToWorld(col, row) {
  const offsetX = (COLS - 1) * 0.5;
  const offsetZ = (ROWS - 1) * 0.5;
  return {
    x: (col - offsetX) * TILE_SIZE,
    z: (row - offsetZ) * TILE_SIZE,
  };
}

// Build / place tiles
for (let r = 0; r < ROWS; r++) {
  for (let c = 0; c < COLS; c++) {
    let tile = GRID[r][c];
    if (!(tile instanceof Terrain)) {
      tile = new Terrain();
      GRID[r][c] = tile;
    }

    const { x, z } = gridToWorld(c, r);
    const obj = tile.mesh;

    // set world X/Z (Y already handled by Terrain)
    obj.position.x = x;
    obj.position.z = z;

    // Store original color for each tile
    tile.originalColor = tile.color;
    tile.isClicked = false;

    // Add to tile mesh array and map for raycasting
    tileMeshes.push(obj);
    meshToTileMap.set(obj, tile);

    // add once
    scene.add(obj);
  }
}









// Mouse move event for hover effect
window.addEventListener('mousemove', (event) => {
    // Calculate mouse position in normalized device coordinates (-1 to +1)
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Update raycaster
    raycaster.setFromCamera(mouse, camera);

    // Check for intersections
    const intersects = raycaster.intersectObjects(tileMeshes, false);

    // Reset previous hover if exists and not clicked
    if (hoveredTile && !hoveredTile.isClicked) {
        hoveredTile.setColor(hoveredTile.originalColor);
    }

    // Set new hover
    if (intersects.length > 0) {
        const intersectedMesh = intersects[0].object;
        const tile = meshToTileMap.get(intersectedMesh);
        
        if (tile) {
            hoveredTile = tile;
            // Only change color if not clicked
            if (!tile.isClicked) {
                tile.setColor(HOVER_COLOR);
            }
        }
    } else {
        hoveredTile = null;
    }
});

// Mouse click event for permanent color change
window.addEventListener('click', (event) => {
    // Calculate mouse position
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Update raycaster
    raycaster.setFromCamera(mouse, camera);

    // Check for intersections
    const intersects = raycaster.intersectObjects(tileMeshes, false);

    if (intersects.length > 0) {
        const intersectedMesh = intersects[0].object;
        const tile = meshToTileMap.get(intersectedMesh);
        
        if (tile) {
            tile.isClicked = true;
            tile.setColor(CLICK_COLOR);
            clickedTiles.add(tile);
        }
    }
});

// Keyboard event for reset (press 'R' key)
window.addEventListener('keydown', (event) => {
    if (event.key === 'r' || event.key === 'R') {
        // Reset all clicked tiles
        clickedTiles.forEach(tile => {
            tile.isClicked = false;
            tile.setColor(tile.originalColor);
        });
        clickedTiles.clear();
        
        // Also reset hovered tile if it exists
        if (hoveredTile && !hoveredTile.isClicked) {
            hoveredTile.setColor(hoveredTile.originalColor);
        }
    }
});

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    // Simple character rotation animation for demonstration
    character.rotation.y += ROTATION_SPEED;
    
    renderer.render(scene, camera);
}

animate();
