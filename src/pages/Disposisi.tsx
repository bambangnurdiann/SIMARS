/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from 'react';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Plus, 
  Edit2, 
  Trash2, 
  Printer, 
  Loader2,
  Calendar,
  User,
  Info,
  Clock,
  AlertCircle
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
  where
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { SuratMasuk, Disposisi, User as UserType } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { sendEmailNotification, emailTemplates } from '@/lib/email';
import { exportLembarDisposisi } from '@/lib/exportPDF';

export default function DisposisiPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [surat, setSurat] = useState<SuratMasuk | null>(null);
  const [disposisiList, setDisposisiList] = useState<Disposisi[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Disposisi | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    tujuanDisposisi: '',
    tujuanNama: '',
    isiDisposisi: '',
    sifat: 'Biasa',
    batasWaktu: format(new Date(), 'yyyy-MM-dd'),
    catatan: '',
  });

  const fetchData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      // Fetch Surat
      const suratDoc = await getDoc(doc(db, 'suratMasuk', id));
      if (suratDoc.exists()) {
        setSurat({ id: suratDoc.id, ...suratDoc.data() } as SuratMasuk);
      } else {
        toast.error("Surat tidak ditemukan");
        navigate('/surat-masuk');
        return;
      }

      // Fetch Disposisi
      const q = query(collection(db, 'suratMasuk', id, 'disposisi'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const items: Disposisi[] = [];
      querySnapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as Disposisi);
      });
      setDisposisiList(items);

      // Fetch Users for selection
      const qU = query(collection(db, 'users'));
      const snapU = await getDocs(qU);
      const itemsU: UserType[] = [];
      snapU.forEach((doc) => itemsU.push({ id: doc.id, ...doc.data() } as UserType));
      setUsers(itemsU);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Gagal mengambil data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !surat) return;
    if (user?.level === 'pegawai') {
      toast.error("Anda tidak memiliki akses untuk menambah/mengubah disposisi");
      return;
    }

    setSubmitting(true);
    try {
      const selectedUser = users.find(u => u.id === formData.tujuanDisposisi);
      const tujuanNama = selectedUser?.nama || '';

      if (editingItem) {
        await updateDoc(doc(db, 'suratMasuk', id, 'disposisi', editingItem.id), {
          ...formData,
          tujuanNama,
          updatedAt: serverTimestamp()
        });
        toast.success("Disposisi berhasil diperbarui");
      } else {
        await addDoc(collection(db, 'suratMasuk', id, 'disposisi'), {
          ...formData,
          tujuanNama,
          suratMasukId: id,
          pengolah: user?.id,
          pengolahNama: user?.nama,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        // Update suratMasuk status
        await updateDoc(doc(db, 'suratMasuk', id), {
          sudahDisposisi: true,
          updatedAt: serverTimestamp()
        });

        toast.success("Disposisi berhasil ditambahkan");

        // Send email notification to target user
        if (selectedUser?.email) {
          await sendEmailNotification(
            selectedUser.email,
            'Instruksi Disposisi Baru - SIMARS',
            emailTemplates.newDisposisi({
              pengolahNama: user?.nama,
              isiDisposisi: formData.isiDisposisi,
              sifat: formData.sifat,
              batasWaktu: formData.batasWaktu
            })
          );
        }
      }
      setIsDialogOpen(false);
      setEditingItem(null);
      setFormData({
        tujuanDisposisi: '',
        tujuanNama: '',
        isiDisposisi: '',
        sifat: 'Biasa',
        batasWaktu: format(new Date(), 'yyyy-MM-dd'),
        catatan: '',
      });
      fetchData();
    } catch (error) {
      console.error("Error saving data:", error);
      toast.error("Gagal menyimpan data");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (item: Disposisi) => {
    setEditingItem(item);
    setFormData({
      tujuanDisposisi: item.tujuanDisposisi,
      tujuanNama: item.tujuanNama,
      isiDisposisi: item.isiDisposisi,
      sifat: item.sifat,
      batasWaktu: item.batasWaktu,
      catatan: item.catatan,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (disposisiId: string) => {
    if (!id || !confirm("Apakah Anda yakin ingin menghapus disposisi ini?")) return;
    try {
      await deleteDoc(doc(db, 'suratMasuk', id, 'disposisi', disposisiId));
      
      // If no more disposisi, set sudahDisposisi to false
      const q = query(collection(db, 'suratMasuk', id, 'disposisi'));
      const snap = await getDocs(q);
      if (snap.empty) {
        await updateDoc(doc(db, 'suratMasuk', id), { sudahDisposisi: false });
      }

      toast.success("Disposisi berhasil dihapus");
      fetchData();
    } catch (error) {
      console.error("Error deleting data:", error);
      toast.error("Gagal menghapus data");
    }
  };

  const handlePrint = async () => {
    if (!surat) return;
    try {
      // Fetch instansi data for header
      const instansiDoc = await getDoc(doc(db, 'instansi', 'config'));
      const instansi = instansiDoc.exists() ? instansiDoc.data() : null;
      
      await exportLembarDisposisi(surat, disposisiList, instansi);
      toast.success("Lembar disposisi berhasil di-generate");
    } catch (error) {
      console.error("Error printing:", error);
      toast.error("Gagal mencetak lembar disposisi");
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/surat-masuk')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Disposisi Surat</h1>
            <p className="text-muted-foreground text-[14px]">Kelola instruksi tindak lanjut surat masuk</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" /> Cetak Lembar Disposisi
          </Button>
          {(user?.level === 'pimpinan' || user?.level === 'admin' || user?.level === 'super_admin') && (
            <Button onClick={() => setIsDialogOpen(true)} className="bg-[#16a34a] hover:bg-[#15803d]">
              <Plus className="mr-2 h-4 w-4" /> Tambah Disposisi
            </Button>
          )}
        </div>
      </div>

      {surat && (
        <Card className="border-border bg-muted/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-[16px] flex items-center gap-2">
              <Info className="h-4 w-4 text-primary" /> Detail Surat Masuk
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-1">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">No. Agenda / Klasifikasi</p>
                <p className="text-[14px] font-bold text-primary">{surat.noAgenda} / {surat.kodeKlasifikasi}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Asal Surat</p>
                <p className="text-[14px] font-medium">{surat.asalSurat}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Nomor / Tgl Surat</p>
                <p className="text-[14px] font-medium">{surat.nomorSurat} / {format(new Date(surat.tanggalSurat), 'dd MMM yyyy', { locale: localeId })}</p>
              </div>
              <div className="md:col-span-3 space-y-1">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Isi Ringkas / Perihal</p>
                <p className="text-[14px] text-foreground/80">{surat.isiRingkas}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        <h3 className="font-semibold text-[16px] flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" /> Riwayat Disposisi
        </h3>
        
        {disposisiList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 bg-card rounded-xl border border-dashed border-border">
            <AlertCircle className="h-10 w-10 text-muted-foreground/30 mb-2" />
            <p className="text-muted-foreground">Belum ada data disposisi untuk surat ini</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {disposisiList.map((item) => (
              <Card key={item.id} className="border-border hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <User className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-[14px] font-bold">{item.tujuanNama}</p>
                        <p className="text-[11px] text-muted-foreground">Dibuat oleh: {item.pengolahNama} • {format(new Date(item.createdAt?.toDate()), 'dd MMM yyyy HH:mm', { locale: localeId })}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={item.sifat === 'Segera' ? 'destructive' : item.sifat === 'Rahasia' ? 'outline' : 'secondary'}>
                        {item.sifat}
                      </Badge>
                      {(user?.level === 'pimpinan' || user?.level === 'admin' || user?.level === 'super_admin') && (
                        <div className="flex gap-1 ml-2">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(item)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600" onClick={() => handleDelete(item.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/20 p-4 rounded-lg">
                    <div className="space-y-1">
                      <p className="text-[11px] font-medium text-muted-foreground uppercase">Isi Disposisi</p>
                      <p className="text-[13px]">{item.isiDisposisi}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[11px] font-medium text-muted-foreground uppercase">Batas Waktu</p>
                      <p className="text-[13px] flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> {format(new Date(item.batasWaktu), 'dd MMMM yyyy', { locale: localeId })}
                      </p>
                    </div>
                    {item.catatan && (
                      <div className="md:col-span-2 space-y-1 mt-2 pt-2 border-t border-border/50">
                        <p className="text-[11px] font-medium text-muted-foreground uppercase">Catatan Tambahan</p>
                        <p className="text-[13px] italic text-muted-foreground">{item.catatan}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Disposisi' : 'Tambah Disposisi Baru'}</DialogTitle>
            <DialogDescription>
              Tentukan tujuan dan isi instruksi disposisi.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-4 py-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="tujuan">Tujuan Disposisi</Label>
                <Select 
                  value={formData.tujuanDisposisi} 
                  onValueChange={(v) => setFormData({...formData, tujuanDisposisi: v})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Pegawai" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.nama} ({u.level})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="sifat">Sifat Disposisi</Label>
                <Select 
                  value={formData.sifat} 
                  onValueChange={(v) => setFormData({...formData, sifat: v})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Sifat" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Biasa">Biasa</SelectItem>
                    <SelectItem value="Segera">Segera</SelectItem>
                    <SelectItem value="Rahasia">Rahasia</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2 md:col-span-2">
                <Label htmlFor="isiDisposisi">Isi Disposisi / Instruksi</Label>
                <Input 
                  id="isiDisposisi" 
                  value={formData.isiDisposisi}
                  onChange={(e) => setFormData({...formData, isiDisposisi: e.target.value})}
                  required
                  placeholder="Contoh: Segera tindak lanjuti dan laporkan hasilnya"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="batasWaktu">Batas Waktu</Label>
                <Input 
                  id="batasWaktu" 
                  type="date"
                  value={formData.batasWaktu}
                  onChange={(e) => setFormData({...formData, batasWaktu: e.target.value})}
                  required
                />
              </div>
              <div className="grid gap-2 md:col-span-2">
                <Label htmlFor="catatan">Catatan Tambahan</Label>
                <Input 
                  id="catatan" 
                  value={formData.catatan}
                  onChange={(e) => setFormData({...formData, catatan: e.target.value})}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Batal</Button>
              <Button type="submit" className="bg-green-600 hover:bg-green-700" disabled={submitting}>
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Simpan Disposisi
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
