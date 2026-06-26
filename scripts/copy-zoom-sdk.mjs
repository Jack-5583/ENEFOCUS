import { copyFileSync, mkdirSync } from 'fs';
import { resolve } from 'path';

const dst = (f) => resolve('public/zoom-sdk', f);

mkdirSync('public/zoom-sdk', { recursive: true });
copyFileSync(resolve('node_modules/react/umd/react.production.min.js'), dst('react.js'));
copyFileSync(resolve('node_modules/react-dom/umd/react-dom.production.min.js'), dst('react-dom.js'));
copyFileSync(resolve('node_modules/@zoom/meetingsdk/dist/zoomus-websdk-embedded.umd.min.js'), dst('zoom-embedded.js'));
console.log('✓ Zoom SDK static assets copied to public/zoom-sdk/');
