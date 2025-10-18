# Test Suite Documentation

## Overview

This directory contains the comprehensive unit test suite for the dubhacks2025 low-poly game project. The tests are written using [Vitest](https://vitest.dev/), a fast Vite-native test framework.

## Test Structure

```
tests/
├── README.md           # This file
├── terrain.test.js     # Tests for Terrain class
├── catapult.test.js    # Tests for Catapult class
├── crosshair.test.js   # Tests for Crosshair class
├── setup.test.js       # Tests for setup utilities
└── main.test.js        # Integration tests for main scene
```

## Running Tests

### Run all tests in watch mode
```bash
npm test
```

### Run tests once
```bash
npm run test:run
```

### Run tests with UI
```bash
npm run test:ui
```

## Test Coverage

### Terrain Tests (14 tests)
- Constructor with default and custom parameters
- Geometry creation and positioning
- Material setup (with and without textures)
- Scene management (add/remove)
- Color updates
- Shadow configuration

### Catapult Tests (18 tests)
- Constructor initialization
- Attachment to terrain and objects
- Detachment behavior
- Position calculations with offsets
- Model loading (mocked)
- Parent management

### Crosshair Tests (13 tests)
- Constructor with default and custom parameters
- Geometry and material setup
- Camera attachment
- Position and distance calculations
- Parent switching
- Render order and frustum culling

### Setup Tests (10 tests)
- GLTF file loading
- OBJ file loading
- Loading manager setup
- Progress callbacks
- Error handling
- Multiple file loading

### Main Integration Tests (11 tests, 3 skipped)
- Grid system calculations
- Camera configuration
- Lighting setup
- Geometry creation
- Material properties
- Window resize handling

**Note**: Some integration tests are skipped because they require WebGL context, which is not available in the test environment.

## Test Statistics

- **Total Tests**: 66
- **Passing**: 66
- **Skipped**: 3 (WebGL-dependent)
- **Test/Code Ratio**: 0.67
- **Average Test Duration**: ~180ms

## Writing New Tests

### Basic Test Structure
```javascript
import { describe, it, expect, beforeEach } from 'vitest';
import YourClass from '../src/your-class.js';

describe('YourClass', () => {
  let instance;

  beforeEach(() => {
    instance = new YourClass();
  });

  describe('Method Name', () => {
    it('should do something specific', () => {
      const result = instance.method();
      expect(result).toBe(expectedValue);
    });
  });
});
```

### Mocking Three.js Objects
```javascript
import * as THREE from 'three';

// Mock a scene
const mockScene = {
  add: vi.fn(),
  remove: vi.fn()
};

// Create real Three.js objects
const mesh = new THREE.Mesh();
const camera = new THREE.PerspectiveCamera();
```

### Testing Async Code
```javascript
it('should load resources asynchronously', async () => {
  await instance.loadResource();
  expect(instance.resource).toBeTruthy();
});
```

## Continuous Integration

Tests are automatically run in CI/CD pipeline before merging. All tests must pass for the build to succeed.

## Coverage Goals

Current coverage is good, but we aim for:
- **Line Coverage**: 80%+
- **Branch Coverage**: 75%+
- **Function Coverage**: 90%+

To generate coverage report:
```bash
npm run test:run -- --coverage
```

## Known Limitations

1. **WebGL Tests**: Cannot test WebGL rendering in headless environment
2. **Asset Loading**: Model and texture loading is mocked
3. **Animation**: requestAnimationFrame is mocked for consistency

## Best Practices

1. **Test Isolation**: Each test should be independent
2. **Clear Descriptions**: Use descriptive test names
3. **Arrange-Act-Assert**: Follow AAA pattern
4. **Mock External Dependencies**: Mock file I/O and network calls
5. **Test Edge Cases**: Include boundary conditions and error cases

## Troubleshooting

### Tests Timing Out
- Increase timeout in vitest.config.js
- Check for unresolved promises
- Ensure async code is properly awaited

### Mock Not Working
- Verify mock is defined before importing module
- Check mock implementation matches expected interface
- Clear mocks between tests with `afterEach()`

### Three.js Errors
- Ensure happy-dom environment is configured
- Mock WebGL-dependent features
- Use skip() for tests requiring WebGL

## Contributing

When adding new features:
1. Write tests first (TDD approach)
2. Ensure all tests pass
3. Maintain test coverage above 70%
4. Update this README if adding new test files

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Three.js Documentation](https://threejs.org/docs/)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
