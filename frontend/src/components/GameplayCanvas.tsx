import { useEffect, useRef } from "react";
import PanelHeader from "./PanelHeader";
import createGameExperience from "../gameScene/createGame.js";

export type GameplayCanvasProps = {
  onAdd: (lines: string[] | string) => void;
  onClose: () => void;
  onClear: () => void;
};

export default function GameplayCanvas({
  onAdd,
  onClose,
  onClear,
}: GameplayCanvasProps) {
  void onAdd;
  void onClose;
  void onClear;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;

    const dispose = createGameExperience(canvasEl);

    return () => {
      dispose?.();
    };
  }, []);

  return (
    <div className="panel panel-col">
      <PanelHeader title="Gameplay" subtitle="Interact directly with the battlefield" />

      <div className="card gameplay">
        <canvas ref={canvasRef} className="gameplay-canvas" />
      </div>
    </div>
  );
}
