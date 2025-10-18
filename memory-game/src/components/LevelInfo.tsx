import React from "react";
import PanelHeader from "./PanelHeader";

export default function LevelInfo({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="panel panel-col">
      <PanelHeader title="Level" subtitle="Objective & context" />
      <div className="card pad">
        <div className="level-title">{title}</div>
        <p className="level-desc">{description}</p>
      </div>
    </div>
  );
}
