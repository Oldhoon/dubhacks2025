import * as THREE from 'three';
import Terrain from './terrain.js';
import PortraitSlots from './portraitSlots.js';
import SelectionManager from './selectionManager.js';
import CameraController from './cameraController.js';
import TargetingSystem from './targetingSystem.js';
import { loadGLTFAsync } from './setup.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const TERRAIN_SIZE = 50;
const TERRAIN_SEGMENTS = 10;
const TILE_SIZE = 4.5;
const TILE_GAP = 0.75;
const CODE_UNIT_TYPES = {
    necromancer: 'int',
    mage: 'short',
    lumberjack: 'char'
};
const LETTERS = 'abcdefghijklmnopqrstuvwxyz';
const POINTER_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function computeRendererSize(canvas) {
    const parent = canvas.parentElement;
    const dpr = window.devicePixelRatio ?? 1;
    const width = Math.max(
        1,
        Math.floor((parent?.clientWidth ?? canvas.clientWidth ?? window.innerWidth) || 1)
    );
    const height = Math.max(
        1,
        Math.floor((parent?.clientHeight ?? canvas.clientHeight ?? window.innerHeight) || 1)
    );
    return { width, height, dpr };
}

function createSelectionPlane() {
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
    return selectionPlane;
}

function gridToWorldFactory(rows, cols) {
    const offsetX = (cols - 1) * 0.5;
    const offsetZ = (rows - 1) * 0.5;
    const spacing = TILE_SIZE + TILE_GAP;
    return (col, row) => ({
        x: (col - offsetX) * spacing,
        z: (row - offsetZ) * spacing
    });
}

