import * as THREE from 'three';

/**
 * CameraController - Manages camera perspective switching
 * Switches between default bird's-eye view and behind-object view
 */
class CameraController {
    constructor(camera, selectionManager) {
        this.camera = camera;
        this.selectionManager = selectionManager;

        // Store default camera settings
        this.defaultPosition = camera.position.clone();
        this.defaultRotation = camera.rotation.clone();
        this.defaultQuaternion = camera.quaternion.clone();
        this.defaultTarget = new THREE.Vector3(0, 0, 4); // What camera looks at by default

        this.isObjectView = false;
        this.currentViewObject = null;

        // Behind-object view offset (behind and above)
        this.BEHIND_OFFSET = { x: 0, y: 3, z: 5 };

        this.setupKeyboardControls();
    }

    /**
     * Setup keyboard control for toggling camera view
     */
    setupKeyboardControls() {
        window.addEventListener('keydown', (event) => {
            if (event.key === 'c' || event.key === 'C') {
                this.toggleView();
            }
        });
    }

    /**
     * Toggle between default view and object view
     */
    toggleView() {
        if (this.isObjectView) {
            this.switchToDefaultView();
        } else {
            this.switchToObjectView();
        }
    }

    /**
     * Switch camera to view from behind the selected object
     */
    switchToObjectView() {
        const selected = this.selectionManager.getSelectedObject();

        if (!selected) {
            console.log('No object selected. Select an object first using arrow keys.');
            return;
        }

        const object = selected.object;

        // Get object's world position
        const objectWorldPos = new THREE.Vector3();
        object.getWorldPosition(objectWorldPos);

        // Get object's world rotation
        const objectWorldQuat = new THREE.Quaternion();
        object.getWorldQuaternion(objectWorldQuat);

        // Calculate camera position behind and above the object
        const offset = new THREE.Vector3(
            this.BEHIND_OFFSET.x,
            this.BEHIND_OFFSET.y,
            this.BEHIND_OFFSET.z
        );

        // Rotate the offset by the object's rotation
        offset.applyQuaternion(objectWorldQuat);

        // Position camera behind the object
        const cameraPosition = objectWorldPos.clone().add(offset);
        this.camera.position.copy(cameraPosition);

        // Calculate look-at point (in front of the object)
        const lookDirection = new THREE.Vector3(0, 0, -1);
        lookDirection.applyQuaternion(objectWorldQuat);
        const lookAtPoint = objectWorldPos.clone().add(lookDirection.multiplyScalar(10));

        this.camera.lookAt(lookAtPoint);

        this.isObjectView = true;
        this.currentViewObject = object;

        console.log(`Camera switched to ${selected.userData.type} view`);
    }

    /**
     * Return camera to default bird's-eye view
     */
    switchToDefaultView() {
        this.camera.position.copy(this.defaultPosition);
        this.camera.quaternion.copy(this.defaultQuaternion);
        this.camera.lookAt(this.defaultTarget);

        this.isObjectView = false;
        this.currentViewObject = null;

        console.log('Camera switched to default view');
    }

    /**
     * Update camera - call this in animation loop if needed
     * For now, the camera is static once positioned
     */
    update() {
        // If we want the camera to follow a moving object, we could update position here
        // For now, camera is static once positioned
    }

    /**
     * Get current view state
     */
    getViewState() {
        return {
            isObjectView: this.isObjectView,
            currentObject: this.currentViewObject
        };
    }
}

export default CameraController;
