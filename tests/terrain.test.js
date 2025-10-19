import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import Terrain from '../src/terrain.js';

test('Terrain creates a mesh and hooks into scenes', () => {
    const terrain = new Terrain();
    assert.ok(terrain.mesh, 'Terrain should build a mesh');
    assert.strictEqual(terrain.object3d, terrain.mesh, 'object3d getter should return the mesh');

    const scene = new THREE.Scene();
    terrain.addToScene(scene);
    assert.ok(scene.children.includes(terrain.mesh), 'Mesh should be attached to the scene');

    terrain.removeFromScene(scene);
    assert.ok(!scene.children.includes(terrain.mesh), 'Mesh should be detachable from the scene');
});

test('Terrain setColor updates the material color', () => {
    const terrain = new Terrain();
    const newColor = 0xffaa00;

    terrain.setColor(newColor);

    const material = terrain.mesh.material;
    const currentColor = Array.isArray(material) ? material[0].color.getHex() : material.color.getHex();
    assert.strictEqual(currentColor, newColor, 'Terrain material color should reflect the latest color');
});
