import { QueryClient, onlineManager } from '@tanstack/react-query';

if (typeof window !== 'undefined') {
  onlineManager.setEventListener((setOnline) => {
    const update = () => setOnline(window.navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  });
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000, // 30s
      gcTime: 5 * 60 * 1000, // 5min
      retry: (failureCount, error) => {
        // Don't retry if the API server is unreachable
        if (error instanceof Error && error.message.includes('API server is not running')) {
          return false;
        }
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
      networkMode: 'online',
    },
    mutations: {
      networkMode: 'online',
    },
  },
});
