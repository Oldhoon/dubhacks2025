import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import Sprite from '../src/sprite.js';

test('Sprite creates a mesh that mirrors its state', () => {
    const startingPosition = new THREE.Vector3(1, 2, 3);
    const sprite = new Sprite(2, startingPosition.clone());

    assert.ok(sprite.mesh, 'Sprite should create a mesh');
    assert.strictEqual(sprite.mesh.userData.sprite, sprite, 'Mesh should keep a reference to the sprite');
    assert.strictEqual(sprite.mesh.position.x, startingPosition.x);
    assert.strictEqual(sprite.mesh.position.y, startingPosition.y);
    assert.strictEqual(sprite.mesh.position.z, startingPosition.z);

    const scene = new THREE.Scene();
    sprite.addToScene(scene);
    assert.ok(scene.children.includes(sprite.mesh), 'Mesh should be added to the scene');

    sprite.setPosition(4, 5, 6);
    assert.strictEqual(sprite.mesh.position.x, 4);
    assert.strictEqual(sprite.mesh.position.y, 5);
    assert.strictEqual(sprite.mesh.position.z, 6);

    sprite.removeFromScene(scene);
    assert.ok(!scene.children.includes(sprite.mesh), 'Mesh should be removed from the scene');
});
