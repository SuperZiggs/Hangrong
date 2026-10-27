import catalogue from '../../../docs/arcade/assets.catalog.json';
export const assetManifest=catalogue.items;
export const assetURL=(path:string)=>`/arcade/assets/${path}`;
export const courierFrames={idle:2,run:6,dash:2,bump:2,celebrate:6} as const;
export const playerPalette=[0x18a999,0xf26b5e,0x5964d8,0xffc857,0x56a5e8,0xd572b2,0x77ac58,0xf3a34e];
export const markerShapes=['circle','square','diamond','triangle'];
