import TerrainAsset from './terrainAsset.js';

const DEFAULT_MODEL_PATH = 'assets/sprites/potion/scene.gltf';
const DEFAULT_SCALE = { x: 1, y: 1, z: 1 };
const DEFAULT_OFFSET = { x: 0, y: 0, z: 0 };
const DEFAULT_FIT_RATIO = 0.6;

export default class Potion extends TerrainAsset {
    constructor(options = {}) {
        super({
            name: 'potion',
            modelPath: DEFAULT_MODEL_PATH,
            scale: options.scale ?? DEFAULT_SCALE,
            offset: options.offset ?? DEFAULT_OFFSET,
            fitRatio: options.fitRatio ?? DEFAULT_FIT_RATIO
        });
    }
}
