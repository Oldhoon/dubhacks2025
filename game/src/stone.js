import * as THREE from 'three';
import { loadGLTFAsync } from './setup.js';

/**
 * Stone projectile fired by the catapult.
 * The projectile follows a deterministic parabolic curve that matches the drawn preview line.
 */
export default class Stone {
    constructor(scene, startPosition, targetPosition, options = {}) {
        this.scene = scene;
        this.startPosition = startPosition.clone();
        this.targetPosition = targetPosition.clone();

        // Arc configuration
        this.rotationSpeed = options.rotationSpeed ?? 5;
        this.flightDuration = options.flightDuration ?? 1.4;
        this.baseArcHeight = options.baseArcHeight ?? 2.5;
        this.arcHeight = this.baseArcHeight;
        this.curveSamples = options.curveSamples ?? 48;
        // Offset the final landing position slightly to the right to better align with visuals
        this.landingOffset = options.landingOffset
            ? options.landingOffset.clone()
            : new THREE.Vector3(0.5, 0, 0);

        // Visual scale
        this.radius = options.radius ?? 0.3;
        this.scale = options.scale ?? 0.5;

        // Runtime state
        this.position = this.startPosition.clone();
        this.isActive = false;
        this.hasLanded = false;
        this.elapsedTime = 0;

        this.curve = null;
        this.curvePoints = [];
        this.tempPosition = new THREE.Vector3();
        this.effectiveTargetPosition = new THREE.Vector3();

        // Scene objects
        this.mesh = new THREE.Group();
        this.mesh.position.copy(this.startPosition);
        this.mesh.visible = false;
        this.scene.add(this.mesh);

        this.trajectoryLine = null;

        this.loadRockModel();
        this.createTrajectoryLine();
        this.updateTrajectory();
    }

    /**
     * Loads the GLB rock mesh, keeping a placeholder until ready.
     */
    loadRockModel() {
        const tempGeometry = new THREE.SphereGeometry(this.radius, 8, 8);
        const tempMaterial = new THREE.MeshStandardMaterial({
            color: 0x666666,
            roughness: 0.9,
            metalness: 0.1,
            flatShading: true
        });
        const placeholder = new THREE.Mesh(tempGeometry, tempMaterial);
        placeholder.name = 'temp_rock';
        placeholder.castShadow = true;
        this.mesh.add(placeholder);

        loadGLTFAsync(['assets/rock/rock.glb'], (models) => {
            const rockModel = models[0].scene;
            rockModel.scale.set(this.scale, this.scale, this.scale);
            rockModel.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = false;
                }
            });

            const temp = this.mesh.getObjectByName('temp_rock');
            if (temp) {
                temp.geometry.dispose();
                temp.material.dispose();
                this.mesh.remove(temp);
            }

