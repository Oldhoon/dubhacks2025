# Project Plan

## Vision
- Build a 3D, low-poly strategy experience centered on modular terrain tiles and interactive siege equipment.

## Core Components (Current)
- Terrain grid composed of reusable `Terrain` tiles (all grass textured for now).
- `Catapult` class that loads a GLTF model, scales it, and attaches to a tile.
- `Crosshair` class rendering a line-segment reticle parented to the camera for targeting feedback.
- Main scene (`src/main.js`) managing camera, lighting, character placeholder, tile placement, and object integration.

## Near-Term Objectives
- Implement player input for moving/rotating the catapult and selecting tiles.
- Add projectile logic and basic physics or animation for launching.
- Expand tile variety (stone, wall, structure) with interactions or gameplay effects.
- Integrate UI overlay (health, resources, objective prompts).

## Technical Notes
- Three.js powers rendering; loaders and helpers live under `src/`.
- Terrain tiles expect texture paths under `assets/tiles/Texture/`.
- Camera is added to the scene; crosshair is a child of the camera positioned along the -Z axis.
- Keep new scene entities encapsulated (mirroring `Catapult` and `Crosshair`) for reuse and clarity.

## Open Questions
- Should terrain be data-driven (e.g., JSON map) for quick iteration?
- What gameplay loop ties siege mechanics with tile interactions?
- How will multiplayer or AI opponents fit into the architecture?

## Reference Checklist
- [ ] Player controls & interactions
- [ ] Projectile/physics system
- [ ] Tile diversity & map editor
- [ ] Audio and VFX polish
- [ ] Deployment pipeline / bundling strategy
