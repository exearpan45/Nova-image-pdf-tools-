import { ThemeMode } from '../types/tools';

const THEME_KEY = 'nova_theme';
const RECENT_KEY = 'nova_recent_tools';
const FAVORITES_KEY = 'nova_favorites';

export function getStoredTheme(): ThemeMode {
  try {
    const val = localStorage.getItem(THEME_KEY);
    if (val === 'light' || val === 'dark' || val === 'system') {
      return val;
    }
  } catch {
    // Ignore localStorage errors
  }
  return 'system';
}

export function setStoredTheme(theme: ThemeMode): void {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Ignore localStorage errors
  }
}

export function getStoredRecentTools(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.slice(0, 10);
    }
  } catch {
    // Ignore
  }
  return [];
}

export function addRecentTool(toolId: string): void {
  try {
    const list = getStoredRecentTools().filter((id) => id !== toolId);
    list.unshift(toolId);
    localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, 10)));
  } catch {
    // Ignore
  }
}

export function clearRecentTools(): void {
  try {
    localStorage.removeItem(RECENT_KEY);
  } catch {
    // Ignore
  }
}

export function getStoredFavorites(): string[] {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // Ignore
  }
  return [];
}

export function toggleFavoriteTool(toolId: string): boolean {
  try {
    const favs = new Set(getStoredFavorites());
    let isNowFav = false;
    if (favs.has(toolId)) {
      favs.delete(toolId);
      isNowFav = false;
    } else {
      favs.add(toolId);
      isNowFav = true;
    }
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(Array.from(favs)));
    return isNowFav;
  } catch {
    return false;
  }
}
