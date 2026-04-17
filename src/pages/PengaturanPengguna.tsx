/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from 'react';
import { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Loader2,
  UserPlus,
  Shield
} from 'lucide-react';
import { 
  collection, 
  getDocs, 
  setDoc,
  doc, 
  query, 
  orderBy,
  serverTimestamp,
  deleteDoc
} from 'firebase/firestore';
import { initializeApp, getApps, deleteApp } from 'firebase/app';
import { createUserWithEmailAndPassword, getAuth as getSecondaryAuth } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { db } from '@/lib/firebase';
import { User, UserLevel } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function PengaturanPengguna() {
  const { user: currentUser } = useAuth();
  const [data, setData] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    nama: '',
    nip: '',
    username: '',
    level: 'pegawai' as UserLevel
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const items: User[] = [];
      querySnapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as User);
      });
      setData(items);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Gagal mengambil data pengguna");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentUser?.level !== 'super_admin') {
      toast.error("Hanya Super Admin yang dapat mengelola pengguna");
      return;
    }

    setSubmitting(true);
    let secondaryApp;
    try {
      // Create a secondary Firebase app to create the user without logging out current user
      const secondaryAppName = `secondary-app-${Date.now()}`;
      secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
      const secondaryAuth = getSecondaryAuth(secondaryApp);

      // 1. Create user in Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(
        secondaryAuth, 
        formData.email, 
        formData.password
      );
      
      const newUserId = userCredential.user.uid;

      // 2. Save additional user data to Firestore using the UID
      await setDoc(doc(db, 'users', newUserId), {
        email: formData.email,
        nama: formData.nama,
        nip: formData.nip,
        username: formData.username,
        level: formData.level,
        id: newUserId, // Store the UID in the document as well
        createdAt: serverTimestamp()
      });

      toast.success(`Akun ${formData.nama} berhasil dibuat dan sinkron dengan Authentication`);
      setIsDialogOpen(false);
      setFormData({
        email: '',
        password: '',
        nama: '',
        nip: '',
        username: '',
        level: 'pegawai'
      });
      fetchData();
    } catch (error: any) {
      console.error("Error saving user:", error);
      let message = "Gagal menyimpan data pengguna";
      if (error.code === 'auth/email-already-in-use') {
        message = "Email sudah terdaftar di sistem Authentication";
      } else if (error.code === 'auth/weak-password') {
        message = "Password terlalu lemah (minimal 6 karakter)";
      }
      toast.error(message);
    } finally {
      if (secondaryApp) {
        await deleteApp(secondaryApp);
      }
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (id === currentUser?.id) {
      toast.error("Anda tidak dapat menghapus akun Anda sendiri");
      return;
    }
    if (!confirm("Apakah Anda yakin ingin menghapus pengguna ini?")) return;
    
    try {
      await deleteDoc(doc(db, 'users', id));
      toast.success("Pengguna berhasil dihapus");
      fetchData();
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error("Gagal menghapus pengguna");
    }
  };

  const getLevelBadge = (level: UserLevel) => {
    switch (level) {
      case 'super_admin': return <Badge className="bg-purple-600">Super Admin</Badge>;
      case 'admin': return <Badge className="bg-blue-600">Admin</Badge>;
      case 'pimpinan': return <Badge className="bg-orange-600">Pimpinan</Badge>;
      case 'pegawai': return <Badge className="bg-gray-600">Pegawai</Badge>;
      default: return <Badge>{level}</Badge>;
    }
  };

  const filteredData = data.filter(u => 
    u.nama.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.nip.includes(search)
  );

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Manajemen Pengguna</h1>
          <p className="text-muted-foreground text-[14px]">Kelola akun pengguna dan hak akses aplikasi</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="bg-primary hover:bg-primary/90">
          <UserPlus className="mr-2 h-4 w-4" /> Tambah Pengguna
        </Button>
      </div>

      <div className="minimal-card !p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex flex-col sm:flex-row justify-between items-center gap-4">
          <h3 className="font-semibold text-[14px] text-foreground">Daftar Pengguna</h3>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cari nama, email, atau NIP..."
              className="pl-9 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full minimal-table">
            <thead>
              <tr>
                <th>Nama / NIP</th>
                <th>Email / Username</th>
                <th>Level Akses</th>
                <th className="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="text-center py-10">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-10 text-muted-foreground">Tidak ada data ditemukan</td>
                </tr>
              ) : (
                filteredData.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="font-medium text-foreground">{u.nama}</div>
                      <div className="text-[11px] text-muted-foreground">NIP: {u.nip}</div>
                    </td>
                    <td>
                      <div className="text-[13px]">{u.email}</div>
                      <div className="text-[11px] text-muted-foreground/60">@{u.username}</div>
                    </td>
                    <td>{getLevelBadge(u.level)}</td>
                    <td className="text-right">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-red-500 hover:text-red-600"
                        onClick={() => handleDelete(u.id)}
                        disabled={u.id === currentUser?.id}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah Pengguna Baru</DialogTitle>
            <DialogDescription>
              Buat akun baru untuk pegawai atau admin.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="username">Username</Label>
                  <Input 
                    id="username" 
                    value={formData.username}
                    onChange={(e) => setFormData({...formData, username: e.target.value})}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="level">Level Akses</Label>
                  <Select 
                    value={formData.level} 
                    onValueChange={(v) => setFormData({...formData, level: v as UserLevel})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="super_admin">Super Admin</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="pimpinan">Pimpinan</SelectItem>
                      <SelectItem value="pegawai">Pegawai</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="nama">Nama Lengkap</Label>
                <Input 
                  id="nama" 
                  value={formData.nama}
                  onChange={(e) => setFormData({...formData, nama: e.target.value})}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="nip">NIP</Label>
                <Input 
                  id="nip" 
                  value={formData.nip}
                  onChange={(e) => setFormData({...formData, nip: e.target.value})}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <Input 
                  id="password" 
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Batal</Button>
              <Button type="submit" className="bg-green-600 hover:bg-green-700" disabled={submitting}>
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Simpan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
