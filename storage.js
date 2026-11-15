/**
 * PixelImage (.pxi) Studio - Main Canvas Controller
 * @file app.js
 * @author BjornEriksson (https://github.com)
 * @version 0.2.0-beta
 */

/**
 * PixelEcosystem - IndexedDB Autosave & Cloud Sync Hook
 * Stores binary .pxi / .pxb ArrayBuffers locally in the browser to survive
 * page reloads, accidental navigation, and power outages.
 */
const ProjectStorage = {
  DB_NAME: 'PixelEcosystemDB',
  STORE_NAME: 'autosave_projects',
  DB_VERSION: 1,
  syncTimer: null,

  openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          db.createObjectStore(this.STORE_NAME);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async saveTmp(projectKey, arrayBuffer, onServerSync = null) {
    try {
      const db = await this.openDB();
      const tx = db.transaction(this.STORE_NAME, 'readwrite');
      tx.objectStore(this.STORE_NAME).put(arrayBuffer, projectKey);

      // Optional debounced server sync hook for future Banner Network integration
      if (typeof onServerSync === 'function') {
        clearTimeout(this.syncTimer);
        this.syncTimer = setTimeout(() => {
          onServerSync(projectKey, arrayBuffer);
        }, 2000);
      }
    } catch (err) {
      console.warn('Autosave to IndexedDB failed:', err);
    }
  },

  async loadTmp(projectKey) {
    try {
      const db = await this.openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(this.STORE_NAME, 'readonly');
        const req = tx.objectStore(this.STORE_NAME).get(projectKey);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.warn('Failed to load autosave from IndexedDB:', err);
      return null;
    }
  }
};
