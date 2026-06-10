// Hotfix for SWR Issue #2719: Prevent SWRGlobalState cache deletion on remount
const originalWeakMapDelete = WeakMap.prototype.delete;
WeakMap.prototype.delete = function (key) {
  if (key && typeof key === 'object') {
    try {
      const val = this.get(key);
      if (Array.isArray(val) && val.length === 7 && typeof val[4] === 'function' && typeof val[6] === 'function') {
        // Prevent deletion of SWR cache provider from SWRGlobalState
        return true;
      }
    } catch (e) {
      // Ignore
    }
  }
  return originalWeakMapDelete.call(this, key);
};

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
