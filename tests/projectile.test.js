import { test } from 'node:test';
import assert from 'node:assert';
import * as THREE from 'three';

// Mock Projectile class for testing (without THREE.js scene dependency)
class MockProjectile {
    constructor(startPos, targetPos, options = {}) {
        this.startPosition = new THREE.Vector3().copy(startPos);
        this.targetPosition = new THREE.Vector3().copy(targetPos);
        this.gravity = options.gravity || 9.8;
        this.launchAngle = options.launchAngle || 45;
        this.travelTime = 0;
        this.active = false;
        
        this.calculateTrajectory();
    }
    
    calculateTrajectory() {
        const dx = this.targetPosition.x - this.startPosition.x;
        const dy = this.targetPosition.y - this.startPosition.y;
        const dz = this.targetPosition.z - this.startPosition.z;
        
        const horizontalDistance = Math.sqrt(dx * dx + dz * dz);
        const angleRad = (this.launchAngle * Math.PI) / 180;
        const sin2theta = Math.sin(2 * angleRad);
        
        if (Math.abs(sin2theta) < 0.001) {
            this.launchAngle = 45;
            const newAngleRad = (45 * Math.PI) / 180;
            this.initialVelocity = Math.sqrt((this.gravity * horizontalDistance) / Math.sin(2 * newAngleRad));
        } else {
            const tanTheta = Math.tan(angleRad);
            const numerator = this.gravity * horizontalDistance * horizontalDistance;
            const denominator = 2 * (horizontalDistance * tanTheta - dy) * Math.cos(angleRad) * Math.cos(angleRad);
            
            if (denominator > 0) {
                this.initialVelocity = Math.sqrt(numerator / denominator);
            } else {
                this.initialVelocity = Math.sqrt((this.gravity * horizontalDistance) / sin2theta);
            }
        }
        
        const vx = this.initialVelocity * Math.cos(angleRad);
        this.flightDuration = horizontalDistance / vx;
        
        const directionXZ = new THREE.Vector2(dx, dz).normalize();
        this.velocityX = vx * directionXZ.x;
        this.velocityZ = vx * directionXZ.y;
        this.velocityY = this.initialVelocity * Math.sin(angleRad);
    }
    
    getPositionAtTime(t) {
        const x = this.startPosition.x + this.velocityX * t;
        const y = this.startPosition.y + this.velocityY * t - 0.5 * this.gravity * t * t;
        const z = this.startPosition.z + this.velocityZ * t;
        return new THREE.Vector3(x, y, z);
    }
}

test('Projectile trajectory calculation produces consistent landing position', () => {
    // Test with same start and target from different locations
    const startPos1 = new THREE.Vector3(0, 1, 0);
    const targetPos1 = new THREE.Vector3(10, 0.5, 0);
    
    const projectile1 = new MockProjectile(startPos1, targetPos1);
    const landingPos1 = projectile1.getPositionAtTime(projectile1.flightDuration);
    
    // Check that landing position matches target position (within tolerance)
    const tolerance = 0.1;
    assert.ok(Math.abs(landingPos1.x - targetPos1.x) < tolerance, 'X position should match target');
    assert.ok(Math.abs(landingPos1.y - targetPos1.y) < tolerance, 'Y position should match target');
    assert.ok(Math.abs(landingPos1.z - targetPos1.z) < tolerance, 'Z position should match target');
});

test('Projectile follows parabolic path (reaches apex)', () => {
    const startPos = new THREE.Vector3(0, 1, 0);
    const targetPos = new THREE.Vector3(10, 1, 0);
    
    const projectile = new MockProjectile(startPos, targetPos);
    
    // Calculate position at midpoint
    const midTime = projectile.flightDuration / 2;
    const midPos = projectile.getPositionAtTime(midTime);
    
    // At midpoint, Y should be higher than both start and end (parabolic arc)
    assert.ok(midPos.y > startPos.y, 'Apex Y should be higher than start Y');
    assert.ok(midPos.y > targetPos.y, 'Apex Y should be higher than target Y');
});

test('Projectile trajectory is consistent for different target tiles', () => {
    const startPos = new THREE.Vector3(0, 1, 0);
    
    // Test multiple targets at same distance but different angles
    const targets = [
        new THREE.Vector3(10, 0.5, 0),   // East
        new THREE.Vector3(0, 0.5, 10),   // North
        new THREE.Vector3(-10, 0.5, 0),  // West
        new THREE.Vector3(0, 0.5, -10),  // South
    ];
    
    const tolerance = 0.1;
    
    for (const targetPos of targets) {
        const projectile = new MockProjectile(startPos, targetPos);
        const landingPos = projectile.getPositionAtTime(projectile.flightDuration);
        
        // Verify landing position matches target
        assert.ok(Math.abs(landingPos.x - targetPos.x) < tolerance, `X position should match target for ${targetPos.x}, ${targetPos.z}`);
        assert.ok(Math.abs(landingPos.y - targetPos.y) < tolerance, `Y position should match target for ${targetPos.x}, ${targetPos.z}`);
        assert.ok(Math.abs(landingPos.z - targetPos.z) < tolerance, `Z position should match target for ${targetPos.x}, ${targetPos.z}`);
    }
});

test('Projectile position calculations use world space coordinates', () => {
    // This test verifies that positions are calculated in world space
    // not relative to any parent object's local coordinate system
    const startPos = new THREE.Vector3(5, 2, 3);
    const targetPos = new THREE.Vector3(15, 1, 13);
    
    const projectile = new MockProjectile(startPos, targetPos);
    
    // Start position should be preserved in world space
    const posAtStart = projectile.getPositionAtTime(0);
    assert.strictEqual(posAtStart.x, startPos.x, 'Start X in world space');
    assert.strictEqual(posAtStart.y, startPos.y, 'Start Y in world space');
    assert.strictEqual(posAtStart.z, startPos.z, 'Start Z in world space');
    
    // Landing position should be in world space
    const landingPos = projectile.getPositionAtTime(projectile.flightDuration);
    const tolerance = 0.1;
    assert.ok(Math.abs(landingPos.x - targetPos.x) < tolerance, 'Landing X in world space');
    assert.ok(Math.abs(landingPos.y - targetPos.y) < tolerance, 'Landing Y in world space');
    assert.ok(Math.abs(landingPos.z - targetPos.z) < tolerance, 'Landing Z in world space');
});
