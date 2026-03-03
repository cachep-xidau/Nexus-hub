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
      retry: 2,
      refetchOnWindowFocus: false,
      networkMode: 'online',
    },
    mutations: {
      networkMode: 'online',
    },
  },
});
