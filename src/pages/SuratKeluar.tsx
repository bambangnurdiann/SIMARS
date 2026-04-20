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
  serverTimestamp,
  where,
  limit,
  getDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { supabase, SUPABASE_BUCKET } from '@/lib/supabase';
import { SuratKeluar, Klasifikasi, Instansi } from '@/types';
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
import { toast } from 'sonner';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

export default function SuratKeluarPage() {
  const { user } = useAuth();
  const [data, setData] = useState<SuratKeluar[]>([]);
  const [klasifikasi, setKlasifikasi] = useState<Klasifikasi[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SuratKeluar | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [formData, setFormData] = useState({
    tujuanSurat: '',
    isiRingkas: '',
    kodeKlasifikasi: '',
    tanggalSurat: format(new Date(), 'yyyy-MM-dd'),
    keterangan: '',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'suratKeluar'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const items: SuratKeluar[] = [];
      querySnapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as SuratKeluar);
      });
      setData(items);

      const qK = query(collection(db, 'klasifikasi'), orderBy('kode', 'asc'));
      const snapK = await getDocs(qK);
      const itemsK: Klasifikasi[] = [];
      snapK.forEach((doc) => itemsK.push({ id: doc.id, ...doc.data() } as Klasifikasi));
      setKlasifikasi(itemsK);
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

  const generateNomorSurat = async (kodeKlasifikasi: string) => {
    const year = new Date().getFullYear();
    const month = format(new Date(), 'MM');
    const romanMonths = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
    const romanMonth = romanMonths[parseInt(month) - 1];

    // Get instansi code from config
    const instansiSnap = await getDoc(doc(db, 'instansi', 'config'));
    const instansiData = instansiSnap.data() as Instansi;
    const instansiCode = instansiData?.kodeInstansi || 'W-A1';

    const q = query(
      collection(db, 'suratKeluar'), 
      where('createdAt', '>=', new Date(year, 0, 1)),
      orderBy('createdAt', 'desc'),
      limit(1)
    );
    const snap = await getDocs(q);
    let lastNum = 0;
    if (!snap.empty) {
      const lastDoc = snap.docs[0].data() as SuratKeluar;
      const parts = lastDoc.noAgenda.split('-');
      lastNum = parseInt(parts[2]);
    }
    const nextNum = (lastNum + 1).toString().padStart(4, '0');
    const noAgenda = `SK-${year}-${nextNum}`;
    
    // Pattern: W[kode]/[nextNum]/[kodeKlasifikasi]/[bulan]/[tahun]
    const nomorSurat = `${instansiCode}/${nextNum}/${kodeKlasifikasi}/${romanMonth}/${year}`;
    
    return { noAgenda, nomorSurat };
  };

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
        const filePath = `surat-keluar/${fileName}`;

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
        await updateDoc(doc(db, 'suratKeluar', editingItem.id), {
          ...formData,
          fileSurat: fileUrl,
          updatedAt: serverTimestamp()
        });
        toast.success("Surat keluar berhasil diperbarui");
      } else {
        const { noAgenda, nomorSurat } = await generateNomorSurat(formData.kodeKlasifikasi);
        await addDoc(collection(db, 'suratKeluar'), {
          ...formData,
          noAgenda,
          nomorSurat,
          fileSurat: fileUrl,
          pengolah: user?.id,
          pengolahNama: user?.nama,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        toast.success("Surat keluar berhasil ditambahkan");
      }
      setIsDialogOpen(false);
      setEditingItem(null);
      setFile(null);
      setUploadProgress(0);
      setFormData({
        tujuanSurat: '',
        isiRingkas: '',
        kodeKlasifikasi: '',
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

  const handleEdit = (item: SuratKeluar) => {
    setEditingItem(item);
    setFormData({
      tujuanSurat: item.tujuanSurat,
      isiRingkas: item.isiRingkas,
      kodeKlasifikasi: item.kodeKlasifikasi,
      tanggalSurat: item.tanggalSurat,
      keterangan: item.keterangan,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus data ini?")) return;
    try {
      await deleteDoc(doc(db, 'suratKeluar', id));
      toast.success("Data berhasil dihapus");
      fetchData();
    } catch (error) {
      console.error("Error deleting data:", error);
      toast.error("Gagal menghapus data");
    }
  };

  const filteredData = data.filter(item => 
    item.noAgenda.toLowerCase().includes(search.toLowerCase()) ||
    item.tujuanSurat.toLowerCase().includes(search.toLowerCase()) ||
    item.isiRingkas.toLowerCase().includes(search.toLowerCase()) ||
    item.nomorSurat.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Surat Keluar</h1>
          <p className="text-muted-foreground text-[14px]">Manajemen arsip surat keluar instansi</p>
        </div>
        {(user?.level === 'admin' || user?.level === 'super_admin') && (
          <Button onClick={() => {
            setEditingItem(null);
            setFile(null);
            setFormData({
              tujuanSurat: '',
              isiRingkas: '',
              kodeKlasifikasi: '',
              tanggalSurat: format(new Date(), 'yyyy-MM-dd'),
              keterangan: '',
            });
            setIsDialogOpen(true);
          }} className="bg-[#16a34a] hover:bg-[#15803d]">
            <Plus className="mr-2 h-4 w-4" /> Tambah Surat Keluar
          </Button>
        )}
      </div>

      <div className="minimal-card !p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex flex-col sm:flex-row justify-between items-center gap-4">
          <h3 className="font-semibold text-[14px] text-foreground">Daftar Surat Keluar</h3>
          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cari surat..."
                className="pl-9 text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button variant="outline" size="icon" className="h-9 w-9 text-muted-foreground">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full minimal-table">
            <thead>
              <tr>
                <th>No. Agenda / Kode</th>
                <th>Isi Ringkas</th>
                <th>Tujuan Surat</th>
                <th>Nomor / Tgl Surat</th>
                <th className="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-10">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-muted-foreground">Tidak ada data ditemukan</td>
                </tr>
              ) : (
                filteredData.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="font-bold text-primary">{item.noAgenda}</div>
                      <div className="text-[11px] text-muted-foreground">{item.kodeKlasifikasi}</div>
                    </td>
                    <td className="max-w-[200px]">
                      <div className="truncate font-medium text-foreground">{item.isiRingkas}</div>
                      {item.fileSurat && (
                        <a href={item.fileSurat} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[10px] text-blue-500 hover:underline">
                          <Download className="h-2 w-2" /> Lihat File
                        </a>
                      )}
                    </td>
                    <td className="text-[13px]">{item.tujuanSurat}</td>
                    <td>
                      <div className="text-[12px] font-medium text-foreground/80">{item.nomorSurat}</div>
                      <div className="text-[11px] text-muted-foreground">{format(new Date(item.tanggalSurat), 'dd MMM yyyy', { locale: localeId })}</div>
                    </td>
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
            <DialogTitle>{editingItem ? 'Edit Surat Keluar' : 'Tambah Surat Keluar Baru'}</DialogTitle>
            <DialogDescription>
              Lengkapi data surat keluar di bawah ini. Nomor Surat akan di-generate otomatis setelah simpan.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-4 py-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="tujuanSurat">Tujuan Surat</Label>
                <Input 
                  id="tujuanSurat" 
                  value={formData.tujuanSurat}
                  onChange={(e) => setFormData({...formData, tujuanSurat: e.target.value})}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tanggalSurat">Tanggal Surat</Label>
                <Input 
                  id="tanggalSurat" 
                  type="date"
                  value={formData.tanggalSurat}
                  onChange={(e) => setFormData({...formData, tanggalSurat: e.target.value})}
                  required
                />
              </div>
              <div className="grid gap-2 md:col-span-2">
                <Label htmlFor="isiRingkas">Isi Ringkas / Perihal</Label>
                <Input 
                  id="isiRingkas" 
                  value={formData.isiRingkas}
                  onChange={(e) => setFormData({...formData, isiRingkas: e.target.value})}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="kodeKlasifikasi">Klasifikasi</Label>
                {klasifikasi.length === 0 ? (
                  <div className="text-[11px] text-red-500 font-medium bg-red-50 dark:bg-red-950/30 p-2 rounded border border-red-200 dark:border-red-900">
                    Belum ada data Klasifikasi. Silakan isi Menu "Input Klasifikasi" terlebih dahulu.
                  </div>
                ) : (
                  <Select 
                    value={formData.kodeKlasifikasi} 
                    onValueChange={(v) => setFormData({...formData, kodeKlasifikasi: v})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih Klasifikasi" />
                    </SelectTrigger>
                    <SelectContent>
                      {klasifikasi.map((k) => (
                        <SelectItem key={k.id} value={k.kode}>{k.kode} - {k.nama}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="file">File Surat (PDF/Gambar)</Label>
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
