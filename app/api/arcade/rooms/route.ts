import {proxyArcade} from '../../../../server/arcade/proxy';
export async function POST(request:Request){return proxyArcade(request);}
