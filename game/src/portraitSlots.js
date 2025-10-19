import * as THREE from 'three';
import Sprite from './sprite.js';
import Catapult from './catapult.js';
import Necromancer from './necromancer.js';
import Mage from './mage.js';
import Lumberjack from './lumberjack.js';

const PORTRAIT_TEXTURE_PATHS = [
    'assets/splash/catapult.png',
    'assets/splash/necromancer.png',
    'assets/splash/mage.png',
    'assets/splash/lumberjack.png'
];

/**
 * PortraitSlots - Manages draggable portrait slots on the selection plane
 */
class PortraitSlots {
    constructor(selectionPlane, camera, scene, terrainMeshes = [], selectionManager = null) {
        this.selectionPlane = selectionPlane;
        this.camera = camera;
        this.scene = scene;
        this.terrainMeshes = terrainMeshes;
        this.selectionManager = selectionManager;
        this.slots = [];
        this.portraits = [];
        this.dragging = null;
        this.dragPlane = new THREE.Plane();
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.offset = new THREE.Vector3();

        this.textureLoader = new THREE.TextureLoader();
        this.portraitTextures = PORTRAIT_TEXTURE_PATHS.map((path) => this.loadPortraitTexture(path));

        this.SLOT_SIZE = 4.3;
        this.SLOT_SPACING = 0.4;
        this.NORMAL_OPACITY = 0.9;
        this.DRAG_OPACITY = 0.4;

        this.spawnedSprites = []; // Track sprites spawned on terrain
        this.spawnedUnitsByType = {
            catapult: [],
            necromancer: [],
            mage: [],
            lumberjack: []
        }; // Track 3D units spawned on terrain

        this.createSlots();
        this.setupEventListeners();
    }

    /**
     * Create 4 portrait slots positioned on the selection plane
     */
    createSlots() {
        const totalWidth = (this.SLOT_SIZE * 4) + (this.SLOT_SPACING * 3);
        const startX = -totalWidth / 2 + this.SLOT_SIZE / 2;

        for (let i = 0; i < 4; i++) {
            // Create slot background (darker square)
            const slotGeometry = new THREE.PlaneGeometry(this.SLOT_SIZE, this.SLOT_SIZE);
            const slotMaterial = new THREE.MeshBasicMaterial({
                color: 0x555555,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.6
            });
            const slot = new THREE.Mesh(slotGeometry, slotMaterial);

            // Position slot on the selection plane
            const xPos = startX + i * (this.SLOT_SIZE + this.SLOT_SPACING);
            slot.position.set(xPos, 0, 0);
            slot.position.applyEuler(this.selectionPlane.rotation);

            // Add to selection plane as parent
            this.selectionPlane.add(slot);
            this.slots.push(slot);

            // Create portrait placeholder (colorful geometry)
            const portraitGeometry = new THREE.PlaneGeometry(this.SLOT_SIZE * 0.8, this.SLOT_SIZE * 0.8);
            const portraitMaterial = new THREE.MeshBasicMaterial({
                map: this.getPortraitTexture(i),
                color: 0xffffff,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: this.NORMAL_OPACITY
            });
            const portrait = new THREE.Mesh(portraitGeometry, portraitMaterial);

            // Position portrait slightly above slot
            portrait.position.set(xPos, 0, 0.06);
            portrait.position.applyEuler(this.selectionPlane.rotation);

            portrait.userData = {
                slotIndex: i,
                homePosition: portrait.position.clone(),
                homeRotation: portrait.rotation.clone()
            };

            this.selectionPlane.add(portrait);
            this.portraits.push(portrait);
        }
    }

    /**
     * Set the terrain meshes that portraits can be dropped on
     */
    setTerrainMeshes(terrainMeshes) {
        this.terrainMeshes = terrainMeshes;
    }

    /**
     * Load a portrait texture and configure basic color space
     */
    loadPortraitTexture(path) {
        const texture = this.textureLoader.load(path);
        texture.colorSpace = THREE.SRGBColorSpace;
        return texture;
    }

    /**
     * Retrieve a portrait texture based on the slot index
     */
    getPortraitTexture(index) {
        return this.portraitTextures[index % this.portraitTextures.length];
    }

