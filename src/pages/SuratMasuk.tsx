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
  FileText, 
  Printer, 
  Share2,
  Loader2,
  Download,
  Filter
} from 'lucide-react';
import { 
  collection, 
  addDoc, 
  getDocs, 
  getDoc,
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy,
  serverTimestamp,
  where,
  limit
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { SuratMasuk, Klasifikasi } from '@/types';
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
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { sendEmailNotification, emailTemplates } from '@/lib/email';
import { exportLembarDisposisi } from '@/lib/exportPDF';

export default function SuratMasukPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<SuratMasuk[]>([]);
  const [klasifikasi, setKlasifikasi] = useState<Klasifikasi[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SuratMasuk | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [formData, setFormData] = useState({
    asalSurat: '',
    nomorSurat: '',
    isiRingkas: '',
    kodeKlasifikasi: '',
    indeksBerkas: '',
    tanggalSurat: format(new Date(), 'yyyy-MM-dd'),
    keterangan: '',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'suratMasuk'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const items: SuratMasuk[] = [];
      querySnapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as SuratMasuk);
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

  const generateNoAgenda = async () => {
    const year = new Date().getFullYear();
    const q = query(
      collection(db, 'suratMasuk'), 
      where('createdAt', '>=', new Date(year, 0, 1)),
      orderBy('createdAt', 'desc'),
      limit(1)
    );
    const snap = await getDocs(q);
    let lastNum = 0;
    if (!snap.empty) {
      const lastDoc = snap.docs[0].data() as SuratMasuk;
      const parts = lastDoc.noAgenda.split('-');
      lastNum = parseInt(parts[2]);
    }
    const nextNum = (lastNum + 1).toString().padStart(4, '0');
    return `SM-${year}-${nextNum}`;
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

        const fileRef = ref(storage, `surat-masuk/${Date.now()}_${file.name}`);
        const uploadTask = uploadBytesResumable(fileRef, file);

        fileUrl = await new Promise((resolve, reject) => {
          uploadTask.on('state_changed', 
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              setUploadProgress(Math.round(progress));
            }, 
            (error) => {
              console.error("Upload error:", error);
              reject(error);
            }, 
            async () => {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              resolve(downloadURL);
            }
          );
        });
      }

      if (editingItem) {
        await updateDoc(doc(db, 'suratMasuk', editingItem.id), {
          ...formData,
          fileSurat: fileUrl,
          updatedAt: serverTimestamp()
        });
        toast.success("Surat masuk berhasil diperbarui");
      } else {
        const noAgenda = await generateNoAgenda();
        await addDoc(collection(db, 'suratMasuk'), {
          ...formData,
          noAgenda,
          fileSurat: fileUrl,
          pengolah: user?.id,
          pengolahNama: user?.nama,
          sudahDisposisi: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        toast.success("Surat masuk berhasil ditambahkan");
        
        // Send email notification to Pimpinan
        try {
          const pimpinanUsers = await getDocs(query(collection(db, 'users'), where('level', '==', 'pimpinan')));
          const pimpinanEmails: string[] = [];
          pimpinanUsers.forEach(doc => {
            const u = doc.data();
            if (u.email) pimpinanEmails.push(u.email);
          });
          
          if (pimpinanEmails.length > 0) {
            await sendEmailNotification(
              pimpinanEmails,
              'Surat Masuk Baru - SIMARS',
              emailTemplates.newSuratMasuk({
                noAgenda,
                asalSurat: formData.asalSurat,
                nomorSurat: formData.nomorSurat,
                isiRingkas: formData.isiRingkas,
                tanggalSurat: formData.tanggalSurat
              })
            );
          }
        } catch (e) {
          console.error("Failed to send notification:", e);
        }
      }
      setIsDialogOpen(false);
      setEditingItem(null);
      setFile(null);
      setUploadProgress(0);
      setFormData({
        asalSurat: '',
        nomorSurat: '',
        isiRingkas: '',
        kodeKlasifikasi: '',
        indeksBerkas: '',
        tanggalSurat: format(new Date(), 'yyyy-MM-dd'),
        keterangan: '',
      });
      fetchData();
    } catch (error) {
      console.error("Error saving data:", error);
      toast.error("Gagal menyimpan data");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (item: SuratMasuk) => {
    setEditingItem(item);
    setFormData({
      asalSurat: item.asalSurat,
      nomorSurat: item.nomorSurat,
      isiRingkas: item.isiRingkas,
      kodeKlasifikasi: item.kodeKlasifikasi,
      indeksBerkas: item.indeksBerkas,
      tanggalSurat: item.tanggalSurat,
      keterangan: item.keterangan,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus data ini?")) return;
    try {
      await deleteDoc(doc(db, 'suratMasuk', id));
      toast.success("Data berhasil dihapus");
      fetchData();
    } catch (error) {
      console.error("Error deleting data:", error);
      toast.error("Gagal menghapus data");
    }
  };

  const filteredData = data.filter(item => 
    item.noAgenda.toLowerCase().includes(search.toLowerCase()) ||
    item.asalSurat.toLowerCase().includes(search.toLowerCase()) ||
    item.isiRingkas.toLowerCase().includes(search.toLowerCase()) ||
    item.nomorSurat.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Surat Masuk</h1>
          <p className="text-muted-foreground text-[14px]">Manajemen arsip surat masuk instansi</p>
        </div>
        {(user?.level === 'admin' || user?.level === 'super_admin') && (
          <Button onClick={() => {
            setEditingItem(null);
            setFile(null);
            setFormData({
              asalSurat: '',
              nomorSurat: '',
              isiRingkas: '',
              kodeKlasifikasi: '',
              indeksBerkas: '',
              tanggalSurat: format(new Date(), 'yyyy-MM-dd'),
              keterangan: '',
            });
            setIsDialogOpen(true);
          }} className="bg-[#16a34a] hover:bg-[#15803d]">
            <Plus className="mr-2 h-4 w-4" /> Tambah Surat Masuk
          </Button>
        )}
      </div>

      <div className="minimal-card !p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex flex-col sm:flex-row justify-between items-center gap-4">
          <h3 className="font-semibold text-[14px] text-foreground">Daftar Surat Masuk</h3>
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
                <th>Asal Surat</th>
                <th>Nomor / Tgl Surat</th>
                <th>Status</th>
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
                    <td className="text-[13px]">{item.asalSurat}</td>
                    <td>
                      <div className="text-[12px] font-medium text-foreground/80">{item.nomorSurat}</div>
                      <div className="text-[11px] text-muted-foreground">{format(new Date(item.tanggalSurat), 'dd MMM yyyy', { locale: localeId })}</div>
                    </td>
                    <td>
                      {item.sudahDisposisi ? (
                        <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">Sudah Disposisi</span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-medium text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">Belum Disposisi</span>
                      )}
                    </td>
                    <td className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          title="Disposisi" 
                          className={item.sudahDisposisi ? "text-muted-foreground/50" : "text-orange-600"}
                          onClick={() => navigate(`/surat-masuk/${item.id}/disposisi`)}
                        >
                          <Share2 className="h-4 w-4" />
                        </Button>
                        {item.sudahDisposisi && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            title="Cetak Lembar Disposisi" 
                            className="text-green-600"
                            onClick={async () => {
                              try {
                                const instansiDoc = await getDoc(doc(db, 'instansi', 'config'));
                                const instansi = instansiDoc.exists() ? instansiDoc.data() : null;
                                const qD = query(collection(db, 'suratMasuk', item.id, 'disposisi'), orderBy('createdAt', 'asc'));
                                const snapD = await getDocs(qD);
                                const disposisiList: any[] = [];
                                snapD.forEach(d => disposisiList.push({ id: d.id, ...d.data() }));
                                await exportLembarDisposisi(item, disposisiList, instansi);
                              } catch (e) {
                                toast.error("Gagal mencetak lembar disposisi");
                              }
                            }}
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                        )}
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
            <DialogTitle>{editingItem ? 'Edit Surat Masuk' : 'Tambah Surat Masuk Baru'}</DialogTitle>
            <DialogDescription>
              Lengkapi data surat masuk di bawah ini. No. Agenda akan di-generate otomatis.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-4 py-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="asalSurat">Asal Surat</Label>
                <Input 
                  id="asalSurat" 
                  value={formData.asalSurat}
                  onChange={(e) => setFormData({...formData, asalSurat: e.target.value})}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="nomorSurat">Nomor Surat</Label>
                <Input 
                  id="nomorSurat" 
                  value={formData.nomorSurat}
                  onChange={(e) => setFormData({...formData, nomorSurat: e.target.value})}
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
                <Label htmlFor="tanggalSurat">Tanggal Surat</Label>
                <Input 
                  id="tanggalSurat" 
                  type="date"
                  value={formData.tanggalSurat}
                  onChange={(e) => setFormData({...formData, tanggalSurat: e.target.value})}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="indeksBerkas">Indeks Berkas</Label>
                <Input 
                  id="indeksBerkas" 
                  value={formData.indeksBerkas}
                  onChange={(e) => setFormData({...formData, indeksBerkas: e.target.value})}
                />
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
