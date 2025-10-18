# DubHacks 2025 - Low-Poly Game

A low-poly style isometric game built with Three.js.

## Features

- **Low-poly art style** with flat shading
- **Isometric camera view** using orthographic projection
- **Flat plane terrain** (20x20 units)
- **Character on screen** (red capsule placeholder)
- **Basic lighting setup**:
  - Ambient light for overall illumination
  - Directional light with shadows for depth

## Setup

### Installation

```bash
npm install
```

### Development

Run the development server:

```bash
npm run dev
```

Then open your browser to the URL shown in the terminal (typically http://localhost:5173).

### Build

Build for production:

```bash
npm run build
```

## Project Structure

- `index.html` - Entry point HTML file
- `src/main.js` - Main game script with Three.js setup
- `package.json` - Dependencies and scripts

## Technical Details

- **Camera**: Orthographic camera positioned at (10, 10, 10) for isometric view
- **Lighting**: Ambient (0.5 intensity) + Directional (0.8 intensity) with shadows
- **Terrain**: Green flat plane with low-poly segmentation
- **Character**: Red capsule geometry with flat shading
