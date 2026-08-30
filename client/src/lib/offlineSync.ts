import { getSupabase } from "@/lib/supabase";

type SyncRecord = { id: string; table: "cbc_grades" | "daily_attendance" | "cbc_portfolio_entries"; payload: Record<string, unknown>; createdAt: number };
const DB_NAME = "menwe-offline-sync";
const STORE = "outbox";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function queueOffline(table: SyncRecord["table"], payload: Record<string, unknown>) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put({ id: crypto.randomUUID(), table, payload, createdAt: Date.now() } satisfies SyncRecord);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function readAll(): Promise<SyncRecord[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE, "readonly").objectStore(STORE).getAll();
    request.onsuccess = () => resolve(request.result as SyncRecord[]);
    request.onerror = () => reject(request.error);
  });
}

async function remove(id: string) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function syncOfflineQueue() {
  if (!navigator.onLine) return { synced: 0, pending: (await readAll()).length };
  const supabase = getSupabase();
  let synced = 0;
  for (const item of await readAll()) {
    try {
      const conflict = item.table === "daily_attendance" ? "date,learner_upi" : item.table === "cbc_grades" ? "learner_upi,grade_level,learning_area,term" : "learner_upi,grade_level,term,learning_area,strand,substrand,sba_title";
      const { error } = await supabase.from(item.table).upsert(item.payload, { onConflict: conflict });
      if (error) throw error;
      await remove(item.id);
      synced++;
    } catch {
      // Keep failed records queued for the next online retry.
    }
  }
  return { synced, pending: (await readAll()).length };
}

export function installOfflineSync() {
  const handler = () => void syncOfflineQueue();
  window.addEventListener("online", handler);
  void syncOfflineQueue();
  return () => window.removeEventListener("online", handler);
}