    /**
     * Setup mouse event listeners for dragging
     */
    setupEventListeners() {
        const canvas = document.querySelector('canvas');

        canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
        canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
        canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
        canvas.addEventListener('mouseleave', this.onMouseUp.bind(this));
    }

    /**
     * Update mouse coordinates
     */
    updateMouse(event) {
        const canvas = document.querySelector('canvas');
        const rect = canvas.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    }

    /**
     * Handle mouse down - start dragging
     */
    onMouseDown(event) {
        this.updateMouse(event);
        this.raycaster.setFromCamera(this.mouse, this.camera);

        const intersects = this.raycaster.intersectObjects(this.portraits);

        if (intersects.length > 0) {
            this.dragging = intersects[0].object;

            // Get world position of the portrait
            const worldPosition = new THREE.Vector3();
            this.dragging.getWorldPosition(worldPosition);

            // Set up drag plane that matches the selection plane's orientation
            const planeNormal = new THREE.Vector3(0, 1, 0);
            planeNormal.applyQuaternion(this.selectionPlane.quaternion);
            this.dragPlane.setFromNormalAndCoplanarPoint(planeNormal, worldPosition);

            // Calculate offset in world space
            const intersectPoint = new THREE.Vector3();
            this.raycaster.ray.intersectPlane(this.dragPlane, intersectPoint);
            this.offset.copy(intersectPoint).sub(worldPosition);

            // Reduce opacity while dragging
            this.dragging.material.opacity = this.DRAG_OPACITY;
        }
    }

    /**
     * Handle mouse move - update dragged position
     */
    onMouseMove(event) {
        if (!this.dragging) return;

        this.updateMouse(event);
        this.raycaster.setFromCamera(this.mouse, this.camera);

        const intersectPoint = new THREE.Vector3();
        if (this.raycaster.ray.intersectPlane(this.dragPlane, intersectPoint)) {
            // Calculate new world position
            const newWorldPosition = intersectPoint.sub(this.offset);

            // Convert world position to local position relative to selectionPlane
            this.selectionPlane.worldToLocal(newWorldPosition);

            // Update portrait's local position
            this.dragging.position.copy(newWorldPosition);
        }
    }