            this.mesh.add(rockModel);
        });
    }

    /**
     * Sets up the trajectory line object (geometry populated later).
     */
    createTrajectoryLine() {
        const geometry = new THREE.BufferGeometry();
        const material = new THREE.LineBasicMaterial({
            color: 0xff0000,
            opacity: 0.6,
            transparent: true
        });

        this.trajectoryLine = new THREE.Line(geometry, material);
        this.trajectoryLine.visible = false;
        this.scene.add(this.trajectoryLine);
    }

    /**
     * Updates the start/target world positions.
     */
    setEndpoints(start, target) {
        this.startPosition.copy(start);
        this.targetPosition.copy(target);
        this.mesh.position.copy(this.startPosition);
    }

    /**
     * Compute a quadratic Bezier arc between start and target.
     */
    updateTrajectory({ arcHeight, flightDuration } = {}) {
        const effectiveTarget = this.targetPosition.clone().add(this.landingOffset);
        this.effectiveTargetPosition.copy(effectiveTarget);

        this.arcHeight = arcHeight ?? this.computeArcHeight(this.startPosition, effectiveTarget);
        if (typeof flightDuration === 'number') {
            this.flightDuration = Math.max(0.1, flightDuration);
        }

        const controlPoint = this.startPosition.clone().lerp(effectiveTarget, 0.5);
        controlPoint.y = Math.max(this.startPosition.y, effectiveTarget.y) + this.arcHeight;

        this.curve = new THREE.QuadraticBezierCurve3(
            this.startPosition.clone(),
            controlPoint,
            effectiveTarget.clone()
        );

        this.curvePoints = this.curve.getPoints(this.curveSamples);
        if (this.trajectoryLine) {
            this.trajectoryLine.geometry.dispose();
            this.trajectoryLine.geometry = new THREE.BufferGeometry().setFromPoints(this.curvePoints);
        }
    }

    /**
     * Choose an arc height based on horizontal separation.
     */
    computeArcHeight(start, end) {
        const horizontalDist = Math.hypot(end.x - start.x, end.z - start.z);
        const scaled = horizontalDist * 0.35;
        return Math.max(this.baseArcHeight, scaled);
    }

    showTrajectory() {
        if (this.trajectoryLine) {
            this.trajectoryLine.visible = true;
        }
    }

    hideTrajectory() {
        if (this.trajectoryLine) {
            this.trajectoryLine.visible = false;
        }
    }

    /**
     * Adjust the landing offset and recompute the trajectory.
     */
    setLandingOffset(offset) {
        this.landingOffset.copy(offset);
        this.updateTrajectory();
    }

    /**
     * Fires the stone along the current curve.
     */
    fire(options = {}) {
        if (options.startPosition || options.targetPosition) {
            const start = options.startPosition ?? this.startPosition;
            const target = options.targetPosition ?? this.targetPosition;
            this.setEndpoints(start, target);
        }

        if (options.landingOffset) {
            this.landingOffset.copy(options.landingOffset);
        }

        this.updateTrajectory({
            arcHeight: options.arcHeight,
            flightDuration: options.flightDuration
        });

        if (!this.curve) {
            return;
        }

        this.elapsedTime = 0;
        this.position.copy(this.startPosition);
        this.mesh.position.copy(this.startPosition);
        this.mesh.visible = true;
        this.isActive = true;
        this.hasLanded = false;

<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> cfb30bb (cylinder)
        // Only show trajectory if explicitly requested (default: false when firing)
        if (options.showTrajectory !== false) {
            this.showTrajectory();
            setTimeout(() => this.hideTrajectory(), 500);
        }
<<<<<<< HEAD
=======
        this.showTrajectory();
        setTimeout(() => this.hideTrajectory(), 500);
>>>>>>> 954e161 (Added images and better card selection mechanics)
=======
>>>>>>> cfb30bb (cylinder)
    }

    /**
     * Frame update – advances along the curve.
     */
    update(deltaTime) {
        if (!this.isActive || this.hasLanded || !this.curve) {
            return;
        }

        this.elapsedTime += deltaTime;
        const t = Math.min(this.elapsedTime / this.flightDuration, 1);

        this.curve.getPoint(t, this.tempPosition);
        this.mesh.position.copy(this.tempPosition);
        this.position.copy(this.tempPosition);

        // Spin for visual interest
        this.mesh.rotation.x += this.rotationSpeed * deltaTime;
        this.mesh.rotation.z += this.rotationSpeed * deltaTime;

        if (t >= 1) {
            this.land();
        }
    }

    /**
     * Finalize the projectile at the destination.
     */
    land() {
        this.hasLanded = true;
        this.isActive = false;
        this.position.copy(this.effectiveTargetPosition);
        this.mesh.position.copy(this.effectiveTargetPosition);

        console.log('Stone landed at:', this.position);

        setTimeout(() => {
            this.mesh.visible = false;
        }, 2000);
    }

    isInFlight() {
        return this.isActive && !this.hasLanded;
    }

    dispose() {
        if (this.mesh) {
            this.mesh.traverse((child) => {
                if (child.isMesh) {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(mat => mat.dispose());
                        } else {
                            child.material.dispose();
                        }
                    }
                }
            });
            this.scene.remove(this.mesh);
        }

        if (this.trajectoryLine) {
            this.trajectoryLine.geometry.dispose();
            this.trajectoryLine.material.dispose();
            this.scene.remove(this.trajectoryLine);
        }
    }
}
