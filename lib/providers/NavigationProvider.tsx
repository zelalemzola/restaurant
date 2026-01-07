"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";

interface NavigationState {
  currentPath: string;
  history: string[];
  canGoBack: boolean;
  previousPath: string | null;
}

interface NavigationContextType extends NavigationState {
  goBack: () => void;
  navigateTo: (path: string) => void;
  clearHistory: () => void;
  getBreadcrumbs: () => Array<{ label: string; href: string }>;
}

const NavigationContext = createContext<NavigationContextType | undefined>(
  undefined
);

interface NavigationProviderProps {
  children: ReactNode;
  maxHistorySize?: number;
}

export function NavigationProvider({
  children,
  maxHistorySize = 10,
}: NavigationProviderProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [navigationState, setNavigationState] = useState<NavigationState>({
    currentPath: pathname,
    history: [],
    canGoBack: false,
    previousPath: null,
  });

  // Update navigation state when pathname changes
  useEffect(() => {
    setNavigationState((prev) => {
      // Don't add the same path twice in a row
      if (prev.currentPath === pathname) {
        return prev;
      }

      const newHistory = [...prev.history];

      // Add current path to history if it's not already the last item
      if (prev.currentPath && prev.currentPath !== pathname) {
        newHistory.push(prev.currentPath);
      }

      // Limit history size
      if (newHistory.length > maxHistorySize) {
        newHistory.splice(0, newHistory.length - maxHistorySize);
      }

      return {
        currentPath: pathname,
        history: newHistory,
        canGoBack: newHistory.length > 0,
        previousPath:
          newHistory.length > 0 ? newHistory[newHistory.length - 1] : null,
      };
    });
  }, [pathname, maxHistorySize]);

  const goBack = () => {
    if (navigationState.canGoBack && navigationState.previousPath) {
      // Remove the last item from history and navigate to it
      setNavigationState((prev) => ({
        ...prev,
        history: prev.history.slice(0, -1),
        canGoBack: prev.history.length > 1,
        previousPath:
          prev.history.length > 1
            ? prev.history[prev.history.length - 2]
            : null,
      }));

      router.push(navigationState.previousPath);
    } else {
      // Fallback to dashboard if no history
      router.push("/dashboard");
    }
  };

  const navigateTo = (path: string) => {
    router.push(path);
  };

  const clearHistory = () => {
    setNavigationState((prev) => ({
      ...prev,
      history: [],
      canGoBack: false,
      previousPath: null,
    }));
  };

  const getBreadcrumbs = () => {
    const segments = navigationState.currentPath.split("/").filter(Boolean);
    const breadcrumbs: Array<{ label: string; href: string }> = [];

    let currentPath = "";

    segments.forEach((segment) => {
      currentPath += `/${segment}`;

      // Skip dynamic route segments
      if (segment.startsWith("[") || segment.includes("?")) {
        return;
      }

      // Convert segment to readable label
      const label = segment
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");

      breadcrumbs.push({
        label,
        href: currentPath,
      });
    });

    return breadcrumbs;
  };

  const contextValue: NavigationContextType = {
    ...navigationState,
    goBack,
    navigateTo,
    clearHistory,
    getBreadcrumbs,
  };

  return (
    <NavigationContext.Provider value={contextValue}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error("useNavigation must be used within a NavigationProvider");
  }
  return context;
}

// Hook for navigation guards
export function useNavigationGuard(
  condition: () => boolean,
  message: string = "Are you sure you want to leave? You may have unsaved changes."
) {
  const { currentPath } = useNavigation();

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (condition()) {
        e.preventDefault();
        e.returnValue = message;
        return message;
      }
    };

    const handleRouteChange = () => {
      if (condition()) {
        return confirm(message);
      }
      return true;
    };

    // Add beforeunload listener for browser navigation
    window.addEventListener("beforeunload", handleBeforeUnload);

    // Store the route change handler for potential use
    // Note: Next.js 13+ doesn't have a built-in way to intercept route changes
    // This would need to be implemented at the component level

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [condition, message]);
}

// Hook for tracking page views
export function usePageTracking() {
  const { currentPath } = useNavigation();

  useEffect(() => {
    // Track page view
    console.log(`Page view: ${currentPath}`);

    // Here you could integrate with analytics services
    // Example: analytics.track('page_view', { path: currentPath });
  }, [currentPath]);
}
