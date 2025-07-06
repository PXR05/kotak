import { browser } from "$app/environment";

export interface AppSettings {
  sidebarSide: "left" | "right";
}

const DEFAULT_SETTINGS: AppSettings = {
  sidebarSide: "left",
};

class SettingsStore {
  #settings = $state<AppSettings>({ ...DEFAULT_SETTINGS });
  #initialized = $state(false);

  constructor() {
    if (browser) {
      this.loadSettings();
    }
  }

  get settings() {
    return this.#settings;
  }

  get initialized() {
    return this.#initialized;
  }

  private loadSettings() {
    try {
      const stored = localStorage.getItem("app-settings");
      if (stored) {
        const parsedSettings = JSON.parse(stored);
        this.#settings = { ...DEFAULT_SETTINGS, ...parsedSettings };
      }
    } catch (error) {
      console.warn("Failed to load settings from localStorage:", error);
      this.#settings = { ...DEFAULT_SETTINGS };
    } finally {
      this.#initialized = true;
    }
  }

  private saveSettings() {
    if (!browser) return;

    try {
      localStorage.setItem("app-settings", JSON.stringify(this.#settings));
    } catch (error) {
      console.warn("Failed to save settings to localStorage:", error);
    }
  }

  updateSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    this.#settings[key] = value;
    this.saveSettings();

    if (browser) {
      window.dispatchEvent(
        new CustomEvent(`setting-changed:${key}`, {
          detail: { key, value },
        })
      );
    }
  }

  getSetting<K extends keyof AppSettings>(key: K): AppSettings[K] {
    return this.#settings[key];
  }

  resetSettings() {
    this.#settings = { ...DEFAULT_SETTINGS };
    this.saveSettings();
  }

  resetSetting<K extends keyof AppSettings>(key: K) {
    this.#settings[key] = DEFAULT_SETTINGS[key];
    this.saveSettings();
  }
}

export const settings = new SettingsStore();

export function updateSidebarSide(side: "left" | "right") {
  settings.updateSetting("sidebarSide", side);
}

export function getSidebarSide(): "left" | "right" {
  return settings.getSetting("sidebarSide");
}
