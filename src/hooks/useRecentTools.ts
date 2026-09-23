import { useCallback, useState } from 'react';
import {
  addRecentTool as persistAddRecent,
  clearRecentTools as persistClearRecent,
  getStoredRecentTools,
} from '../utils/storage';

export function useRecentTools() {
  const [recentIds, setRecentIds] = useState<string[]>(() => getStoredRecentTools());

  const addRecent = useCallback((toolId: string) => {
    persistAddRecent(toolId);
    setRecentIds(getStoredRecentTools());
  }, []);

  const clearRecent = useCallback(() => {
    persistClearRecent();
    setRecentIds([]);
  }, []);

  return { recentIds, addRecent, clearRecent };
}
