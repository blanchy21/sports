import { useEffect, useState } from 'react';

interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  memoryUsage?: number;
  networkRequests: number;
}

export const usePerformance = (componentName: string) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    loadTime: 0,
    renderTime: 0,
    networkRequests: 0,
  });

  useEffect(() => {
    const startTime = performance.now();

    // Monitor memory usage if available
    const memoryInfo = (performance as Performance & { memory?: { usedJSHeapSize: number } })
      .memory;
    const initialMemory = memoryInfo?.usedJSHeapSize || 0;

    // Monitor network requests
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const networkEntries = entries.filter(
        (entry) => entry.entryType === 'navigation' || entry.entryType === 'resource'
      );
      setMetrics((prev) => ({
        ...prev,
        networkRequests: networkEntries.length,
      }));
    });

    observer.observe({ entryTypes: ['navigation', 'resource'] });

    return () => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;

      const finalMemory = memoryInfo?.usedJSHeapSize || 0;
      const memoryUsage = finalMemory - initialMemory;

      setMetrics((prev) => ({
        ...prev,
        loadTime: endTime,
        renderTime,
        memoryUsage,
      }));

      observer.disconnect();

      // Log performance metrics in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`Performance metrics for ${componentName}:`, {
          renderTime: `${renderTime.toFixed(2)}ms`,
          memoryUsage: memoryUsage ? `${(memoryUsage / 1024 / 1024).toFixed(2)}MB` : 'N/A',
          networkRequests: metrics.networkRequests,
        });
      }
    };
  }, [componentName, metrics.networkRequests]);

  return metrics;
};

// Hook for monitoring component re-renders
export const useRenderCount = (componentName: string) => {
  const [renderCount, setRenderCount] = useState(0);

  useEffect(() => {
    setRenderCount((prev) => prev + 1);

    if (process.env.NODE_ENV === 'development' && renderCount > 0) {
      console.log(`${componentName} rendered ${renderCount + 1} times`);
    }
  }, [componentName, renderCount]);

  return renderCount;
};

// Hook for monitoring bundle size impact
export const useBundleAnalyzer = () => {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      // Log bundle information
      const scripts = document.querySelectorAll('script[src]');
      const totalSize = Array.from(scripts).reduce((total, script) => {
        const src = (script as HTMLScriptElement).src;
        return total + (src.includes('_next/static') ? 1 : 0);
      }, 0);

      console.log(`Bundle chunks loaded: ${totalSize}`);
    }
  }, []);
};