export function createGameExperience(canvas, options = {}) {
    if (!(canvas instanceof HTMLCanvasElement)) {
        throw new Error('createGameExperience requires a <canvas> element.');
    }

    const { onCodeEvent } = options;

    const emitCodeEvent = (event) => {
        if (typeof onCodeEvent === 'function') {
            onCodeEvent(event);
        }
    };

    const codeBindings = new Map();
    const pointerEntries = new Map(); // catapult -> { pointerName, terrain }
    let nextPointerIndex = 0;
    let nextVarIndex = 0;

    const nextVarName = () => {
        if (nextVarIndex < LETTERS.length) {
            return LETTERS[nextVarIndex++];
        }
        return `v${nextVarIndex++}`;
    };

    const nextPointerName = () => {
        if (nextPointerIndex < POINTER_LETTERS.length) {
            return `ptr${POINTER_LETTERS[nextPointerIndex++]}`;
        }
        return `ptr${nextPointerIndex++}`;
    };

    const getPointerForTerrain = (terrain) => {
        for (const entry of pointerEntries.values()) {
            if (entry.terrain === terrain) {
                return entry;
            }
        }
        return null;
    };

    const resolveTerrainFromMesh = (mesh) => {
        let current = mesh;
        while (current) {
            if (current.userData?.terrain) {
                return current.userData.terrain;
            }
            current = current.parent ?? null;
        }
        return null;
    };

    const emitPointerEventForEntry = (entry) => {
        if (!entry) return;
        const targetBinding = entry.terrain ? codeBindings.get(entry.terrain) : null;
        emitCodeEvent({
            type: 'pointer',
            id: entry.pointerName,
            baseType: targetBinding ? targetBinding.baseType : 'void',
            varName: targetBinding ? targetBinding.varName : '',
            pointerName: entry.pointerName,
            hasTarget: Boolean(targetBinding),
            targetVarName: targetBinding ? targetBinding.varName : undefined
        });
    };

    const updatePointersForTerrain = (terrain) => {
        pointerEntries.forEach((entry) => {
            if (entry.terrain === terrain) {
                emitPointerEventForEntry(entry);
            }
        });
    };

    const handleCatapultFire = (catapult, targetMesh) => {
        let entry = pointerEntries.get(catapult);
        if (!entry) {
            entry = {
                pointerName: nextPointerName(),
                terrain: null
            };
            pointerEntries.set(catapult, entry);
        }

        const terrain = resolveTerrainFromMesh(targetMesh);
        entry.terrain = terrain ?? null;
        emitPointerEventForEntry(entry);
    };

    const registerCatapult = (catapult) => {
        if (typeof catapult.setCodeHooks === 'function') {
            catapult.setCodeHooks({
                onFire: (instance, targetMesh) => handleCatapultFire(instance, targetMesh),
                onDetach: (instance) => {
                    const entry = pointerEntries.get(instance);
                    if (entry) {
                        entry.terrain = null;
                        emitPointerEventForEntry(entry);
                    }
                }
            });
        }
    };

    const handleUnitPlaced = (terrain, unitType) => {
        const baseType = CODE_UNIT_TYPES[unitType];
        if (!baseType) {
            return;
        }

        const existing = codeBindings.get(terrain);
        if (!existing) {
            const varName = nextVarName();
            const binding = { baseType, varName, count: 0 };
            codeBindings.set(terrain, binding);
            emitCodeEvent({
                type: 'declare',
                id: varName,
                baseType,
                varName
            });
        } else if (existing.baseType !== baseType) {
            existing.baseType = baseType;
            existing.count = 0;
            emitCodeEvent({
                type: 'declare',
                id: existing.varName,
                baseType,
                varName: existing.varName
            });
        }

        updatePointersForTerrain(terrain);
    };

    const handleAssetPlaced = (terrain, _assetType) => {
        const binding = codeBindings.get(terrain);
        if (!binding) {
            return;
        }

        binding.count += 1;
        emitCodeEvent({
            type: 'update',
            id: binding.varName,
            baseType: binding.baseType,
            varName: binding.varName,
            count: binding.count
        });

        updatePointersForTerrain(terrain);
    };

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.physicallyCorrectLights = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    camera.position.set(0, 26, 19);
    camera.lookAt(0, 0, 4);
    scene.add(camera);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envMap = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envMap;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
    scene.add(ambientLight);

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

    const planeGeometry = new THREE.PlaneGeometry(
        TERRAIN_SIZE,
        TERRAIN_SIZE - 1,
        TERRAIN_SEGMENTS,
        TERRAIN_SEGMENTS
    );
    const planeMaterial = new THREE.MeshStandardMaterial({
        color: 0x3a9d3a,
        roughness: 1.0,
        metalness: 0.0,
        flatShading: true
    });
    const baseGrassTex = new THREE.TextureLoader().load('assets/tiles/Texture/Base Grass IMG.png');
    baseGrassTex.wrapS = THREE.RepeatWrapping;
    baseGrassTex.wrapT = THREE.RepeatWrapping;
    baseGrassTex.colorSpace = THREE.SRGBColorSpace;
    baseGrassTex.magFilter = THREE.NearestFilter;
    baseGrassTex.minFilter = THREE.NearestFilter;
    baseGrassTex.repeat.set(6, 6);
    planeMaterial.map = baseGrassTex;
    planeMaterial.needsUpdate = true;

    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = -0.05;
    plane.receiveShadow = true;
    scene.add(plane);

    const selectionPlane = createSelectionPlane();
    scene.add(selectionPlane);

    const GRASS_TEXTURE_PATH = 'assets/tiles/Texture/TX Tileset Grass.png';
    const GRASS_ATLAS = { columns: 2, rows: 2, randomize: true, randomRotate: false };
    const createGrassTile = () =>
        new Terrain(
            TILE_SIZE,
            0x3a9d3a,
            GRASS_TEXTURE_PATH,
            undefined,
            GRASS_ATLAS,
            {
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

    const GRID_ROWS = 4;
    const GRID_COLS = 4;
    const GRID = Array.from({ length: GRID_ROWS }, () =>
        Array.from({ length: GRID_COLS }, () => createGrassTile())
    );
    const ROWS = GRID.length;
    const COLS = GRID[0].length;
    const terrainMeshes = [];
    const gridToWorld = gridToWorldFactory(ROWS, COLS);

    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const tile = GRID[r][c];
            if (!tile) continue;
            const { x, z } = gridToWorld(c, r);
            const obj = tile.mesh;
            obj.position.set(x, obj.position.y, z);
            scene.add(obj);
            terrainMeshes.push(obj);
            tile.setCodeHooks({
                onUnitPlaced: handleUnitPlaced,
                onAssetPlaced: handleAssetPlaced,
                getBinding: (t) => codeBindings.get(t) ?? null,
                getPointer: (t) => getPointerForTerrain(t)
            });
        }
    }

    const treeScale = 0.5;
    loadGLTFAsync(['assets/trees/small_tree.glb'], (models) => {
        const prefab = models[0].scene;
        prefab.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        const randomXZ = () => ({
            x: Math.random() * 2 - 1,
            z: Math.random() * 2 - 1
        });

        const randomHeight = () => treeScale * (Math.random() + 5.0) / 6.0;

        const COUNT = 4;
        const scatterBands = [
            (i) => ({ x: i * 3, z: -12 }),
            (i) => ({ x: i * 3, z: -15 }),
            (i) => ({ x: -12, z: -i * 3 }),
            (i) => ({ x: -15, z: -i * 3 }),
            (i) => ({ x: -18, z: -i * 3 }),
            (i) => ({ x: 12, z: -i * 3 }),
            (i) => ({ x: 15, z: -i * 3 }),
            (i) => ({ x: 18, z: -i * 3 })
        ];

        scatterBands.forEach((getBase, bandIndex) => {
            const start = bandIndex < 2 ? -COUNT : -COUNT - 2;
            const end = bandIndex < 2 ? COUNT : COUNT + 2;
            for (let i = start; i < end; i++) {
                const instance = prefab.clone(true);
                const height = randomHeight();
                instance.scale.set(height, height, height);
                const jitter = randomXZ();
                const base = getBase(i);
                instance.position.set(base.x + jitter.x, 0, base.z + jitter.z);
                scene.add(instance);
            }
        });
    });

    const cleanupFns = [];

    const handleResize = () => {
        const { width, height, dpr } = computeRendererSize(canvas);
        renderer.setPixelRatio(dpr);
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
    };

    handleResize();

    const resizeObserver = typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(handleResize)
        : null;
    if (resizeObserver) {
        resizeObserver.observe(canvas);
        cleanupFns.push(() => resizeObserver.disconnect());
    }

    const resizeListener = () => handleResize();
    window.addEventListener('resize', resizeListener);
    cleanupFns.push(() => window.removeEventListener('resize', resizeListener));

    const selectionManager = new SelectionManager(scene);
    const cameraController = new CameraController(camera, selectionManager);
    const targetingSystem = new TargetingSystem(
        scene,
        {
            GRID,
            ROWS,
            COLS,
            gridToWorld
        },
        selectionManager
    );

    const portraitSlots = new PortraitSlots(
        selectionPlane,
        camera,
        scene,
        terrainMeshes,
        selectionManager,
        renderer.domElement,
        {
            onCatapultCreated: registerCatapult
        }
    );

    const clock = new THREE.Clock();
    let disposed = false;
    let animationFrame = 0;

    const animate = () => {
        if (disposed) {
            return;
        }
        animationFrame = requestAnimationFrame(animate);
        const delta = clock.getDelta();

        selectionManager.update();
        targetingSystem.update();
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
    };

    animate();

    const dispose = () => {
        if (disposed) return;
        disposed = true;
        cancelAnimationFrame(animationFrame);
        cleanupFns.forEach((fn) => fn?.());
        portraitSlots.dispose();
        targetingSystem.dispose();
        cameraController.dispose();
        selectionManager.dispose();
        pmremGenerator.dispose();
        renderer.dispose();
        codeBindings.clear();
        pointerEntries.clear();
    };

    return dispose;
}

export default createGameExperience;
