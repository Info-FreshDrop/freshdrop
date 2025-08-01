import * as Sentry from '@sentry/react';

export function initSentry() {
  // Only initialize in production or when explicitly enabled
  if (import.meta.env.PROD || import.meta.env.VITE_ENABLE_SENTRY) {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      environment: import.meta.env.MODE,
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration({
          maskAllText: true,
          blockAllMedia: true,
        }),
      ],
      tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
      beforeSend(event) {
        // Filter out non-critical errors
        if (event.exception) {
          const error = event.exception.values?.[0];
          if (error?.type === 'ChunkLoadError' || 
              error?.value?.includes('Loading chunk') ||
              error?.value?.includes('NetworkError')) {
            return null; // Don't send chunk load errors
          }
        }
        return event;
      },
    });

    // Make Sentry available globally for error boundary
    (window as any).Sentry = Sentry;
  }
}

export { Sentry };