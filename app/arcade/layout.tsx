import type {Metadata} from 'next';
import '../../components/arcade/arcade.css';
export const metadata:Metadata={title:'Cuộc đua giành khách — Thành phố đổi luật',description:'Game hành động nhiều người: tranh đơn, lướt, cản đường và tìm lối đi của riêng mình.'};
export default function ArcadeLayout({children}:{children:React.ReactNode}){return <div className="arcade-root">{children}</div>;}
