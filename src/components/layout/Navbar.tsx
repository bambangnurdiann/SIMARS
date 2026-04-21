/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { LogOut, Sun, Moon, Bell, Menu, Plus } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Instansi } from '@/types';

export default function Navbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const navigate = useNavigate();
  const [isDark, setIsDark] = useState(false);
  const [instansi, setInstansi] = useState<Instansi | null>(null);

  useEffect(() => {
    const docRef = doc(db, 'instansi', 'config');
    
    // Use onSnapshot for real-time updates when data is saved in settings
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setInstansi(docSnap.data() as Instansi);
      }
    }, (error) => {
      console.error("Error listening to instansi:", error);
    });

    // Check theme
    if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    } else {
      setIsDark(false);
      document.documentElement.classList.remove('dark');
    }

    return () => unsubscribe();
  }, []);

  const toggleTheme = () => {
    if (isDark) {
      document.documentElement.classList.remove('dark');
      localStorage.theme = 'light';
      setIsDark(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.theme = 'dark';
      setIsDark(true);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-4 md:px-8">
      <div className="flex items-center gap-3 overflow-hidden">
        <Button variant="ghost" size="icon" className="md:hidden flex-shrink-0" onClick={onMenuClick}>
          <Menu className="h-5 w-5" />
        </Button>
        <div className="instansi-info flex flex-col overflow-hidden">
          <div className="instansi-name text-[14px] font-semibold text-foreground truncate max-w-[150px] sm:max-w-[300px]">
            {instansi?.nama || 'SIMARS'}
          </div>
          <div className="text-[11px] text-muted-foreground truncate hidden sm:block">
            {instansi?.alamat || 'Sistem Informasi Manajemen Surat'}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden md:flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger nativeButton={true} render={
              <Button className="bg-green-600 hover:bg-green-700 text-white gap-2 h-9 px-4 rounded-full text-[12px] font-bold">
                <Plus className="h-4 w-4" /> Tambah Data
              </Button>
            } />
            <DropdownMenuContent align="start" className="w-56">
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Registrasi / Input Baru</div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/surat-masuk')}>
                <Plus className="mr-2 h-4 w-4 text-green-600" />
                <span>Input Surat Masuk</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/surat-keluar')}>
                <Plus className="mr-2 h-4 w-4 text-blue-600" />
                <span>Input Surat Keluar</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/surat-keputusan')}>
                <Plus className="mr-2 h-4 w-4 text-purple-600" />
                <span>Input Surat Keputusan</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/referensi')}>
                <Plus className="mr-2 h-4 w-4 text-orange-600" />
                <span>Input Klasifikasi Baru</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={toggleTheme} className="text-muted-foreground">
            {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
          
          <Button variant="ghost" size="icon" className="text-muted-foreground">
            <Bell className="h-5 w-5" />
          </Button>
        </div>

        <div className="h-8 w-[1px] bg-border" />

        <DropdownMenu>
          <DropdownMenuTrigger nativeButton={true} render={
            <button className="user-profile flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity outline-none">
              <div className="text-right hidden sm:block">
                <div className="text-[13px] font-semibold text-foreground">
                  {auth.currentUser?.displayName || 'User'}
                </div>
                <div className="text-[11px] text-muted-foreground text-left">
                  Super Admin
                </div>
              </div>
              <div className="user-avatar h-8 w-8 rounded-full bg-muted flex items-center justify-center text-foreground font-bold text-xs">
                {auth.currentUser?.email?.charAt(0).toUpperCase() || 'U'}
              </div>
            </button>
          } />
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Akun Saya</div>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-slate-500 cursor-default">
              {auth.currentUser?.email}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Keluar</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
