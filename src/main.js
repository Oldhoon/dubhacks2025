import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import Terrain from './terrain.js';
import Catapult from './catapult.js';
import Crosshair from './crosshair.js';
import { loadFBXAsync } from './setup.js';

// Configuration constants
const INITIAL_PLANE_SIZE = 1;
const TERRAIN_SEGMENTS = 6;
const CHARACTER_RADIUS = 0.3;
const CHARACTER_HEIGHT = 1;
const CHARACTER_RADIAL_SEGMENTS = 4;
const CHARACTER_HEIGHT_SEGMENTS = 8;
const ROTATION_SPEED = 0.01;
const GRID_ROWS = 6;
const GRID_COLS = 6;
const TILE_TARGET_WORLD_SIZE = 3;
const TILE_SPACING = 3.2;

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb); // Sky blue background

// Orthographic-style view with a slanted perspective to keep the entire grid visible.
const aspect = window.innerWidth / window.innerHeight;
const VIEW_HEIGHT = 45;
const VIEW_WIDTH = VIEW_HEIGHT * aspect;
const camera = new THREE.OrthographicCamera(
    -VIEW_WIDTH / 2,
    VIEW_WIDTH / 2,
    VIEW_HEIGHT / 2,
    -VIEW_HEIGHT / 2,
    0.1,
    200
);

// Position the camera on an isometric angle looking at the center of the grid.
const CAMERA_DISTANCE = 36;
const CAMERA_HEIGHT = 40;
camera.position.set(CAMERA_DISTANCE, CAMERA_HEIGHT, CAMERA_DISTANCE);
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
const planeGeometry = new THREE.PlaneGeometry(INITIAL_PLANE_SIZE, INITIAL_PLANE_SIZE, TERRAIN_SEGMENTS, TERRAIN_SEGMENTS);
const planeMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x8f7764,
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
    const aspectRatio = window.innerWidth / window.innerHeight;
    const viewHeight = VIEW_HEIGHT;
    const viewWidth = viewHeight * aspectRatio;
    camera.left = -viewWidth / 2;
    camera.right = viewWidth / 2;
    camera.top = viewHeight / 2;
    camera.bottom = -viewHeight / 2;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });


const TILE_MODEL_PATH = new URL('../assets/fbx/PP_Meadow_07.fbx', import.meta.url);

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
    prepareFBXObject(tileTemplate);

    const originalBounds = new THREE.Box3().setFromObject(tileTemplate);
    const originalSize = Math.max(
        originalBounds.max.x - originalBounds.min.x,
        originalBounds.max.z - originalBounds.min.z
    ) || 1;

    const scaleFactor = TILE_TARGET_WORLD_SIZE / originalSize;
    tileTemplate.scale.setScalar(scaleFactor);
    tileTemplate.updateMatrixWorld(true);

    const scaledBounds = new THREE.Box3().setFromObject(tileTemplate);
    const tileSizeX = scaledBounds.max.x - scaledBounds.min.x;
    const tileSizeZ = scaledBounds.max.z - scaledBounds.min.z;
    const tileHeight = scaledBounds.max.y - scaledBounds.min.y;
    const tileBaseOffset = -scaledBounds.min.y;

    const gridWidth = (GRID_COLS - 1) * TILE_SPACING + tileSizeX;
    const gridDepth = (GRID_ROWS - 1) * TILE_SPACING + tileSizeZ;
    if (plane.geometry) {
        plane.geometry.dispose();
    }
    plane.geometry = new THREE.PlaneGeometry(gridWidth, gridDepth, TERRAIN_SEGMENTS, TERRAIN_SEGMENTS);

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

    const GRID = Array.from({ length: GRID_ROWS }, () =>
      Array.from({ length: GRID_COLS }, () => createTile())
    );

    const centerRow = Math.floor(GRID_ROWS / 2);
    const centerCol = Math.floor(GRID_COLS / 2);
    const starterTile = GRID[centerRow][centerCol];
    catapult.attachTo(starterTile);

    function gridToWorld(col, row) {
      const offsetX = (GRID_COLS - 1) * 0.5;
      const offsetZ = (GRID_ROWS - 1) * 0.5;
      return {
        x: (col - offsetX) * TILE_SPACING,
        z: (row - offsetZ) * TILE_SPACING,
      };
    }

    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        const tile = GRID[r][c];
        const { x, z } = gridToWorld(c, r);
        const obj = tile.mesh;
        obj.position.x = x;
        obj.position.z = z;
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
