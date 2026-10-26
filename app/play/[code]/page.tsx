import RoomClient from '../../../components/game/RoomClient';
export default async function Player({params}:{params:Promise<{code:string}>}){const {code}=await params;return <RoomClient code={code} role="team"/>;}
