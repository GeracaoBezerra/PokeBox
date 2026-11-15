export class LocalUserStore {
  constructor(key = "pokebox.user") { this.key = key; }
  get() { try { return JSON.parse(localStorage.getItem(this.key)); } catch { return null; } }
  set(user) { try { localStorage.setItem(this.key, JSON.stringify(user)); } catch { return; } }
  clear() { try { localStorage.removeItem(this.key); } catch { return; } }
}
