declare module "./game.js" {
  export function createOrbGame(
    canvas: HTMLCanvasElement,
    options?: { onAdd?: (lines: string[] | string) => void }
  ): () => void;
}
