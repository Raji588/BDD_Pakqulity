/**
 * Injects a wildcard `{ feature: '*' }` permission record into the app's IndexedDB
 * ('quality' DB, 'data' store, key 'permissions') and sets localStorage.selectedFacility.
 * The app reads this client-side and treats it as full access, regardless of what the
 * signed-in account is actually authorized for server-side - it does not grant any real
 * backend permission. Requires a page.reload() after calling this to take effect, since
 * permissions are read once at load time.
 */
async function grantFullAccess(page) {
  await page.evaluate(() => {
    localStorage.setItem('selectedFacility', '2');
  });

  await page.evaluate(async () => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('quality', 1);
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('data')) {
          db.createObjectStore('data', { keyPath: 'key' });
        }
      };
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction('data', 'readwrite');
        const store = tx.objectStore('data');
        store.put({ key: 'permissions', value: [{ feature: '*' }] });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      };
      request.onerror = () => reject(request.error);
    });
  });
}

module.exports = { grantFullAccess };
