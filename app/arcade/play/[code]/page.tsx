import {ArcadeShell} from '../../../../components/arcade/ArcadeShell';
export default async function Page({params}:{params:Promise<{code:string}>}){const {code}=await params;return <ArcadeShell code={code} role="player"/>;}
