import { createRoot } from 'react-dom/client';
import { ClerkProvider } from "@clerk/clerk-react";
import { setBaseUrl } from "@workspace/api-client-react";
import App from './App';
import { ErrorBoundary } from '@/components/error-boundary';
import './index.css';

// Production sync: Current Preview matches GitHub
const VITE_API_URL = import.meta.env.VITE_API_URL;
const VITE_CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || "";

if (VITE_API_URL) {
  setBaseUrl(VITE_API_URL);
}

createRoot(document.getElementById('root')!, {
  onCaughtError: (error, errorInfo) => {
    console.error(error, errorInfo.componentStack);
  },
}).render(
  <ClerkProvider publishableKey={VITE_CLERK_PUBLISHABLE_KEY}>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </ClerkProvider>,
);
