import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import * as THREE from 'three';
import Catapult from '../src/catapult.js';
import Terrain from '../src/terrain.js';

// Mock the setup module
vi.mock('../src/setup.js', () => ({
  loadGLTFAsync: vi.fn((files, callback) => {
    // Simulate async loading with a simple mock model
    setTimeout(() => {
      const mockScene = new THREE.Group();
      mockScene.name = 'MockGLTFScene';
      // Use set method instead of direct assignment
      mockScene.scale.set(1, 1, 1);
      mockScene.traverse = vi.fn((fn) => {
        // Create a mock mesh child
        const mockMesh = new THREE.Mesh();
        mockMesh.isMesh = true;
        mockMesh.castShadow = false;
        mockMesh.receiveShadow = false;
        fn(mockMesh);
      });
      callback([{ scene: mockScene }]);
    }, 0);
  })
}));

describe('Catapult', () => {
  let catapult;

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should create catapult with default parameters', () => {
      catapult = new Catapult();
      expect(catapult.modelPath).toBe('assets/catapult/scene.gltf');
      expect(catapult.scale).toBeInstanceOf(THREE.Vector3);
      expect(catapult.scale.x).toBe(0.2);
      expect(catapult.scale.y).toBe(0.2);
      expect(catapult.scale.z).toBe(0.2);
      expect(catapult.offset).toBeInstanceOf(THREE.Vector3);
      expect(catapult.root).toBeInstanceOf(THREE.Group);
      expect(catapult.root.name).toBe('CatapultRoot');
      expect(catapult.parent).toBeNull();
    });

    it('should create catapult with custom parameters', () => {
      const customParams = {
        modelPath: 'custom/path.gltf',
        scale: { x: 0.5, y: 0.5, z: 0.5 },
        offset: { x: 1, y: 2, z: 3 }
      };
      catapult = new Catapult(customParams);
      
      expect(catapult.modelPath).toBe('custom/path.gltf');
      expect(catapult.scale.x).toBe(0.5);
      expect(catapult.scale.y).toBe(0.5);
      expect(catapult.scale.z).toBe(0.5);
      expect(catapult.offset.x).toBe(1);
      expect(catapult.offset.y).toBe(2);
      expect(catapult.offset.z).toBe(3);
    });

    it('should initialize root as THREE.Group', () => {
      catapult = new Catapult();
      expect(catapult.root).toBeInstanceOf(THREE.Group);
      expect(catapult.root.name).toBe('CatapultRoot');
    });

    it('should initialize model as null before loading', () => {
      catapult = new Catapult();
      expect(catapult.model).toBeNull();
    });
  });

  describe('attachTo', () => {
    beforeEach(() => {
      catapult = new Catapult();
    });

    it('should attach to Terrain instance', () => {
      const terrain = new Terrain();
      const terrainAddSpy = vi.spyOn(terrain.mesh, 'add');
      
      catapult.attachTo(terrain);
      
      expect(terrainAddSpy).toHaveBeenCalledWith(catapult.root);
      expect(catapult.parent).toBe(terrain.mesh);
    });

    it('should attach to THREE.Object3D', () => {
      const obj = new THREE.Object3D();
      const objAddSpy = vi.spyOn(obj, 'add');
      
      catapult.attachTo(obj);
      
      expect(objAddSpy).toHaveBeenCalledWith(catapult.root);
      expect(catapult.parent).toBe(obj);
    });

    it('should throw error when attaching to invalid target', () => {
      expect(() => catapult.attachTo(null)).toThrow(
        'Catapult.attachTo requires a Terrain instance or THREE.Object3D.'
      );
      expect(() => catapult.attachTo({})).toThrow(
        'Catapult.attachTo requires a Terrain instance or THREE.Object3D.'
      );
    });

    it('should position catapult based on offset and tile depth', () => {
      const terrain = new Terrain(3, 0x00ff00);
      catapult.attachTo(terrain);
      
      // Default offset is { x: -0.5, y: 0.1, z: 0.5 }
      // Terrain depth is 1, so y should be 1/2 + 0.1 = 0.6
      expect(catapult.root.position.x).toBe(-0.5);
      expect(catapult.root.position.y).toBe(0.6);
      expect(catapult.root.position.z).toBe(0.5);
    });

    it('should remove from previous parent when re-attaching', () => {
      const terrain1 = new Terrain();
      const terrain2 = new Terrain();
      const terrain1RemoveSpy = vi.spyOn(terrain1.mesh, 'remove');
      
      catapult.attachTo(terrain1);
      catapult.attachTo(terrain2);
      
      expect(terrain1RemoveSpy).toHaveBeenCalledWith(catapult.root);
      expect(catapult.parent).toBe(terrain2.mesh);
    });

    it('should handle custom depth parameter', () => {
      const obj = new THREE.Object3D();
      catapult.attachTo(obj, { depth: 5 });
      
      // With depth 5 and offset.y 0.1, y should be 5/2 + 0.1 = 2.6
      expect(catapult.root.position.y).toBe(2.6);
    });

    it('should use terrain depth property if available', () => {
      const terrain = new Terrain();
      terrain.depth = 4;
      catapult.attachTo(terrain);
      
      // With depth 4 and offset.y 0.1, y should be 4/2 + 0.1 = 2.1
      expect(catapult.root.position.y).toBe(2.1);
    });
  });

  describe('detach', () => {
    beforeEach(() => {
      catapult = new Catapult();
    });

    it('should detach catapult from parent', () => {
      const terrain = new Terrain();
      const terrainRemoveSpy = vi.spyOn(terrain.mesh, 'remove');
      
      catapult.attachTo(terrain);
      catapult.detach();
      
      expect(terrainRemoveSpy).toHaveBeenCalledWith(catapult.root);
      expect(catapult.parent).toBeNull();
    });

    it('should do nothing if no parent', () => {
      expect(() => catapult.detach()).not.toThrow();
      expect(catapult.parent).toBeNull();
    });
  });

  describe('object3d getter', () => {
    it('should return the root object', () => {
      catapult = new Catapult();
      expect(catapult.object3d).toBe(catapult.root);
      expect(catapult.object3d).toBeInstanceOf(THREE.Group);
    });
  });

  describe('Model Loading', () => {
    it('should load model asynchronously', async () => {
      catapult = new Catapult();
      
      // Wait for async loading
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // After loading, root should have children
      expect(catapult.root.children.length).toBeGreaterThan(0);
    });

    it('should apply scale to loaded model', async () => {
      const customScale = { x: 1.0, y: 1.0, z: 1.0 };
      catapult = new Catapult({ scale: customScale });
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Check that root has children (model was added)
      expect(catapult.root.children.length).toBeGreaterThan(0);
    });
  });

  describe('Vector3 Properties', () => {
    it('should convert scale object to Vector3', () => {
      catapult = new Catapult({ scale: { x: 0.3, y: 0.4, z: 0.5 } });
      expect(catapult.scale).toBeInstanceOf(THREE.Vector3);
      expect(catapult.scale.x).toBe(0.3);
      expect(catapult.scale.y).toBe(0.4);
      expect(catapult.scale.z).toBe(0.5);
    });

    it('should convert offset object to Vector3', () => {
      catapult = new Catapult({ offset: { x: 1, y: 2, z: 3 } });
      expect(catapult.offset).toBeInstanceOf(THREE.Vector3);
      expect(catapult.offset.x).toBe(1);
      expect(catapult.offset.y).toBe(2);
      expect(catapult.offset.z).toBe(3);
    });
  });
});
