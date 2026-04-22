import { Suspense, type ReactNode } from 'react';
import LoginContent from './login-content';

export default function LoginPage(): ReactNode {
  // Suspense wrapper lets the login-content useSearchParams() hook
  // safely read ?reason=session_expired without forcing this route
  // off the static-prerender path (Next.js App Router requirement).
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}
