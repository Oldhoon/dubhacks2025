import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import Terrain from '../src/terrain.js';

describe('Terrain', () => {
  let terrain;
  let mockScene;

  beforeEach(() => {
    mockScene = {
      add: vi.fn(),
      remove: vi.fn()
    };
  });

  describe('Constructor', () => {
    it('should create terrain with default parameters', () => {
      terrain = new Terrain();
      expect(terrain.size).toBe(3);
      expect(terrain.color).toBe(0x228B22);
      expect(terrain.depth).toBe(1);
      expect(terrain.texturePath).toBeNull();
      expect(terrain.mesh).toBeInstanceOf(THREE.Mesh);
    });

    it('should create terrain with custom parameters', () => {
      terrain = new Terrain(5, 0xff0000, 'test/path.png');
      expect(terrain.size).toBe(5);
      expect(terrain.color).toBe(0xff0000);
      expect(terrain.texturePath).toBe('test/path.png');
    });

    it('should create mesh with correct geometry', () => {
      terrain = new Terrain(4);
      expect(terrain.mesh.geometry).toBeInstanceOf(THREE.BoxGeometry);
      expect(terrain.mesh.geometry.parameters.width).toBe(4);
      expect(terrain.mesh.geometry.parameters.height).toBe(1);
      expect(terrain.mesh.geometry.parameters.depth).toBe(4);
    });

    it('should position mesh correctly', () => {
      terrain = new Terrain();
      expect(terrain.mesh.position.y).toBe(-0.25);
    });

    it('should enable shadows on mesh', () => {
      terrain = new Terrain();
      expect(terrain.mesh.receiveShadow).toBe(true);
      expect(terrain.mesh.castShadow).toBe(true);
    });
  });

  describe('Material', () => {
    it('should use MeshLambertMaterial without texture', () => {
      terrain = new Terrain();
      expect(terrain.mesh.material).toBeInstanceOf(THREE.MeshLambertMaterial);
      expect(terrain.mesh.material.flatShading).toBe(true);
    });

    it('should use array of materials with texture', () => {
      terrain = new Terrain(3, 0x00ff00, 'assets/test.png');
      expect(Array.isArray(terrain.mesh.material)).toBe(true);
      expect(terrain.mesh.material.length).toBe(6);
    });

    it('should apply correct color to material', () => {
      const testColor = 0x123456;
      terrain = new Terrain(3, testColor);
      expect(terrain.mesh.material.color.getHex()).toBe(testColor);
    });
  });

  describe('addToScene', () => {
    it('should add terrain mesh to scene', () => {
      terrain = new Terrain();
      terrain.addToScene(mockScene);
      expect(mockScene.add).toHaveBeenCalledWith(terrain.mesh);
      expect(mockScene.add).toHaveBeenCalledTimes(1);
    });
  });

  describe('removeFromScene', () => {
    it('should remove terrain mesh from scene', () => {
      terrain = new Terrain();
      terrain.removeFromScene(mockScene);
      expect(mockScene.remove).toHaveBeenCalledWith(terrain.mesh);
      expect(mockScene.remove).toHaveBeenCalledTimes(1);
    });
  });

  describe('setColor', () => {
    it('should update terrain color', () => {
      terrain = new Terrain(3, 0xff0000);
      const newColor = 0x0000ff;
      terrain.setColor(newColor);
      expect(terrain.color).toBe(newColor);
      expect(terrain.mesh.material.color.getHex()).toBe(newColor);
    });

    it('should update color on single material', () => {
      terrain = new Terrain();
      const newColor = 0x00ff00;
      terrain.setColor(newColor);
      expect(terrain.mesh.material.color.getHex()).toBe(newColor);
    });
  });

  describe('object3d getter', () => {
    it('should return the mesh object', () => {
      terrain = new Terrain();
      expect(terrain.object3d).toBe(terrain.mesh);
      expect(terrain.object3d).toBeInstanceOf(THREE.Mesh);
    });
  });

  describe('Texture Loading', () => {
    it('should handle texture path parameter', () => {
      const texturePath = 'assets/tiles/Texture/TX Tileset Grass.png';
      terrain = new Terrain(3, 0x00ff00, texturePath);
      expect(terrain.texturePath).toBe(texturePath);
    });
  });
});
