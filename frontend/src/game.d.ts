declare module "./gameScene/createGame.js" {
  export default function createGameExperience(canvas: HTMLCanvasElement): () => void;
}

declare module "../gameScene/createGame.js" {
  export default function createGameExperience(canvas: HTMLCanvasElement): () => void;
}
