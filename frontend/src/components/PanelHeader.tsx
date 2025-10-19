import React from "react";

export default function PanelHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="panel-header">
      <div>
        <div className="panel-title">{title}</div>
        {subtitle && <div className="panel-subtitle">{subtitle}</div>}
      </div>
      {right}
    </div>
  );
}
