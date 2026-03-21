'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { type ReactNode } from 'react';
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  Receipt,
  Users,
  ShoppingCart,
  Landmark,
  BarChart3,
  Home,
  UserCircle,
  FolderOpen,
  IndianRupee,
  Settings,
  ChevronDown,
  LogOut,
  Building2,
  ShieldCheck,
  TicketCheck,
  Megaphone,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, getInitials } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getUser, logout } from '@/lib/auth';

interface NavItem {
  label: string;
  href: string;
  icon: ReactNode;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard', href: '/', icon: <LayoutDashboard className="h-4 w-4" /> },
    ],
  },
  {
    label: 'Finance',
    items: [
      { label: 'Accounts', href: '/accounts', icon: <BookOpen className="h-4 w-4" /> },
      { label: 'Invoices', href: '/invoices', icon: <FileText className="h-4 w-4" /> },
      { label: 'Receipts', href: '/receipts', icon: <Receipt className="h-4 w-4" /> },
      { label: 'Vendors', href: '/vendors', icon: <Users className="h-4 w-4" /> },
      { label: 'Purchases', href: '/purchases', icon: <ShoppingCart className="h-4 w-4" /> },
      { label: 'Payments', href: '/payments', icon: <IndianRupee className="h-4 w-4" /> },
      { label: 'Bank', href: '/bank', icon: <Landmark className="h-4 w-4" /> },
      { label: 'Reports', href: '/reports', icon: <BarChart3 className="h-4 w-4" /> },
    ],
  },
  {
    label: 'Management',
    items: [
      { label: 'Units', href: '/units', icon: <Home className="h-4 w-4" /> },
      { label: 'Gate', href: '/gate', icon: <ShieldCheck className="h-4 w-4" /> },
      { label: 'Tickets', href: '/tickets', icon: <TicketCheck className="h-4 w-4" /> },
      { label: 'Announcements', href: '/announcements', icon: <Megaphone className="h-4 w-4" /> },
      { label: 'Staff', href: '/staff', icon: <Users className="h-4 w-4" /> },
      { label: 'Documents', href: '/documents', icon: <FolderOpen className="h-4 w-4" /> },
    ],
  },
  {
    label: 'System',
    items: [
      { label: 'Settings', href: '/settings', icon: <Settings className="h-4 w-4" /> },
    ],
  },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps): ReactNode {
  const pathname = usePathname();
  const router = useRouter();
  const user = getUser();
  const userName = user?.name ?? 'Admin User';

  function isActive(href: string): boolean {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(href);
  }

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-sidebar text-sidebar-foreground transition-transform duration-200 lg:static lg:z-auto lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-16 items-center gap-2 px-6">
          <Building2 className="h-6 w-6 text-primary" />
          <span className="text-lg font-bold">CommunityOS</span>
        </div>

        <Separator />

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {navGroups.map((group) => (
            <div key={group.label} className="mb-4">
              <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {group.label}
              </p>
              <ul className="space-y-0.5">
                {group.items.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onClose}
                      className={cn(
                        'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                        isActive(item.href)
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                      )}
                    >
                      {item.icon}
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <Separator />

        <div className="relative p-3">
          <DropdownMenu>
            <DropdownMenuTrigger className="w-full">
              <div className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-accent">
                <Avatar size="sm">
                  <AvatarFallback>{getInitials(userName)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium">{userName}</p>
                  <p className="text-xs text-muted-foreground">{user?.role ?? 'Admin'}</p>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuItem onClick={() => router.push('/settings')}>
                <UserCircle className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/settings')}>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => logout()}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>
    </>
  );
}
