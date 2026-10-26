export type Phase = 'lobby'|'answering'|'review'|'leaderboard'|'finished';
export type Draft = Record<string,{choiceId:string;seq:number}>;
export type MissionView = {id:string;title:string;context:string;fictional:true;tasks:{id:string;prompt:string;choices:{id:string;text:string}[]}[]};
export type LeaderboardRow = {rank:number;teamId:string;slot:number;name:string;score:number;roundScores:number[];correctCount:number};
export type Feedback = {roundIndex:number;missionTitle:string;score:number;answers:{taskId:string;prompt:string;selectedChoiceId:string|null;correctChoiceId:string;correctChoiceText:string;explanation:string;points:number;correct:boolean}[]};
export type RoomView = {role:'public'|'host'|'team';code:string;roomVersion:number;runId:string|null;serverNowMs:number;phase:Phase;roundIndex:number;deadlineMs:number|null;remainingMs:number;paused:boolean;roundTitle:string;expiresAtMs:number;teams:{slot:number;teamId:string;name:string;submitted:boolean}[];leaderboard:LeaderboardRow[];you?:{teamId:string;slot:number;name:string};mission?:MissionView;draft?:Draft;locked?:boolean;results?:Feedback[]};
export const ROUND_TITLES=['Nhận diện quyền lực','Ứng phó biến cố','Giữ quyền chủ động'];
