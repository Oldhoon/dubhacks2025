export interface HintStep { hint: string; expectedAction: string; }

export interface LevelData {
  id: number; name: string;
  referenceCode: string[]; characters: string[];
  hintSteps: HintStep[]; expectedActions: string[];
  completionCondition?: string;
}

export interface PlayerAction { actionId: string; timestamp: number; }

export class ActionValidator {
  private i = 0;
  constructor(private level: LevelData) {}

  processAction(a: PlayerAction) {
    const step = this.level.hintSteps[this.i];
    if (!step) return "✅ already complete";
    if (a.actionId === step.expectedAction) {
      this.i++;
      return this.i === this.level.hintSteps.length
        ? `🏆 Level Complete: ${this.level.name}`
        : `✅ Correct. Next: ${this.level.hintSteps[this.i].hint}`;
    }
    return `❌ Expected ${step.expectedAction}, got ${a.actionId}`;
  }
}
