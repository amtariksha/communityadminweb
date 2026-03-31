import { type ReactNode } from 'react';
import { Building2 } from 'lucide-react';

interface AuthLayoutProps {
  children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps): ReactNode {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted p-4">
      <div className="mb-8 flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F5A623]">
          <span className="text-xl font-bold text-white">e</span>
        </div>
        <h1 className="text-2xl font-bold">Eassy Society</h1>
      </div>
      <div className="w-full max-w-md">
        {children}
      </div>
      <p className="mt-8 text-sm text-muted-foreground">Society Management Platform</p>
    </div>
  );
}
