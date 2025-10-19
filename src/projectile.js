import * as THREE from 'three';
import { loadGLTFAsync } from './setup.js';

/**
 * Projectile - Represents a physics-based projectile (rock) fired from a catapult
 * Follows a parabolic trajectory in world space
 */
class Projectile {
    constructor(scene, startPosition, targetPosition, options = {}) {
        this.scene = scene;
        this.startPosition = new THREE.Vector3().copy(startPosition);
        this.targetPosition = new THREE.Vector3().copy(targetPosition);
        
        // Physics parameters
        this.gravity = options.gravity || 9.8;
        this.launchAngle = options.launchAngle || 45; // degrees
        this.travelTime = 0;
        this.flightDuration = 0;
        this.active = false;
        
        // Visual elements
        this.mesh = null;
        this.trajectoryLine = null;
        
        // Model path
        this.modelPath = options.modelPath || 'assets/rock/rock.glb';
        this.scale = options.scale || 0.1;
        
        this.calculateTrajectory();
        this.loadModel();
        this.createTrajectoryLine();
    }
    
    /**
     * Calculate parabolic trajectory parameters in world space
     */
    calculateTrajectory() {
        // Calculate displacement vector in world space
        const dx = this.targetPosition.x - this.startPosition.x;
        const dy = this.targetPosition.y - this.startPosition.y;
        const dz = this.targetPosition.z - this.startPosition.z;
        
        // Horizontal distance (XZ plane)
        const horizontalDistance = Math.sqrt(dx * dx + dz * dz);
        
        // Convert launch angle to radians
        const angleRad = (this.launchAngle * Math.PI) / 180;
        
        // Calculate initial velocity needed to reach target
        // Using projectile motion equations:
        // Range = (v^2 * sin(2*theta)) / g
        // Solving for v: v = sqrt((g * range) / sin(2*theta))
        const sin2theta = Math.sin(2 * angleRad);
        
        if (Math.abs(sin2theta) < 0.001) {
            // Fallback if angle is problematic
            this.launchAngle = 45;
            const newAngleRad = (45 * Math.PI) / 180;
            this.initialVelocity = Math.sqrt((this.gravity * horizontalDistance) / Math.sin(2 * newAngleRad));
        } else {
            // Adjust for vertical displacement
            const tanTheta = Math.tan(angleRad);
            const numerator = this.gravity * horizontalDistance * horizontalDistance;
            const denominator = 2 * (horizontalDistance * tanTheta - dy) * Math.cos(angleRad) * Math.cos(angleRad);
            
            if (denominator > 0) {
                this.initialVelocity = Math.sqrt(numerator / denominator);
            } else {
                // Fallback calculation
                this.initialVelocity = Math.sqrt((this.gravity * horizontalDistance) / sin2theta);
            }
        }
        
        // Calculate flight duration
        const vx = this.initialVelocity * Math.cos(angleRad);
        this.flightDuration = horizontalDistance / vx;
        
        // Calculate initial velocity components in world space
        // Direction in XZ plane
        const directionXZ = new THREE.Vector2(dx, dz).normalize();
        
        this.velocityX = vx * directionXZ.x;
        this.velocityZ = vx * directionXZ.y;
        this.velocityY = this.initialVelocity * Math.sin(angleRad);
    }
    
    /**
     * Load the rock model
     */
    loadModel() {
        loadGLTFAsync([this.modelPath], (models) => {
            const gltf = models[0];
            this.mesh = gltf.scene;
            this.mesh.scale.set(this.scale, this.scale, this.scale);
            
            // Enable shadows
            this.mesh.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });
            
            // Set initial position in world space
            this.mesh.position.copy(this.startPosition);
            this.scene.add(this.mesh);
        });
    }
    
    /**
     * Create visual trajectory line (red parabolic curve)
     */
    createTrajectoryLine() {
        const points = [];
        const segments = 50;
        
        for (let i = 0; i <= segments; i++) {
            const t = (i / segments) * this.flightDuration;
            const pos = this.getPositionAtTime(t);
            points.push(pos);
        }
        
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({
            color: 0xff0000, // Red line
            linewidth: 2,
            transparent: true,
            opacity: 0.8
        });
        
        this.trajectoryLine = new THREE.Line(geometry, material);
        this.scene.add(this.trajectoryLine);
    }
    
    /**
     * Calculate position at a specific time in the trajectory (world space)
     */
    getPositionAtTime(t) {
        const x = this.startPosition.x + this.velocityX * t;
        const y = this.startPosition.y + this.velocityY * t - 0.5 * this.gravity * t * t;
        const z = this.startPosition.z + this.velocityZ * t;
        
        return new THREE.Vector3(x, y, z);
    }
    
    /**
     * Launch the projectile
     */
    launch() {
        this.active = true;
        this.travelTime = 0;
    }
    
    /**
     * Update projectile position (call every frame)
     */
    update(deltaTime) {
        if (!this.active || !this.mesh) {
            return;
        }
        
        this.travelTime += deltaTime;
        
        if (this.travelTime >= this.flightDuration) {
            // Projectile has landed
            this.mesh.position.copy(this.targetPosition);
            this.active = false;
            this.hideTrajectoryLine();
            return;
        }
        
        // Update position using world-space physics
        const newPosition = this.getPositionAtTime(this.travelTime);
        this.mesh.position.copy(newPosition);
        
        // Rotate the rock as it flies
        if (this.mesh) {
            this.mesh.rotation.x += deltaTime * 5;
            this.mesh.rotation.y += deltaTime * 3;
        }
    }
    
    /**
     * Show trajectory line
     */
    showTrajectoryLine() {
        if (this.trajectoryLine) {
            this.trajectoryLine.visible = true;
        }
    }
    
    /**
     * Hide trajectory line
     */
    hideTrajectoryLine() {
        if (this.trajectoryLine) {
            this.trajectoryLine.visible = false;
        }
    }
    
    /**
     * Check if projectile is still in flight
     */
    isActive() {
        return this.active;
    }
    
    /**
     * Cleanup resources
     */
    dispose() {
        if (this.mesh) {
            this.scene.remove(this.mesh);
            this.mesh.traverse((child) => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(mat => mat.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            });
        }
        
        if (this.trajectoryLine) {
            this.trajectoryLine.geometry.dispose();
            this.trajectoryLine.material.dispose();
            this.scene.remove(this.trajectoryLine);
        }
    }
}

export default Projectile;
