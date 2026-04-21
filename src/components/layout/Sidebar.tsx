/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Mail, 
  Send, 
  FileText, 
  BookOpen, 
  Settings, 
  Users, 
  Tag,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: Tag, label: 'Input Klasifikasi', path: '/referensi' },
  { icon: Mail, label: 'Input Surat Masuk', path: '/surat-masuk' },
  { icon: Send, label: 'Input Surat Keluar', path: '/surat-keluar' },
  { icon: FileText, label: 'Input Surat Keputusan', path: '/surat-keputusan' },
  { icon: BookOpen, label: 'Buku Agenda', path: '/buku-agenda' },
];

const settingItems = [
  { icon: Settings, label: 'Instansi', path: '/pengaturan/instansi', roles: ['super_admin'] },
  { icon: Users, label: 'Pengguna', path: '/pengaturan/pengguna', roles: ['super_admin'] },
];

export default function Sidebar({ className, onItemClick }: { className?: string, onItemClick?: () => void }) {
  const location = useLocation();
  const { user } = useAuth();

  const handleLinkClick = () => {
    if (onItemClick) onItemClick();
  };

  return (
    <aside className={cn("hidden w-[240px] flex-col border-r border-border bg-card md:flex", className)}>
      <div className="flex h-16 items-center border-b border-border px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
            S
          </div>
          <span className="text-xl font-bold tracking-tight text-primary">SIMARS</span>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto py-5">
        <nav className="space-y-1 px-3">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={handleLinkClick}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-[14px] transition-all",
                location.pathname === item.path
                  ? "bg-primary/10 text-primary font-semibold"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}

          {user?.level === 'super_admin' && (
            <>
              <div className="my-10 px-3">
                <div className="h-[1px] bg-border" />
              </div>
              {settingItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={handleLinkClick}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2.5 text-[14px] transition-all",
                    location.pathname === item.path
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              ))}
            </>
          )}
        </nav>
      </div>

      <div className="border-t border-border p-4">
        <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-foreground font-bold text-xs">
            {user?.nama?.charAt(0) || 'U'}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="truncate text-[13px] font-semibold text-foreground">{user?.nama || 'User'}</p>
            <p className="truncate text-[11px] text-muted-foreground capitalize">{user?.level?.replace('_', ' ') || 'Level'}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
