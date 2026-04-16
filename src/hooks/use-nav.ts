'use client';

import { useMemo } from 'react';
import type { NavItem, NavGroup } from '@/types';

export function useFilteredNavItems(items: NavItem[]) {
  return useMemo(() => {
    return items
      .filter((item) => {
        if (!item.access) return true;
        // Org-based access removed (no Clerk) — show all items for now
        // Page-level protection handles actual security via Better-Auth session
        return true;
      })
      .map((item) => {
        if (item.items && item.items.length > 0) {
          return { ...item, items: item.items.filter(() => true) };
        }
        return item;
      });
  }, [items]);
}

export function useFilteredNavGroups(groups: NavGroup[]) {
  const allItems = useMemo(() => groups.flatMap((g) => g.items), [groups]);
  const filteredItems = useFilteredNavItems(allItems);

  return useMemo(() => {
    const filteredSet = new Set(filteredItems.map((item) => item.title));
    return groups
      .map((group) => ({
        ...group,
        items: filteredItems.filter((item) =>
          group.items.some((gi) => gi.title === item.title && filteredSet.has(gi.title))
        )
      }))
      .filter((group) => group.items.length > 0);
  }, [groups, filteredItems]);
}
