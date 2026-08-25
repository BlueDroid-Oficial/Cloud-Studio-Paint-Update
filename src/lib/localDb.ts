// Simple, robust IndexedDB storage for local drafts and autosaves
// Works across all modern and legacy browsers without the 5MB quota limit of localStorage

const DB_NAME = "StudioPaintDB";
const STORE_NAME = "projects";
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB not supported"));
      return;
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function setLocalDraft(id: string, data: any): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.put({ id, ...data, updatedAt: new Date().toISOString() });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn("IndexedDB setLocalDraft failed, falling back to localStorage", e);
    try {
      localStorage.setItem(`draft_${id}`, JSON.stringify(data));
    } catch (err) {
      console.error("LocalStorage fallback also failed:", err);
    }
  }
}

export async function getLocalDraft(id: string): Promise<any> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);
      req.onsuccess = () => {
        if (req.result) resolve(req.result);
        else {
          const fallback = localStorage.getItem(`draft_${id}`);
          resolve(fallback ? JSON.parse(fallback) : null);
        }
      };
      req.onerror = () => {
        const fallback = localStorage.getItem(`draft_${id}`);
        resolve(fallback ? JSON.parse(fallback) : null);
      };
    });
  } catch (e) {
    const fallback = localStorage.getItem(`draft_${id}`);
    return fallback ? JSON.parse(fallback) : null;
  }
}

export async function getAllLocalDrafts(): Promise<any[]> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  } catch (e) {
    return [];
  }
}

export async function deleteLocalDraft(id: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    });
  } catch (e) {
    localStorage.removeItem(`draft_${id}`);
  }
}
