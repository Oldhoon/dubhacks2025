# Rock Projectile Trajectory Implementation - Summary

## Overview
This document describes the implementation of the rock projectile system with proper parabolic trajectory for the catapult in the dubhacks2025 game.

## Problem Statement
The original issue described:
- Rock projectile not following proper parabolic trajectory (wave-like motion)
- Inconsistent landing positions for different target tiles
- Red parabolic line not being followed by the rock
- Issue likely related to coordinate frame/reference system misuse

## Solution Implemented

### 1. Projectile Class (`src/projectile.js`)
Created a new `Projectile` class that:
- Uses **world-space coordinates** exclusively for all calculations
- Implements proper physics-based parabolic trajectory
- Calculates initial velocity based on target distance and launch angle
- Updates position using kinematic equations:
  - `x(t) = x₀ + vₓ * t`
  - `y(t) = y₀ + vᵧ * t - 0.5 * g * t²`
  - `z(t) = z₀ + vᵧ * t`
- Visualizes trajectory with red parabolic line
- Loads and animates rock model during flight

**Key Design Decision**: All position calculations are performed in world space (not local/parent space) to ensure consistent behavior regardless of the catapult's position or orientation.

### 2. Integration with Targeting System (`src/targetingSystem.js`)
Enhanced the existing targeting system to:
- Show trajectory preview when targeting mode is active
- Fire projectiles on Enter key press
- Manage active projectiles and update them each frame
- Clean up trajectory previews when exiting targeting mode

### 3. Main Loop Update (`src/main.js`)
- Modified to pass `deltaTime` to targeting system update
- Ensures projectiles are updated smoothly each frame

## Usage Instructions

### How to Use the Projectile System:
1. Drag the first portrait (catapult) from the selection plane to a tile
2. Select the catapult by pressing 'E' (cycles through selectable objects)
3. Press Spacebar to enter targeting mode
   - A red target indicator appears on the grid
   - A red parabolic trajectory line shows the flight path
4. Use WASD to move the target:
   - W: Move target north (row -)
   - S: Move target south (row +)
   - A: Move target west (col -)
   - D: Move target east (col +)
5. Press Enter to fire the projectile
   - Rock follows the red trajectory line exactly
   - Lands precisely at the target position
6. Press Spacebar again to exit targeting mode

## Technical Details

### Coordinate System
- **World Space**: All projectile calculations use absolute world coordinates
- **Benefits**: Consistent behavior regardless of parent object transformations
- **Ensures**: Landing position is the same for any target tile, solving the consistency issue

### Trajectory Calculation
The trajectory uses standard projectile motion physics:

```
Given:
- Start position (x₀, y₀, z₀) in world space
- Target position (xₜ, yₜ, zₜ) in world space
- Launch angle θ (45°)
- Gravity g (9.8 m/s²)

Calculate:
- Horizontal distance d = √[(xₜ-x₀)² + (zₜ-z₀)²]
- Initial velocity v₀ = √[(g*d²) / (2*(d*tan(θ) - Δy)*cos²(θ))]
- Velocity components:
  - vₓ = v₀ * cos(θ) * (Δx/d)
  - vᵧ = v₀ * sin(θ)
  - vᵤ = v₀ * cos(θ) * (Δz/d)
```

### Testing
Created comprehensive unit tests (`tests/projectile.test.js`) that verify:
1. ✅ Projectile lands at target position (within tolerance)
2. ✅ Projectile follows parabolic path (apex higher than start/end)
3. ✅ Trajectory is consistent for different target tiles
4. ✅ Position calculations use world space coordinates

All tests pass successfully.

## Files Modified/Created

### Created:
- `src/projectile.js` - Main projectile class with physics
- `tests/projectile.test.js` - Unit tests for trajectory calculations

### Modified:
- `src/targetingSystem.js` - Added projectile firing and preview
- `src/main.js` - Updated to pass deltaTime to targeting system

## Results

### Issues Fixed:
✅ Projectile now follows proper parabolic trajectory (no wave motion)
✅ Landing position is consistent regardless of target tile location
✅ Red trajectory line accurately predicts projectile path
✅ Projectile follows the red line exactly
✅ All coordinate calculations use world space (no frame mismatch)

### Behavior:
- Smooth parabolic arc from catapult to target
- Rock rotates naturally during flight
- Trajectory preview updates in real-time as target moves
- Precise landing at target tile center

## Build Status
- ✅ All new tests pass (4/4)
- ✅ Build completes successfully
- ✅ No runtime errors
- ⚠️ 1 pre-existing test failure (unrelated to this change)
