import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import Terrain from './terrain.js';
import Catapult from './catapult.js';
import Crosshair from './crosshair.js';
import { loadFBXAsync } from './setup.js';

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
renderer.physicallyCorrectLights = true;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
const container = document.getElementById('game-container');
if (!container) {
    throw new Error('Game container element with ID "game-container" not found');
}
container.appendChild(renderer.domElement);

const pmremGenerator = new THREE.PMREMGenerator(renderer);
const environmentTexture = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environment = environmentTexture;
pmremGenerator.dispose();

// Lighting setup
const hemiLight = new THREE.HemisphereLight(0xffffff, 0x222222, 0.35);
scene.add(hemiLight);

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
const planeMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x3a9d3a,
    roughness: 0.85,
    metalness: 0.05
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
const characterMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xff6b6b,
    roughness: 0.4,
    metalness: 0.2
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


const TILE_MODEL_PATH = new URL('../assets/fbx/PP_Meadow_07.fbx', import.meta.url);
const TILE_DEFAULT_SCALE = 0.01;

function ensureStandardMaterial(material) {
    if (Array.isArray(material)) {
        return material.map(ensureStandardMaterial);
    }
    if (!material) {
        return material;
    }
    if (!material.isMeshStandardMaterial) {
        const converted = new THREE.MeshStandardMaterial({
            color: material.color ? material.color.clone() : new THREE.Color(0xffffff),
            map: material.map ?? null,
            normalMap: material.normalMap ?? null,
            roughness: 0.7,
            metalness: 0.1
        });
        if (converted.map) {
            converted.map.colorSpace = THREE.SRGBColorSpace;
            converted.map.flipY = false;
        }
        converted.name = material.name;
        converted.needsUpdate = true;
        return converted;
    }
    if (material.map) {
        material.map.colorSpace = THREE.SRGBColorSpace;
        material.map.flipY = false;
    }
    material.envMapIntensity = 1.0;
    material.needsUpdate = true;
    return material;
}

function prepareFBXObject(object3d) {
    object3d.traverse((child) => {
        if (child.isMesh) {
            child.material = ensureStandardMaterial(child.material);
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });
}

const catapult = new Catapult();
const crosshair = new Crosshair();
crosshair.attachTo(camera);

async function initializeTiles() {
    const [tileTemplate] = await loadFBXAsync([TILE_MODEL_PATH.href]);
    tileTemplate.scale.setScalar(TILE_DEFAULT_SCALE);
    prepareFBXObject(tileTemplate);
    const tileBounds = new THREE.Box3().setFromObject(tileTemplate);
    const tileHeight = tileBounds.max.y - tileBounds.min.y;
    const tileBaseOffset = -tileBounds.min.y;
    const tileWorldSize = Math.max(tileBounds.max.x - tileBounds.min.x, tileBounds.max.z - tileBounds.min.z) || 3;

    const createTileMeshInstance = () => {
        const clone = tileTemplate.clone(true);
        clone.traverse((child) => {
            if (child.isMesh) {
                if (Array.isArray(child.material)) {
                    child.material = child.material.map((mat) => ensureStandardMaterial(mat.clone()));
                } else if (child.material) {
                    child.material = ensureStandardMaterial(child.material.clone());
                }
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
        clone.position.y += tileBaseOffset;
        return clone;
    };

    const createTile = () => new Terrain({
        depth: tileHeight,
        meshFactory: createTileMeshInstance
    });

    const starterTile = createTile();

    // Grid definition using FBX tiles
    const GRID_ROWS = 5;
    const GRID_COLS = 5;
    const GRID = Array.from({ length: GRID_ROWS }, () =>
      Array.from({ length: GRID_COLS }, () => createTile())
    );
    GRID[2][0] = starterTile; // maintain the catapult's ground tile

    catapult.attachTo(starterTile);

    const ROWS = GRID.length;
    const COLS = GRID[0].length;

    function gridToWorld(col, row) {
      const offsetX = (COLS - 1) * 0.5;
      const offsetZ = (ROWS - 1) * 0.5;
      return {
        x: (col - offsetX) * tileWorldSize,
        z: (row - offsetZ) * tileWorldSize,
      };
    }

    // Build / place tiles
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        let tile = GRID[r][c];
        if (!(tile instanceof Terrain)) {
          tile = createTile();
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
}

initializeTiles().catch((error) => {
    console.error('Failed to initialize FBX tiles:', error);
});









// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    // Simple character rotation animation for demonstration
    character.rotation.y += ROTATION_SPEED;
    
    renderer.render(scene, camera);
}

animate();
