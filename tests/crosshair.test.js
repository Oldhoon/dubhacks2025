import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import Crosshair from '../src/crosshair.js';

describe('Crosshair', () => {
  let crosshair;
  let mockCamera;

  beforeEach(() => {
    mockCamera = new THREE.PerspectiveCamera();
    mockCamera.add = vi.fn();
    mockCamera.remove = vi.fn();
  });

  describe('Constructor', () => {
    it('should create crosshair with default parameters', () => {
      crosshair = new Crosshair();
      expect(crosshair.size).toBe(0.3);
      expect(crosshair.color).toBe(0xffffff);
      expect(crosshair.distance).toBe(2);
      expect(crosshair.root).toBeInstanceOf(THREE.LineSegments);
      expect(crosshair.parent).toBeNull();
    });

    it('should create crosshair with custom parameters', () => {
      crosshair = new Crosshair({
        size: 0.5,
        color: 0xff0000,
        distance: 5
      });
      expect(crosshair.size).toBe(0.5);
      expect(crosshair.color).toBe(0xff0000);
      expect(crosshair.distance).toBe(5);
    });

    it('should create line segments with correct geometry', () => {
      crosshair = new Crosshair({ size: 0.4 });
      const geometry = crosshair.root.geometry;
      expect(geometry).toBeInstanceOf(THREE.BufferGeometry);
      
      const positions = geometry.attributes.position.array;
      // Check that we have 4 vertices (2 lines: horizontal and vertical)
      expect(positions.length).toBe(12); // 4 vertices * 3 coordinates
    });

    it('should set correct material properties', () => {
      crosshair = new Crosshair({ color: 0x00ff00 });
      const material = crosshair.root.material;
      expect(material).toBeInstanceOf(THREE.LineBasicMaterial);
      expect(material.color.getHex()).toBe(0x00ff00);
      expect(material.depthTest).toBe(false);
      expect(material.depthWrite).toBe(false);
      expect(material.transparent).toBe(true);
    });

    it('should set render order and frustum culling', () => {
      crosshair = new Crosshair();
      expect(crosshair.root.frustumCulled).toBe(false);
      expect(crosshair.root.renderOrder).toBe(1000);
    });
  });

  describe('attachTo', () => {
    it('should attach crosshair to camera', () => {
      crosshair = new Crosshair({ distance: 3 });
      crosshair.attachTo(mockCamera);
      
      expect(mockCamera.add).toHaveBeenCalledWith(crosshair.root);
      expect(crosshair.parent).toBe(mockCamera);
      expect(crosshair.root.position.z).toBe(-3);
      expect(crosshair.root.position.x).toBe(0);
      expect(crosshair.root.position.y).toBe(0);
    });

    it('should throw error when attaching to invalid object', () => {
      crosshair = new Crosshair();
      expect(() => crosshair.attachTo(null)).toThrow('Crosshair.attachTo requires a THREE.Camera.');
      expect(() => crosshair.attachTo({})).toThrow('Crosshair.attachTo requires a THREE.Camera.');
    });

    it('should remove from previous parent when re-attaching', () => {
      crosshair = new Crosshair();
      const oldCamera = new THREE.PerspectiveCamera();
      const oldCameraRemove = vi.fn();
      oldCamera.remove = oldCameraRemove;
      
      crosshair.attachTo(oldCamera);
      crosshair.parent = oldCamera; // Set parent manually
      crosshair.parent.remove = oldCameraRemove;
      
      crosshair.attachTo(mockCamera);
      
      expect(oldCameraRemove).toHaveBeenCalledWith(crosshair.root);
      expect(mockCamera.add).toHaveBeenCalled();
    });

    it('should position crosshair at correct distance', () => {
      const distance = 10;
      crosshair = new Crosshair({ distance });
      crosshair.attachTo(mockCamera);
      
      expect(crosshair.root.position.z).toBe(-distance);
    });
  });

  describe('detach', () => {
    it('should detach crosshair from parent', () => {
      crosshair = new Crosshair();
      crosshair.parent = mockCamera;
      
      crosshair.detach();
      
      expect(mockCamera.remove).toHaveBeenCalledWith(crosshair.root);
      expect(crosshair.parent).toBeNull();
    });

    it('should do nothing if no parent', () => {
      crosshair = new Crosshair();
      expect(() => crosshair.detach()).not.toThrow();
      expect(crosshair.parent).toBeNull();
    });
  });

  describe('object3d getter', () => {
    it('should return the root object', () => {
      crosshair = new Crosshair();
      expect(crosshair.object3d).toBe(crosshair.root);
      expect(crosshair.object3d).toBeInstanceOf(THREE.LineSegments);
    });
  });

  describe('Geometry Vertices', () => {
    it('should create crosshair with correct vertex positions', () => {
      const size = 0.5;
      crosshair = new Crosshair({ size });
      
      const positions = crosshair.root.geometry.attributes.position.array;
      
      // Horizontal line: (-size, 0, 0) to (size, 0, 0)
      expect(positions[0]).toBe(-size);
      expect(positions[1]).toBe(0);
      expect(positions[2]).toBe(0);
      expect(positions[3]).toBe(size);
      expect(positions[4]).toBe(0);
      expect(positions[5]).toBe(0);
      
      // Vertical line: (0, -size, 0) to (0, size, 0)
      expect(positions[6]).toBe(0);
      expect(positions[7]).toBe(-size);
      expect(positions[8]).toBe(0);
      expect(positions[9]).toBe(0);
      expect(positions[10]).toBe(size);
      expect(positions[11]).toBe(0);
    });
  });
});
