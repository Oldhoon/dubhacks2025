export type CodeEvent =
  | string
  | string[]
  | {
      type: 'declare';
      id: string;
      baseType: string;
      varName: string;
    }
  | {
      type: 'update';
      id: string;
      baseType: string;
      varName: string;
      count: number;
    }
  | {
      type: 'pointer';
      id: string;
      baseType: string;
      varName: string;
      pointerName: string;
      hasTarget: boolean;
      targetVarName?: string;
    };
