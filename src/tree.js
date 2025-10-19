import TerrainAsset from './terrainAsset.js';

const DEFAULT_MODEL_PATH = 'assets/sprites/tree/scene.gltf';
const DEFAULT_SCALE = { x: 1, y: 1, z: 1 };
const DEFAULT_OFFSET = { x: 0, y: 0.25, z: 0 };
const DEFAULT_FIT_RATIO = 1;

export default class Tree extends TerrainAsset {
    constructor(options = {}) {
        super({
            name: 'tree',
            modelPath: DEFAULT_MODEL_PATH,
            scale: options.scale ?? DEFAULT_SCALE,
            offset: options.offset ?? DEFAULT_OFFSET,
            fitRatio: options.fitRatio ?? DEFAULT_FIT_RATIO
        });
    }
}
