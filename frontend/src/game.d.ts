declare module "./gameScene/createGame.js" {
  import type { CodeEvent } from "./types";
  export interface GameExperienceOptions {
    onCodeEvent?: (event: CodeEvent) => void;
  }
  export default function createGameExperience(
    canvas: HTMLCanvasElement,
    options?: GameExperienceOptions
  ): () => void;
}

declare module "../gameScene/createGame.js" {
  import type { CodeEvent } from "../types";
  export interface GameExperienceOptions {
    onCodeEvent?: (event: CodeEvent) => void;
  }
  export default function createGameExperience(
    canvas: HTMLCanvasElement,
    options?: GameExperienceOptions
  ): () => void;
}
