import * as THREE from 'three';

/**
 * CameraController - Manages camera perspective switching
 * Switches between default bird's-eye view and front view of selected object
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
        this.BEHIND_OFFSET = { x: -4, y: 2.5, z: -0.5};
        // this.BEHIND_OFFSET = { x: 0, y: 0, z: 0 };


        // Camera rotation offset (in radians)
        // pitch: tilt up/down, yaw: turn left/right, roll: tilt sideways
        this.ROTATION_OFFSET = { pitch: -0.2, yaw: 0, roll: 0 };
        // this.ROTATION_OFFSET = { pitch: 0, yaw: 0, roll: 0 };

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
     * Switch camera to front view - lower the camera to see characters from the front
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

        // Lower the camera position on Y-axis to see characters from the front
        // Keep X and Z similar to default but lower Y to character level
        const frontViewPosition = new THREE.Vector3(
            this.defaultPosition.x,
            2, // Lower Y position to see characters from front
            this.defaultPosition.z
        );

        this.camera.position.copy(frontViewPosition);

        // Look at the selected object (or slightly above it to see the character better)
        const lookAtTarget = objectWorldPos.clone();
        lookAtTarget.y += 1; // Look slightly above the base of the object
        this.camera.lookAt(lookAtTarget);

        this.isObjectView = true;
        this.currentViewObject = object;

        console.log(`Camera switched to front view of ${selected.userData.type}`);
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
