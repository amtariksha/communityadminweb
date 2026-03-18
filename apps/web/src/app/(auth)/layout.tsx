import { type ReactNode } from 'react';
import { Building2 } from 'lucide-react';

interface AuthLayoutProps {
  children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps): ReactNode {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted p-4">
      <div className="mb-8 flex items-center gap-2">
        <Building2 className="h-8 w-8 text-primary" />
        <h1 className="text-2xl font-bold">CommunityOS</h1>
      </div>
      <div className="w-full max-w-md">
        {children}
      </div>
      <p className="mt-8 text-sm text-muted-foreground">Society Operating System</p>
    </div>
  );
}