    /**
     * Handle mouse up - stop dragging and check for terrain drop
     */
    onMouseUp(event) {
        if (this.dragging) {
            // Restore normal opacity
            this.dragging.material.opacity = this.NORMAL_OPACITY;

            // Check if dropped on a terrain tile
            this.updateMouse(event);
            this.raycaster.setFromCamera(this.mouse, this.camera);

            const terrainIntersects = this.raycaster.intersectObjects(this.terrainMeshes, true);

            if (terrainIntersects.length > 0) {
                // Portrait dropped on terrain
                const terrainHit = terrainIntersects[0];
                let terrainTile = terrainHit.object;
                while (terrainTile && !terrainTile.userData?.terrain && terrainTile.parent) {
                    terrainTile = terrainTile.parent;
                }
                const terrainData = terrainTile?.userData?.terrain ?? null;
                if (!terrainData) {
                    console.warn('Unable to identify target terrain tile for this drop.');
                    this.dragging.position.copy(this.dragging.userData.homePosition);
                    this.dragging.rotation.copy(this.dragging.userData.homeRotation);
                    this.dragging = null;
                    return;
                }
                const terrainMesh = terrainData?.mesh ?? terrainTile;
                const portraitIndex = this.dragging.userData.slotIndex;

                // Get the center position of the terrain tile
                const tileWorldPosition = new THREE.Vector3();
                terrainMesh.getWorldPosition(tileWorldPosition);

                // Check if this is the first portrait (catapult)
                const unitData = this.createUnitForPortrait(portraitIndex);

                if (unitData) {
                    const { unit, type } = unitData;
                    const terrainInstance = terrainData;
                    let placementAllowed = true;

                    if (terrainInstance && typeof terrainInstance.canPlaceUnit === 'function') {
                        placementAllowed = terrainInstance.canPlaceUnit(type);
                    }

                    if (!placementAllowed) {
                        console.warn(`Cannot place another ${type} on this tile.`);
                        if (typeof unit.detach === 'function') {
                            unit.detach();
                        }
                    } else {
                        unit.attachTo(terrainTile);

                        let registered = true;
                        if (terrainInstance && typeof terrainInstance.registerUnit === 'function') {
                            registered = terrainInstance.registerUnit(type, unit);
                        }

                        if (!registered) {
                            placementAllowed = false;
                            if (typeof unit.detach === 'function') {
                                unit.detach();
                            }
                        }
                    }

                    if (placementAllowed) {
                        if (!this.spawnedUnitsByType[type]) {
                            this.spawnedUnitsByType[type] = [];
                        }
                        const typeArray = this.spawnedUnitsByType[type];
                        typeArray.push(unit);

                        if (this.selectionManager) {
                            this.selectionManager.addSelectableObject(unit.object3d, {
                                type: type,
                                index: typeArray.length - 1,
                                tile: terrainTile // Pass the tile reference for highlighting
                            });
                        }

                        const label = type.charAt(0).toUpperCase() + type.slice(1);
                        console.log(`${label} spawned from portrait ${portraitIndex} at tile center`, tileWorldPosition);
                    }
                } else {
                    // Create sprite at the center of the tile for other portraits
                    const spritePosition = new THREE.Vector3(
                        tileWorldPosition.x,
                        tileWorldPosition.y + 0.5, // Raised above terrain
                        tileWorldPosition.z
                    );

                    const sprite = new Sprite(portraitIndex, spritePosition);
                    sprite.addToScene(this.scene);

                    // Track the spawned sprite
                    this.spawnedSprites.push(sprite);

                    // Register with selection manager if available
                    if (this.selectionManager) {
                        this.selectionManager.addSelectableObject(sprite.mesh, {
                            type: 'sprite',
                            portraitIndex: portraitIndex,
                            index: this.spawnedSprites.length - 1,
                            tile: terrainMesh // Pass the tile reference for highlighting
                        });
                    }

                    console.log(`Sprite spawned from portrait ${portraitIndex} at tile center`, tileWorldPosition);
                }

                // Portrait returns to home position
                this.dragging.position.copy(this.dragging.userData.homePosition);
                this.dragging.rotation.copy(this.dragging.userData.homeRotation);
            } else {
                // Not on terrain, snap back to home position
                this.dragging.position.copy(this.dragging.userData.homePosition);
                this.dragging.rotation.copy(this.dragging.userData.homeRotation);
            }

            this.dragging = null;
        }
    }

    /**
     * Get all spawned sprites
     */
    getSprites() {
        return this.spawnedSprites;
    }

    /**
     * Cleanup event listeners and resources
     */
    dispose() {
        const canvas = document.querySelector('canvas');
        canvas.removeEventListener('mousedown', this.onMouseDown);
        canvas.removeEventListener('mousemove', this.onMouseMove);
        canvas.removeEventListener('mouseup', this.onMouseUp);
        canvas.removeEventListener('mouseleave', this.onMouseUp);

        // Dispose geometries and materials
        this.slots.forEach(slot => {
            slot.geometry.dispose();
            slot.material.dispose();
        });

        this.portraits.forEach(portrait => {
            portrait.geometry.dispose();
            portrait.material.dispose();
        });

        // Dispose spawned sprites
        this.spawnedSprites.forEach(sprite => {
            sprite.removeFromScene(this.scene);
            sprite.dispose();
        });

        // Detach spawned 3D units
        Object.values(this.spawnedUnitsByType).forEach(units => {
            units.forEach(unit => unit.detach());
        });
    }

    /**
     * Update animations for spawned 3D units
     */
    update(delta) {
        if (typeof delta !== 'number') return;

        Object.values(this.spawnedUnitsByType).forEach(units => {
            units.forEach(unit => {
                if (typeof unit.update === 'function') {
                    unit.update(delta);
                }
            });
        });
    }

    /**
     * Create the appropriate unit for the given portrait index
     */
    createUnitForPortrait(portraitIndex) {
        switch (portraitIndex) {
            case 0:
                return { unit: new Catapult(), type: 'catapult' };
            case 1:
                return { unit: new Necromancer(), type: 'necromancer' };
            case 2:
                return { unit: new Mage(), type: 'mage' };
            case 3:
                return { unit: new Lumberjack(), type: 'lumberjack' };
            default:
                return null;
        }
    }
}

export default PortraitSlots;
