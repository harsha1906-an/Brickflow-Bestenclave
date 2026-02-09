import { createRoot } from 'react-dom/client';
import './config/dayjs';

import RootApp from './RootApp';
import { registerSW } from 'virtual:pwa-register';

registerSW({ immediate: true });

const root = createRoot(document.getElementById('root'));
root.render(<RootApp />);
