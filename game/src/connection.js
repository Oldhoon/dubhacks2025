import * as THREE from 'three';

/**
 * Connection - Visual representation of a pointer from catapult to tile
 * Displays as a glowing cylinder connecting the two points
 */
export default class Connection {
    constructor(scene, startObject, endObject, options = {}) {
        this.scene = scene;
        this.startObject = startObject;
        this.endObject = endObject;

        // Visual properties
        this.color = options.color ?? 0x00ffff; // Cyan glow
        this.radius = options.radius ?? 0.1;
        this.glowIntensity = options.glowIntensity ?? 1.5;
        this.opacity = options.opacity ?? 0.8;

        // Connection mesh
        this.mesh = null;
        this.glowMesh = null;
        this.group = new THREE.Group();
        this.group.name = 'ConnectionGroup';

        this.createConnection();
        this.scene.add(this.group);
    }

    /**
     * Create the glowing cylinder connection
     */
    createConnection() {
        // Get positions
        const start = new THREE.Vector3();
        const end = new THREE.Vector3();
        this.updatePositions(start, end);

        // Calculate distance and midpoint
        const distance = start.distanceTo(end);
        const midpoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);

        // Create cylinder geometry
        const geometry = new THREE.CylinderGeometry(this.radius, this.radius, distance, 8, 1);

        // Core cylinder material
        const material = new THREE.MeshStandardMaterial({
            color: this.color,
            emissive: this.color,
            emissiveIntensity: this.glowIntensity,
            transparent: true,
            opacity: this.opacity,
            metalness: 0.3,
            roughness: 0.2
        });

        this.mesh = new THREE.Mesh(geometry, material);

        // Outer glow layer
        const glowGeometry = new THREE.CylinderGeometry(
            this.radius * 1.5,
            this.radius * 1.5,
            distance,
            8,
            1
        );
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: this.color,
            transparent: true,
            opacity: this.opacity * 0.3,
            side: THREE.BackSide
        });

        this.glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);

        // Position and orient the cylinder
        this.mesh.position.copy(midpoint);
        this.glowMesh.position.copy(midpoint);

        // Rotate cylinder to point from start to end
        const direction = new THREE.Vector3().subVectors(end, start);
        const orientation = new THREE.Matrix4();
        orientation.lookAt(start, end, new THREE.Object3D().up);
        orientation.multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2));
        this.mesh.setRotationFromMatrix(orientation);
        this.glowMesh.setRotationFromMatrix(orientation);

        this.group.add(this.mesh);
        this.group.add(this.glowMesh);
    }

    /**
     * Get world positions from objects
     */
    updatePositions(startVec, endVec) {
        // Get start position (catapult)
        this.startObject.updateMatrixWorld(true);
        this.startObject.getWorldPosition(startVec);
        startVec.y += 0.5; // Offset slightly up

        // Get end position (tile center top)
        this.endObject.updateMatrixWorld(true);
        this.endObject.getWorldPosition(endVec);

        // Add tile depth to get top surface
        const tileData = this.endObject.userData?.terrain;
        if (tileData && typeof tileData.depth === 'number') {
            endVec.y += tileData.depth * 0.5;
        }
    }

    /**
     * Update the connection when objects move
     */
    update() {
        if (!this.mesh || !this.glowMesh) return;

        // Get updated positions
        const start = new THREE.Vector3();
        const end = new THREE.Vector3();
        this.updatePositions(start, end);

        // Calculate new distance and midpoint
        const distance = start.distanceTo(end);
        const midpoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);

        // Update scale (length)
        this.mesh.scale.y = distance / this.mesh.geometry.parameters.height;
        this.glowMesh.scale.y = distance / this.glowMesh.geometry.parameters.height;

        // Update position
        this.mesh.position.copy(midpoint);
        this.glowMesh.position.copy(midpoint);

        // Update rotation
        const direction = new THREE.Vector3().subVectors(end, start);
        const orientation = new THREE.Matrix4();
        orientation.lookAt(start, end, new THREE.Object3D().up);
        orientation.multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2));
        this.mesh.setRotationFromMatrix(orientation);
        this.glowMesh.setRotationFromMatrix(orientation);
    }

    /**
     * Animate the glow effect
     */
    animate(deltaTime) {
        if (!this.mesh) return;

        // Pulse the emissive intensity
        const time = Date.now() * 0.001;
        const pulse = Math.sin(time * 2) * 0.3 + 1.0;
        this.mesh.material.emissiveIntensity = this.glowIntensity * pulse;

        // Slightly pulse the glow opacity
        this.glowMesh.material.opacity = (this.opacity * 0.3) * (0.8 + Math.sin(time * 3) * 0.2);
    }

    /**
     * Change the connection color
     */
    setColor(color) {
        this.color = color;
        if (this.mesh) {
            this.mesh.material.color.setHex(color);
            this.mesh.material.emissive.setHex(color);
        }
        if (this.glowMesh) {
            this.glowMesh.material.color.setHex(color);
        }
    }

    /**
     * Clean up resources
     */
    dispose() {
        if (this.mesh) {
            this.mesh.geometry.dispose();
            this.mesh.material.dispose();
            this.group.remove(this.mesh);
        }

        if (this.glowMesh) {
            this.glowMesh.geometry.dispose();
            this.glowMesh.material.dispose();
            this.group.remove(this.glowMesh);
        }

        this.scene.remove(this.group);
    }
}
