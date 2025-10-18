import * as THREE from 'three';

const DEFAULT_SIZE = 0.3;
const DEFAULT_COLOR = 0xffffff;
const DEFAULT_DISTANCE = 2;

export default class Crosshair {
    constructor({
        size = DEFAULT_SIZE,
        color = DEFAULT_COLOR,
        distance = DEFAULT_DISTANCE,
    } = {}) {
        this.size = size;
        this.color = color;
        this.distance = distance;

        this.root = this.#createCrosshair();
        this.parent = null;
    }

    #createCrosshair() {
        const half = this.size;
        const vertices = new Float32Array([
            -half, 0, 0,
            half, 0, 0,
            0, -half, 0,
            0, half, 0,
        ]);

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));

        const material = new THREE.LineBasicMaterial({
            color: this.color,
            depthTest: false,
            depthWrite: false,
            transparent: true,
        });

        const crosshair = new THREE.LineSegments(geometry, material);
        crosshair.frustumCulled = false;
        crosshair.renderOrder = 1000;
        return crosshair;
    }

    attachTo(camera) {
        if (!camera || typeof camera.add !== 'function') {
            throw new Error('Crosshair.attachTo requires a THREE.Camera.');
        }

        if (this.parent && this.parent !== camera) {
            this.parent.remove(this.root);
        }

        camera.add(this.root);
        this.root.position.set(0, 0, -this.distance);

        this.parent = camera;
    }

    detach() {
        if (this.parent) {
            this.parent.remove(this.root);
            this.parent = null;
        }
    }

    get object3d() {
        return this.root;
    }
}
