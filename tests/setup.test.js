import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loadGLTFAsync, loadOBJAsync } from '../src/setup.js';
import * as THREE from 'three';

// Mock the loaders
vi.mock('three/examples/jsm/loaders/GLTFLoader.js', () => ({
  GLTFLoader: vi.fn().mockImplementation(() => ({
    loadAsync: vi.fn()
  }))
}));

vi.mock('three/examples/jsm/loaders/OBJLoader.js', () => ({
  OBJLoader: vi.fn().mockImplementation(() => ({
    loadAsync: vi.fn()
  }))
}));

describe('setup.js utilities', () => {
  let consoleLogSpy;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
    consoleLogSpy.mockRestore();
  });

  describe('loadGLTFAsync', () => {
    it('should load GLTF files and call postLoading callback', async () => {
      const mockModel = { scene: new THREE.Group() };
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
      const mockLoadAsync = vi.fn().mockResolvedValue(mockModel);
      GLTFLoader.mockImplementation(() => ({
        loadAsync: mockLoadAsync
      }));

      const files = ['model1.gltf', 'model2.gltf'];
      const postLoading = vi.fn();

      await loadGLTFAsync(files, postLoading);

      expect(mockLoadAsync).toHaveBeenCalledTimes(2);
      expect(mockLoadAsync).toHaveBeenCalledWith('model1.gltf', expect.any(Function));
      expect(mockLoadAsync).toHaveBeenCalledWith('model2.gltf', expect.any(Function));
      expect(postLoading).toHaveBeenCalledWith([mockModel, mockModel]);
    });

    it('should handle single file', async () => {
      const mockModel = { scene: new THREE.Group() };
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
      const mockLoadAsync = vi.fn().mockResolvedValue(mockModel);
      GLTFLoader.mockImplementation(() => ({
        loadAsync: mockLoadAsync
      }));

      const files = ['single.gltf'];
      const postLoading = vi.fn();

      await loadGLTFAsync(files, postLoading);

      expect(mockLoadAsync).toHaveBeenCalledTimes(1);
      expect(postLoading).toHaveBeenCalledWith([mockModel]);
    });

    it('should use THREE.LoadingManager', async () => {
      const mockModel = { scene: new THREE.Group() };
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
      let capturedManager;
      
      GLTFLoader.mockImplementation((manager) => {
        capturedManager = manager;
        return {
          loadAsync: vi.fn().mockResolvedValue(mockModel)
        };
      });

      await loadGLTFAsync(['test.gltf'], vi.fn());

      expect(capturedManager).toBeInstanceOf(THREE.LoadingManager);
    });

    it('should handle empty file array', async () => {
      const postLoading = vi.fn();
      await loadGLTFAsync([], postLoading);
      expect(postLoading).toHaveBeenCalledWith([]);
    });
  });

  describe('loadOBJAsync', () => {
    it('should load OBJ files and call postLoading callback', async () => {
      const mockModel = new THREE.Group();
      const { OBJLoader } = await import('three/examples/jsm/loaders/OBJLoader.js');
      const mockLoadAsync = vi.fn().mockResolvedValue(mockModel);
      OBJLoader.mockImplementation(() => ({
        loadAsync: mockLoadAsync
      }));

      const files = ['model1.obj', 'model2.obj'];
      const postLoading = vi.fn();

      await loadOBJAsync(files, postLoading);

      expect(mockLoadAsync).toHaveBeenCalledTimes(2);
      expect(mockLoadAsync).toHaveBeenCalledWith('model1.obj', expect.any(Function));
      expect(mockLoadAsync).toHaveBeenCalledWith('model2.obj', expect.any(Function));
      expect(postLoading).toHaveBeenCalledWith([mockModel, mockModel]);
    });

    it('should handle single file', async () => {
      const mockModel = new THREE.Group();
      const { OBJLoader } = await import('three/examples/jsm/loaders/OBJLoader.js');
      const mockLoadAsync = vi.fn().mockResolvedValue(mockModel);
      OBJLoader.mockImplementation(() => ({
        loadAsync: mockLoadAsync
      }));

      const files = ['single.obj'];
      const postLoading = vi.fn();

      await loadOBJAsync(files, postLoading);

      expect(mockLoadAsync).toHaveBeenCalledTimes(1);
      expect(postLoading).toHaveBeenCalledWith([mockModel]);
    });

    it('should use THREE.LoadingManager', async () => {
      const mockModel = new THREE.Group();
      const { OBJLoader } = await import('three/examples/jsm/loaders/OBJLoader.js');
      let capturedManager;
      
      OBJLoader.mockImplementation((manager) => {
        capturedManager = manager;
        return {
          loadAsync: vi.fn().mockResolvedValue(mockModel)
        };
      });

      await loadOBJAsync(['test.obj'], vi.fn());

      expect(capturedManager).toBeInstanceOf(THREE.LoadingManager);
    });

    it('should handle empty file array', async () => {
      const postLoading = vi.fn();
      await loadOBJAsync([], postLoading);
      expect(postLoading).toHaveBeenCalledWith([]);
    });
  });

  describe('Loading Progress', () => {
    it('should log progress for GLTF loading', async () => {
      const mockModel = { scene: new THREE.Group() };
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
      const mockLoadAsync = vi.fn().mockResolvedValue(mockModel);
      GLTFLoader.mockImplementation(() => ({
        loadAsync: mockLoadAsync
      }));

      await loadGLTFAsync(['test.gltf'], vi.fn());

      // Check that the onProgress callback was passed
      expect(mockLoadAsync).toHaveBeenCalledWith('test.gltf', expect.any(Function));
    });

    it('should log progress for OBJ loading', async () => {
      const mockModel = new THREE.Group();
      const { OBJLoader } = await import('three/examples/jsm/loaders/OBJLoader.js');
      const mockLoadAsync = vi.fn().mockResolvedValue(mockModel);
      OBJLoader.mockImplementation(() => ({
        loadAsync: mockLoadAsync
      }));

      await loadOBJAsync(['test.obj'], vi.fn());

      // Check that the onProgress callback was passed
      expect(mockLoadAsync).toHaveBeenCalledWith('test.obj', expect.any(Function));
    });
  });
});
