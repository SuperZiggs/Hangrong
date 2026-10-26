export type Choice = { id: string; text: string };
export type Task = { id: string; prompt: string; choices: Choice[]; correctChoiceId: string; explanation: string; points: number };
export type Mission = { id: string; roundIndex: number; title: string; context: string; tasks: Task[]; sourceRefs: string[]; fictional: true };
