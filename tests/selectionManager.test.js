import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import SelectionManager from '../src/selectionManager.js';

test('SelectionManager tracks selectable objects without requiring specific scene state', (t) => {
    const originalWindow = globalThis.window;
    globalThis.window = {
        addEventListener: () => {}
    };
    t.after(() => {
        globalThis.window = originalWindow;
    });

    const scene = new THREE.Scene();
    const manager = new SelectionManager(scene);

    const meshA = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshBasicMaterial()
    );
    const meshB = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshBasicMaterial()
    );

    scene.add(meshA);
    scene.add(meshB);

    manager.addSelectableObject(meshA, { id: 'alpha' });
    manager.addSelectableObject(meshB, { id: 'bravo' });

    manager.selectNext();
    let selected = manager.getSelectedObject();
    assert.ok(selected, 'Selection should exist after selecting next');
    assert.strictEqual(selected.object, meshA);
    assert.ok(manager.highlightCircle.visible, 'Highlight should be visible when something is selected');

    manager.selectNext();
    selected = manager.getSelectedObject();
    assert.strictEqual(selected.object, meshB, 'Selection cycles to the next object');

    manager.selectPrevious();
    selected = manager.getSelectedObject();
    assert.strictEqual(selected.object, meshA, 'Selection cycles back to the previous object');

    manager.removeSelectableObject(meshA);
    manager.selectNext();
    selected = manager.getSelectedObject();
    assert.strictEqual(selected.object, meshB, 'Remaining object stays selectable after removals');

    manager.deselect();
    assert.strictEqual(manager.getSelectedObject(), null, 'Deselect clears selection');
    assert.strictEqual(manager.highlightCircle.visible, false, 'Highlight should be hidden after deselect');
});
