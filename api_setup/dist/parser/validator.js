export class ActionValidator {
    constructor(level) {
        this.level = level;
        this.i = 0;
    }
    processAction(a) {
        const step = this.level.hintSteps[this.i];
        if (!step)
            return "✅ already complete";
        if (a.actionId === step.expectedAction) {
            this.i++;
            return this.i === this.level.hintSteps.length
                ? `🏆 Level Complete: ${this.level.name}`
                : `✅ Correct. Next: ${this.level.hintSteps[this.i].hint}`;
        }
        return `❌ Expected ${step.expectedAction}, got ${a.actionId}`;
    }
}
