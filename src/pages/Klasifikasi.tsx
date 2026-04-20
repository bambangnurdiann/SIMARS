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
  MoreVertical,
  Loader2
} from 'lucide-react';
import { 
  collection, 
  addDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Klasifikasi } from '@/types';
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
import { toast } from 'sonner';

export default function KlasifikasiPage() {
  const { user } = useAuth();
  const [data, setData] = useState<Klasifikasi[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Klasifikasi | null>(null);
  const [formData, setFormData] = useState({ kode: '', nama: '', uraian: '' });
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'klasifikasi'), orderBy('kode', 'asc'));
      const querySnapshot = await getDocs(q);
      const items: Klasifikasi[] = [];
      querySnapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as Klasifikasi);
      });
      setData(items);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Gagal mengambil data klasifikasi");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (user?.level !== 'super_admin') {
      toast.error("Hanya Super Admin yang dapat mengelola klasifikasi");
      return;
    }

    setSubmitting(true);
    try {
      if (editingItem) {
        await updateDoc(doc(db, 'klasifikasi', editingItem.id), {
          ...formData,
          updatedAt: serverTimestamp()
        });
        toast.success("Klasifikasi berhasil diperbarui");
      } else {
        await addDoc(collection(db, 'klasifikasi'), {
          ...formData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        toast.success("Klasifikasi berhasil ditambahkan");
      }
      setIsDialogOpen(false);
      setEditingItem(null);
      setFormData({ kode: '', nama: '', uraian: '' });
      fetchData();
    } catch (error) {
      console.error("Error saving data:", error);
      toast.error("Gagal menyimpan data");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (item: Klasifikasi) => {
    setEditingItem(item);
    setFormData({ kode: item.kode, nama: item.nama, uraian: item.uraian });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus data ini?")) return;
    
    try {
      await deleteDoc(doc(db, 'klasifikasi', id));
      toast.success("Data berhasil dihapus");
      fetchData();
    } catch (error) {
      console.error("Error deleting data:", error);
      toast.error("Gagal menghapus data");
    }
  };

  const filteredData = data.filter(item => 
    item.kode.toLowerCase().includes(search.toLowerCase()) ||
    item.nama.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Klasifikasi Surat</h1>
          <p className="text-muted-foreground text-[14px]">Kelola kode klasifikasi surat instansi</p>
        </div>
        {user?.level === 'super_admin' && (
          <Button onClick={() => {
            setEditingItem(null);
            setFormData({ kode: '', nama: '', uraian: '' });
            setIsDialogOpen(true);
          }} className="bg-[#16a34a] hover:bg-[#15803d]">
            <Plus className="mr-2 h-4 w-4" /> Tambah Klasifikasi
          </Button>
        )}
      </div>

      <div className="minimal-card !p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex flex-col sm:flex-row justify-between items-center gap-4">
          <h3 className="font-semibold text-[14px] text-foreground">Daftar Klasifikasi</h3>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cari kode atau nama..."
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
                <th className="w-[100px]">Kode</th>
                <th>Nama Klasifikasi</th>
                <th>Uraian</th>
                {user?.level === 'super_admin' && <th className="text-right">Aksi</th>}
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
                filteredData.map((item) => (
                  <tr key={item.id}>
                    <td className="font-mono font-bold text-primary">{item.kode}</td>
                    <td className="font-medium text-foreground">{item.nama}</td>
                    <td className="text-[13px] text-muted-foreground">{item.uraian}</td>
                    {user?.level === 'super_admin' && (
                      <td className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => handleEdit(item)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600" onClick={() => handleDelete(item.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Klasifikasi' : 'Tambah Klasifikasi Baru'}</DialogTitle>
            <DialogDescription>
              Isi formulir di bawah ini untuk menyimpan data klasifikasi surat.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="kode">Kode Klasifikasi</Label>
                <Input 
                  id="kode" 
                  placeholder="Contoh: HK.01" 
                  value={formData.kode}
                  onChange={(e) => setFormData({...formData, kode: e.target.value})}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="nama">Nama Klasifikasi</Label>
                <Input 
                  id="nama" 
                  placeholder="Contoh: Hukum" 
                  value={formData.nama}
                  onChange={(e) => setFormData({...formData, nama: e.target.value})}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="uraian">Uraian / Keterangan</Label>
                <Input 
                  id="uraian" 
                  placeholder="Penjelasan singkat..." 
                  value={formData.uraian}
                  onChange={(e) => setFormData({...formData, uraian: e.target.value})}
                />
              </div>
            </div>

            {/* Panduan Pengisian */}
            <div className="mb-4 rounded-lg border border-border bg-secondary/30 p-4">
              <h4 className="mb-2 text-[13px] font-bold text-foreground">💡 Panduan Pengisian Klasifikasi:</h4>
              <ul className="list-inside list-disc space-y-1 text-[12px] text-foreground/90">
                <li><strong>Kode:</strong> Identitas unik untuk penomoran surat (contoh: HK.01).</li>
                <li><strong>Nama:</strong> Nama kategori surat secara umum (contoh: Hukum).</li>
                <li><strong>Penting:</strong> Kode ini akan digunakan secara sistematis saat pembuatan nomor Surat Keluar. Pastikan kode akurat sesuai tata naskah dinas Bapak.</li>
              </ul>
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
