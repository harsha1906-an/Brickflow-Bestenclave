import { createRoot } from 'react-dom/client';
import './config/dayjs';

import RootApp from './RootApp';
import { registerSW } from 'virtual:pwa-register';

const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('New content available, please refresh.');
  },
  onOfflineReady() {
    console.log('App ready to work offline');
  },
  onRegistered(r) {
    console.log('Service Worker registered:', r);
  },
  onRegisterError(error) {
    console.log('Service Worker registration error:', error);
  }
});

const root = createRoot(document.getElementById('root'));
root.render(<RootApp />);
