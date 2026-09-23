import { useCallback, useState } from 'react';
import {
  getStoredFavorites,
  toggleFavoriteTool as persistToggleFavorite,
} from '../utils/storage';

export function useFavorites() {
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => getStoredFavorites());

  const toggleFavorite = useCallback((toolId: string) => {
    persistToggleFavorite(toolId);
    setFavoriteIds(getStoredFavorites());
  }, []);

  const isFavorite = useCallback(
    (toolId: string) => favoriteIds.includes(toolId),
    [favoriteIds],
  );

  return { favoriteIds, toggleFavorite, isFavorite };
}
