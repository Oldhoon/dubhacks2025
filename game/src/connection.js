import * as THREE from 'three';

/**
 * Connection - Visual representation of a pointer from catapult to tile
 * Renders as a glowing laser beam stretching between two targets
 */
export default class Connection {
    constructor(scene, startObject, endObject, options = {}) {
        this.scene = scene;
        this.startObject = startObject;
        this.endObject = endObject;

        // Visual properties
        this.color = options.color ?? 0x00ffff;
        this.radius = options.radius ?? 0.1;
        this.glowIntensity = options.glowIntensity ?? 1.5;
        this.opacity = options.opacity ?? 0.8;

        // Laser shader uniforms and animation time
        this.uniforms = {
            color: { value: new THREE.Color(this.color) },
            time: { value: 0 },
            opacity: { value: this.opacity },
            glowIntensity: { value: this.glowIntensity }
        };
        this.elapsedTime = 0;

        // Connection mesh
        this.mesh = null;
        this.glowMesh = null;
        this.group = new THREE.Group();
        this.group.name = 'ConnectionGroup';

        this.createConnection();
        this.scene.add(this.group);
    }

    /**
     * Create the laser beam connection
     */
    createConnection() {
        const start = new THREE.Vector3();
        const end = new THREE.Vector3();
        this.updatePositions(start, end);

        const distance = start.distanceTo(end);
        const midpoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);

        // Core beam geometry and shader material
        const coreRadius = this.radius * 0.35;
        const coreGeometry = new THREE.CylinderGeometry(coreRadius, coreRadius, distance, 32, 1, true);
        const coreMaterial = this._buildLaserMaterial();

        this.mesh = new THREE.Mesh(coreGeometry, coreMaterial);
        this.mesh.renderOrder = 10;

        // Halo layer for a softer glow falloff
        const glowRadius = this.radius * 1.4;
        const glowGeometry = new THREE.CylinderGeometry(glowRadius, glowRadius, distance, 24, 1, true);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: this.color,
            transparent: true,
            opacity: this.opacity * 0.35,
            side: THREE.DoubleSide,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });

        this.glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
        this.glowMesh.renderOrder = 9;

        this.mesh.position.copy(midpoint);
        this.glowMesh.position.copy(midpoint);
        this._orientMeshes(start, end);

        this.group.add(this.mesh);
        this.group.add(this.glowMesh);
    }

    /**
     * Build the shader material used for the laser core
     * The shader renders a hot center with animated streaks that scroll along the beam
     */
    _buildLaserMaterial() {
        return new THREE.ShaderMaterial({
            uniforms: this.uniforms,
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 color;
                uniform float time;
                uniform float opacity;
                uniform float glowIntensity;
                varying vec2 vUv;

                float peak(float x) {
                    return pow(1.0 - clamp(x, 0.0, 1.0), 3.0);
                }

                void main() {
                    float radial = abs(vUv.x - 0.5) * 2.0;
                    float core = peak(radial);
                    float pulse = 0.6 + 0.4 * sin(time * 6.0 + vUv.y * 18.0);
                    float streaks = 0.35 + 0.65 * sin(vUv.y * 24.0 - time * 20.0);
                    float intensity = core * (1.2 + pulse * 0.8) + streaks * 0.25;

                    vec3 finalColor = color * intensity * glowIntensity;
                    float finalAlpha = clamp(intensity * opacity, 0.0, 1.0);

                    if (finalAlpha < 0.01) discard;
                    gl_FragColor = vec4(finalColor, finalAlpha);
                }
            `,
            blending: THREE.AdditiveBlending,
            transparent: true,
            depthWrite: false,
            side: THREE.DoubleSide
        });
    }

    /**
     * Orient both meshes so the laser points from start to end
     */
    _orientMeshes(start, end) {
        const orientation = new THREE.Matrix4();
        orientation.lookAt(start, end, new THREE.Object3D().up);
        orientation.multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2));

        if (this.mesh) {
            this.mesh.setRotationFromMatrix(orientation);
        }
        if (this.glowMesh) {
            this.glowMesh.setRotationFromMatrix(orientation);
        }
    }

    /**
     * Get world positions from objects
     */
    updatePositions(startVec, endVec) {
        this.startObject.updateMatrixWorld(true);
        this.startObject.getWorldPosition(startVec);
        startVec.y += 0.5; // Offset slightly up

        this.endObject.updateMatrixWorld(true);
        this.endObject.getWorldPosition(endVec);

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

        const start = new THREE.Vector3();
        const end = new THREE.Vector3();
        this.updatePositions(start, end);

        const distance = start.distanceTo(end);
        const midpoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);

        const meshHeight = this.mesh.geometry.parameters.height || 1;
        const glowHeight = this.glowMesh.geometry.parameters.height || 1;
        this.mesh.scale.y = distance / meshHeight;
        this.glowMesh.scale.y = distance / glowHeight;

        this.mesh.position.copy(midpoint);
        this.glowMesh.position.copy(midpoint);
        this._orientMeshes(start, end);
    }

    /**
     * Animate the laser effect
     */
    animate(deltaTime) {
        if (!this.mesh) return;

        this.elapsedTime += deltaTime;
        this.uniforms.time.value = this.elapsedTime;

        const pulse = 0.85 + Math.sin(this.elapsedTime * 3.0) * 0.15;
        if (this.glowMesh && this.glowMesh.material) {
            this.glowMesh.material.opacity = this.opacity * 0.35 * pulse;
            this.glowMesh.scale.x = pulse;
            this.glowMesh.scale.z = pulse;
        }
    }

    /**
     * Change the connection color
     */
    setColor(color) {
        this.color = color;
        this.uniforms.color.value.setHex(color);

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
