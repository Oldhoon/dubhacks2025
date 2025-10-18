import * as THREE from 'three';

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

// Isometric camera setup
const aspect = window.innerWidth / window.innerHeight;
const frustumSize = 10;
const camera = new THREE.OrthographicCamera(
    frustumSize * aspect / -2,
    frustumSize * aspect / 2,
    frustumSize / 2,
    frustumSize / -2,
    0.1,
    1000
);

// Position camera for isometric view (45 degrees horizontal, ~35 degrees vertical)
camera.position.set(10, 10, 10);
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

// Handle window resize
window.addEventListener('resize', () => {
    const aspect = window.innerWidth / window.innerHeight;
    camera.left = frustumSize * aspect / -2;
    camera.right = frustumSize * aspect / 2;
    camera.top = frustumSize / 2;
    camera.bottom = frustumSize / -2;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    // Simple character rotation animation for demonstration
    character.rotation.y += ROTATION_SPEED;
    
    renderer.render(scene, camera);
}

animate();
