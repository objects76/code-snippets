class Storage {
  constructor(key, isSession) {
    this.storage = isSession ? window.sessionStorage : window.localStorage;
    this._key = key || `default-for-${isSession ? "session" : "local"}`;
    this._data = this._load();
  }

  has(k) {
    return !!this._data[k];
  }

  get(k) {
    return this._data[k];
  }

  set(k, v) {
    this._data[k] = v;
    this._save();
  }

  remove(k) {
    delete this._data[k];
    this._save();
  }

  clear() {
    this.storage.removeItem(this._key);
  }

  _load() {
    return JSON.parse(this.storage.getItem(this._key)) || {};
  }

  _save() {
    this.storage.setItem(this._key, JSON.stringify(this._data));
  }
}

// const storage = new Storage();
// export default storage;
