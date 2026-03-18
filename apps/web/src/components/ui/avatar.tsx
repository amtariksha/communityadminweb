import { type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg';
}

function Avatar({ className, size = 'md', ...props }: AvatarProps): ReactNode {
  const sizeClasses = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-12 w-12 text-base',
  };

  return (
    <div
      className={cn(
        'relative flex shrink-0 overflow-hidden rounded-full',
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  );
}

interface AvatarImageProps extends HTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
}

function AvatarImage({ src, alt, className }: AvatarImageProps): ReactNode {
  return (
    <img src={src} alt={alt} className={cn('aspect-square h-full w-full object-cover', className)} />
  );
}

interface AvatarFallbackProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

function AvatarFallback({ className, children, ...props }: AvatarFallbackProps): ReactNode {
  return (
    <div
      className={cn(
        'flex h-full w-full items-center justify-center rounded-full bg-muted font-medium text-muted-foreground',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export { Avatar, AvatarImage, AvatarFallback, getInitials };
