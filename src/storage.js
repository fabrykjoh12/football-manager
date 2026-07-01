(function (global) {
  "use strict";

  const SAVE_KEY = "touchline-lite-save";

  function hasSave() {
    try {
      return !!global.localStorage.getItem(SAVE_KEY);
    } catch (error) {
      return false;
    }
  }

  function save(state) {
    try {
      state.lastSavedAt = new Date().toISOString();
      global.localStorage.setItem(SAVE_KEY, JSON.stringify(state));
      return { ok: true };
    } catch (error) {
      return { ok: false, message: error.message };
    }
  }

  function load() {
    try {
      const raw = global.localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return global.FMLEngine.migrateState(parsed);
    } catch (error) {
      return null;
    }
  }

  function clear() {
    try {
      global.localStorage.removeItem(SAVE_KEY);
      return { ok: true };
    } catch (error) {
      return { ok: false, message: error.message };
    }
  }

  function exportSave(state) {
    return JSON.stringify(state, null, 2);
  }

  function importSave(json) {
    const parsed = JSON.parse(json);
    return global.FMLEngine.migrateState(parsed);
  }

  global.FMLStorage = {
    SAVE_KEY,
    hasSave,
    save,
    load,
    clear,
    exportSave,
    importSave
  };
})(typeof window !== "undefined" ? window : globalThis);
