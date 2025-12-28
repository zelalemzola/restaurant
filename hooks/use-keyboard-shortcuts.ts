"use client";

import { useEffect, useCallback } from "react";

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  metaKey?: boolean;
  action: () => void;
  description: string;
  category?: string;
}

interface UseKeyboardShortcutsOptions {
  shortcuts: KeyboardShortcut[];
  enabled?: boolean;
}

export function useKeyboardShortcuts({
  shortcuts,
  enabled = true,
}: UseKeyboardShortcutsOptions) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Don't trigger shortcuts when user is typing in input fields
      const target = event.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.contentEditable === "true"
      ) {
        return;
      }

      const matchingShortcut = shortcuts.find((shortcut) => {
        const keyMatches =
          shortcut.key.toLowerCase() === event.key.toLowerCase();
        const ctrlMatches = !!shortcut.ctrlKey === event.ctrlKey;
        const altMatches = !!shortcut.altKey === event.altKey;
        const shiftMatches = !!shortcut.shiftKey === event.shiftKey;
        const metaMatches = !!shortcut.metaKey === event.metaKey;

        return (
          keyMatches && ctrlMatches && altMatches && shiftMatches && metaMatches
        );
      });

      if (matchingShortcut) {
        event.preventDefault();
        event.stopPropagation();
        matchingShortcut.action();
      }
    },
    [shortcuts, enabled]
  );

  useEffect(() => {
    if (enabled) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [handleKeyDown, enabled]);

  return { shortcuts };
}

// Common keyboard shortcuts for restaurant ERP
export const commonShortcuts = {
  // Navigation
  dashboard: {
    key: "d",
    ctrlKey: true,
    description: "Go to Dashboard",
    category: "Navigation",
  },
  inventory: {
    key: "i",
    ctrlKey: true,
    description: "Go to Inventory",
    category: "Navigation",
  },
  sales: {
    key: "s",
    ctrlKey: true,
    description: "Go to Sales",
    category: "Navigation",
  },
  analytics: {
    key: "a",
    ctrlKey: true,
    description: "Go to Analytics",
    category: "Navigation",
  },

  // Actions
  create: {
    key: "n",
    ctrlKey: true,
    description: "Create New Item",
    category: "Actions",
  },
  save: { key: "s", ctrlKey: true, description: "Save", category: "Actions" },
  search: {
    key: "f",
    ctrlKey: true,
    description: "Focus Search",
    category: "Actions",
  },
  export: {
    key: "e",
    ctrlKey: true,
    description: "Export Data",
    category: "Actions",
  },
  refresh: {
    key: "r",
    ctrlKey: true,
    description: "Refresh Data",
    category: "Actions",
  },

  // Bulk Operations
  selectAll: {
    key: "a",
    ctrlKey: true,
    shiftKey: true,
    description: "Select All Items",
    category: "Bulk Operations",
  },
  bulkEdit: {
    key: "e",
    ctrlKey: true,
    shiftKey: true,
    description: "Bulk Edit Selected",
    category: "Bulk Operations",
  },
  bulkDelete: {
    key: "Delete",
    shiftKey: true,
    description: "Bulk Delete Selected",
    category: "Bulk Operations",
  },

  // Quick Actions
  quickSale: {
    key: "q",
    ctrlKey: true,
    description: "Quick Sale",
    category: "Quick Actions",
  },
  stockUsage: {
    key: "u",
    ctrlKey: true,
    description: "Record Stock Usage",
    category: "Quick Actions",
  },
  addProduct: {
    key: "p",
    ctrlKey: true,
    description: "Add Product",
    category: "Quick Actions",
  },

  // Utility
  help: {
    key: "?",
    shiftKey: true,
    description: "Show Keyboard Shortcuts",
    category: "Utility",
  },
  escape: {
    key: "Escape",
    description: "Close Dialog/Cancel",
    category: "Utility",
  },
};

// Hook for showing keyboard shortcuts help
export function useKeyboardShortcutsHelp() {
  const formatShortcut = (shortcut: KeyboardShortcut): string => {
    const keys = [];
    if (shortcut.ctrlKey) keys.push("Ctrl");
    if (shortcut.altKey) keys.push("Alt");
    if (shortcut.shiftKey) keys.push("Shift");
    if (shortcut.metaKey) keys.push("Cmd");
    keys.push(shortcut.key === " " ? "Space" : shortcut.key);
    return keys.join(" + ");
  };

  const groupShortcutsByCategory = (shortcuts: KeyboardShortcut[]) => {
    return shortcuts.reduce((groups, shortcut) => {
      const category = shortcut.category || "Other";
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(shortcut);
      return groups;
    }, {} as Record<string, KeyboardShortcut[]>);
  };

  return { formatShortcut, groupShortcutsByCategory };
}
