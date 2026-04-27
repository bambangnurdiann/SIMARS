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
  Download,
  Filter
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
import { supabase, SUPABASE_BUCKET } from '@/lib/supabase';
import { SuratKeputusan } from '@/types';
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
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

export default function SuratKeputusanPage() {
  const { user } = useAuth();
  const [data, setData] = useState<SuratKeputusan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SuratKeputusan | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [formData, setFormData] = useState({
    noSK: '',
    tahun: new Date().getFullYear().toString(),
    tentang: '',
    tanggalSurat: format(new Date(), 'yyyy-MM-dd'),
    keterangan: '',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'suratKeputusan'));
      const querySnapshot = await getDocs(q);
      const items: SuratKeputusan[] = [];
      querySnapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as SuratKeputusan);
      });

      // Sort in memory safely
      items.sort((a, b) => {
        const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
        const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
        return timeB - timeA;
      });

      setData(items);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Gagal mengambil data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (user?.level === 'pimpinan' || user?.level === 'pegawai') {
      toast.error("Anda tidak memiliki akses untuk menambah/mengubah surat");
      return;
    }

    setSubmitting(true);
    setUploadProgress(0);
    try {
      let fileUrl = editingItem?.fileSurat || '';
      
      if (file) {
        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          toast.error("Ukuran file terlalu besar! Maksimal 10MB.");
          setSubmitting(false);
          return;
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `surat-keputusan/${fileName}`;

        const progressInterval = setInterval(() => {
          setUploadProgress(prev => (prev < 90 ? prev + 10 : prev));
        }, 500);

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from(SUPABASE_BUCKET)
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        clearInterval(progressInterval);
        
        if (uploadError) {
          throw new Error(`Upload Error: ${uploadError.message}`);
        }

        setUploadProgress(100);

        const { data: { publicUrl } } = supabase.storage
          .from(SUPABASE_BUCKET)
          .getPublicUrl(filePath);
          
        fileUrl = publicUrl;
      }

      if (editingItem) {
        await updateDoc(doc(db, 'suratKeputusan', editingItem.id), {
          ...formData,
          fileSurat: fileUrl,
          updatedAt: serverTimestamp()
        });
        toast.success("Surat keputusan berhasil diperbarui");
      } else {
        await addDoc(collection(db, 'suratKeputusan'), {
          ...formData,
          fileSurat: fileUrl,
          pengolah: user?.id,
          pengolahNama: user?.nama,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        toast.success("Surat keputusan berhasil ditambahkan");
      }
      setIsDialogOpen(false);
      setEditingItem(null);
      setFile(null);
      setUploadProgress(0);
      setFormData({
        noSK: '',
        tahun: new Date().getFullYear().toString(),
        tentang: '',
        tanggalSurat: format(new Date(), 'yyyy-MM-dd'),
        keterangan: '',
      });
      fetchData();
    } catch (error: any) {
      console.error("Error saving data:", error);
      let message = "Gagal menyimpan data";
      if (error.message?.includes("row-level security policy")) {
        message = "Gagal unggah: Izin RLS Supabase ditolak. Pastikan Bapak sudah menambahkan Policy 'Allow Public' di bucket simars-storage.";
      } else if (error.message?.includes("Upload Error")) {
        message = `Gagal unggah ke Supabase: ${error.message}`;
      }
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (item: SuratKeputusan) => {
    setEditingItem(item);
    setFormData({
      noSK: item.noSK,
      tahun: item.tahun,
      tentang: item.tentang,
      tanggalSurat: item.tanggalSurat,
      keterangan: item.keterangan,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus data ini?")) return;
    try {
      await deleteDoc(doc(db, 'suratKeputusan', id));
      toast.success("Data berhasil dihapus");
      fetchData();
    } catch (error) {
      console.error("Error deleting data:", error);
      toast.error("Gagal menghapus data");
    }
  };

  const filteredData = data.filter(item => 
    item.noSK.toLowerCase().includes(search.toLowerCase()) ||
    item.tentang.toLowerCase().includes(search.toLowerCase()) ||
    item.tahun.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Surat Keputusan</h1>
          <p className="text-muted-foreground text-[14px]">Manajemen arsip surat keputusan instansi</p>
        </div>
        {(user?.level === 'admin' || user?.level === 'super_admin') && (
          <Button onClick={() => {
            setEditingItem(null);
            setFile(null);
            setFormData({
              noSK: '',
              tahun: new Date().getFullYear().toString(),
              tentang: '',
              tanggalSurat: format(new Date(), 'yyyy-MM-dd'),
              keterangan: '',
            });
            setIsDialogOpen(true);
          }} className="bg-[#16a34a] hover:bg-[#15803d]">
            <Plus className="mr-2 h-4 w-4" /> Tambah SK
          </Button>
        )}
      </div>

      <div className="minimal-card !p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex flex-col sm:flex-row justify-between items-center gap-4">
          <h3 className="font-semibold text-[14px] text-foreground">Daftar Surat Keputusan</h3>
          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cari SK..."
                className="pl-9 text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full minimal-table">
            <thead>
              <tr>
                <th>No. SK</th>
                <th>Tentang</th>
                <th>Tahun</th>
                <th>Tgl SK</th>
                <th>Pengolah</th>
                <th className="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-10">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-muted-foreground">Tidak ada data ditemukan</td>
                </tr>
              ) : (
                filteredData.map((item) => (
                  <tr key={item.id}>
                    <td className="font-bold text-primary">{item.noSK}</td>
                    <td className="max-w-[300px]">
                      <div className="truncate font-medium text-foreground">{item.tentang}</div>
                      {item.fileSurat && (
                        <a href={item.fileSurat} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[10px] text-blue-500 hover:underline">
                          <Download className="h-2 w-2" /> Lihat File
                        </a>
                      )}
                    </td>
                    <td className="text-[13px]">{item.tahun}</td>
                    <td className="text-[11px] text-muted-foreground">
                      {format(new Date(item.tanggalSurat), 'dd MMM yyyy', { locale: localeId })}
                    </td>
                    <td className="text-[11px] text-muted-foreground">{item.pengolahNama}</td>
                    <td className="text-right">
                      <div className="flex justify-end gap-1">
                        {(user?.level === 'admin' || user?.level === 'super_admin') && (
                          <>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => handleEdit(item)}>
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600" onClick={() => handleDelete(item.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Surat Keputusan' : 'Tambah Surat Keputusan Baru'}</DialogTitle>
            <DialogDescription>
              Lengkapi data surat keputusan di bawah ini.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-4 py-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="noSK">Nomor SK</Label>
                <Input 
                  id="noSK" 
                  value={formData.noSK}
                  onChange={(e) => setFormData({...formData, noSK: e.target.value})}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tahun">Tahun</Label>
                <Input 
                  id="tahun" 
                  value={formData.tahun}
                  onChange={(e) => setFormData({...formData, tahun: e.target.value})}
                  required
                />
              </div>
              <div className="grid gap-2 md:col-span-2">
                <Label htmlFor="tentang">Tentang / Perihal SK</Label>
                <Input 
                  id="tentang" 
                  value={formData.tentang}
                  onChange={(e) => setFormData({...formData, tentang: e.target.value})}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tanggalSurat">Tanggal SK</Label>
                <Input 
                  id="tanggalSurat" 
                  type="date"
                  value={formData.tanggalSurat}
                  onChange={(e) => setFormData({...formData, tanggalSurat: e.target.value})}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="file">File SK (PDF/Gambar)</Label>
                <Input 
                  id="file" 
                  type="file"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  accept=".pdf,image/*"
                />
              </div>
              <div className="grid gap-2 md:col-span-2">
                <Label htmlFor="keterangan">Keterangan</Label>
                <Input 
                  id="keterangan" 
                  value={formData.keterangan}
                  onChange={(e) => setFormData({...formData, keterangan: e.target.value})}
                />
              </div>
            </div>

            {/* Panduan Pengisian */}
            <div className="mb-4 rounded-lg border border-border bg-secondary/30 p-4">
              <h4 className="mb-2 text-[13px] font-bold text-foreground">💡 Panduan Pengisian SK:</h4>
              <ul className="list-inside list-disc space-y-1 text-[12px] text-foreground/90">
                <li><strong>Nomor SK:</strong> Masukkan nomor SK sesuai format resmi instansi.</li>
                <li><strong>Tentang:</strong> Tuliskan perihal SK tersebut secara jelas dan lengkap.</li>
                <li><strong>Tahun:</strong> Pastikan tahun sudah sesuai untuk pengarsipan tahunan.</li>
                <li><strong>File SK:</strong> Sangat disarankan mengunggah file dalam format PDF hasil scan dokumen asli.</li>
              </ul>
            </div>

            <DialogFooter className="flex flex-col sm:flex-row gap-4">
              {submitting && uploadProgress > 0 && uploadProgress < 100 && (
                <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mt-1 mb-2">
                  <div 
                    className="bg-green-600 h-2.5 rounded-full transition-all duration-300" 
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                  <p className="text-[10px] text-muted-foreground mt-1">Mengunggah: {uploadProgress}%</p>
                </div>
              )}
              <div className="flex gap-2 w-full justify-end">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={submitting}>Batal</Button>
                <Button type="submit" className="bg-green-600 hover:bg-green-700" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {uploadProgress > 0 && uploadProgress < 100 ? 'Mengunggah...' : 'Menyimpan...'}
                    </>
                  ) : 'Simpan'}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
