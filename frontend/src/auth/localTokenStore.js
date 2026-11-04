// I: interface pequena (get/set/clear).
export class LocalTokenStore {
  constructor(key = "pokebox.token") { this.key = key; }
  get() { try { return localStorage.getItem(this.key); } catch { return null; } }
  set(t) { try { localStorage.setItem(this.key, t); } catch { /* ignore */ } }
  clear() { try { localStorage.removeItem(this.key); } catch { /* ignore */ } }
}
