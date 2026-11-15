import { ApiError } from "@/lib/api";
import { expireOrder, type Order } from "../order";

// SEMENTARA: IndexedDB menyimpan pesanan dan berkas bukti di browser yang sama.
// Semua perubahan stok/pesanan diserialkan oleh transaksi readwrite pada object store ini.
const STORE = "orders";
let database: Promise<IDBDatabase> | undefined;

/** Dikirim setiap ada pesanan tersimpan, supaya hitungan seperti lencana Admin ikut segar. */
export const ORDERS_CHANGED = "pickathrift:orders-changed";

function openOrders() {
  database ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("pickathrift.checkout", 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      database = undefined;
      reject(storageError());
    };
  });
  return database;
}

function storageError() {
  return new ApiError(503, "Penyimpanan pesanan tidak dapat diakses. Coba lagi.");
}

export async function withOrders<T>(
  run: (orders: Order[], save: (order: Order) => void, now: number) => T,
): Promise<T> {
  const db = await openOrders();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, "readwrite");
    const store = transaction.objectStore(STORE);
    const request = store.getAll();
    let result: T;
    let failed = false;
    let failure: unknown;
    let changed = false;

    request.onsuccess = () => {
      const now = Date.now();
      const save = (order: Order) => {
        changed = true;
        store.put(order);
      };
      const orders = (request.result as Order[]).map((order) => {
        const current = expireOrder(order, now);
        if (current !== order) save(current);
        return current;
      });
      try {
        result = run(orders, save, now);
      } catch (error) {
        // Galat bisnis tidak membatalkan pembaruan pesanan yang kedaluwarsa.
        failed = true;
        failure = error;
      }
    };
    transaction.oncomplete = () => {
      if (changed) window.dispatchEvent(new Event(ORDERS_CHANGED));
      if (failed) reject(failure);
      else resolve(result);
    };
    transaction.onabort = () => reject(storageError());
  });
}
