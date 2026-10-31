import { useState, useEffect, useCallback } from 'react';
import { Item } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || '';

export function useShoppingList() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/items?include_completed=true`);
      if (!res.ok) throw new Error('Erreur lors du chargement des articles');
      const data: Item[] = await res.json();
      setItems(data || []);
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Impossible de joindre le serveur');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch and Realtime SSE connection
  useEffect(() => {
    fetchItems();

    const streamUrl = `${API_BASE}/api/stream`;
    const eventSource = new EventSource(streamUrl);

    eventSource.onopen = () => {
      setConnected(true);
      setError(null);
    };

    eventSource.onerror = () => {
      setConnected(false);
    };

    // When backend broadcasts changes, refresh list
    const handleRemoteChange = () => {
      fetchItems();
    };

    eventSource.addEventListener('item_added', handleRemoteChange);
    eventSource.addEventListener('item_updated', handleRemoteChange);
    eventSource.addEventListener('item_deleted', handleRemoteChange);
    eventSource.addEventListener('items_added', handleRemoteChange);
    eventSource.addEventListener('items_updated', handleRemoteChange);
    eventSource.addEventListener('items_cleared', handleRemoteChange);

    return () => {
      eventSource.close();
    };
  }, [fetchItems]);

  const triggerHaptic = () => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(25);
      } catch {
        // Ignore vibration errors if blocked
      }
    }
  };

  const addItem = async (name: string, quantity?: string, category?: string, notes?: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, quantity, category, notes }),
      });
      if (!res.ok) throw new Error("Erreur lors de l'ajout");
      triggerHaptic();
      await fetchItems();
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const toggleItem = async (id: number) => {
    triggerHaptic();
    // Optimistic UI update
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, completed: !it.completed } : it))
    );

    try {
      const res = await fetch(`${API_BASE}/api/items/${id}/toggle`, {
        method: 'PATCH',
      });
      if (!res.ok) throw new Error('Erreur mise à jour');
      await fetchItems();
    } catch (err: any) {
      setError(err.message);
      await fetchItems(); // Revert on error
    }
  };

  const deleteItem = async (id: number) => {
    triggerHaptic();
    setItems((prev) => prev.filter((it) => it.id !== id));
    try {
      const res = await fetch(`${API_BASE}/api/items/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Erreur suppression');
      await fetchItems();
    } catch (err: any) {
      setError(err.message);
      await fetchItems();
    }
  };

  const clearCompleted = async () => {
    triggerHaptic();
    try {
      const res = await fetch(`${API_BASE}/api/items/clear-completed`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Erreur nettoyage');
      await fetchItems();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return {
    items,
    loading,
    connected,
    error,
    addItem,
    toggleItem,
    deleteItem,
    clearCompleted,
    refresh: fetchItems,
  };
}
