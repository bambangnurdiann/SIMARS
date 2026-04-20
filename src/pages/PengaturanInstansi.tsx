/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from 'react';
import { useState, useEffect } from 'react';
import { 
  Save, 
  Upload, 
  Loader2,
  Building2
} from 'lucide-react';
import { 
  doc, 
  getDoc, 
  setDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { supabase, SUPABASE_BUCKET } from '@/lib/supabase';
import { Instansi } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { toast } from 'sonner';

export default function PengaturanInstansi() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [formData, setFormData] = useState<Instansi>({
    nama: '',
    alamat: '',
    namaPimpinan: '',
    nipPimpinan: '',
    logoUrl: ''
  });

  useEffect(() => {
    const fetchInstansi = async () => {
      try {
        const docRef = doc(db, 'instansi', 'config');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setFormData(docSnap.data() as Instansi);
        }
      } catch (error) {
        console.error("Error fetching instansi:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchInstansi();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (user?.level !== 'super_admin') {
      toast.error("Hanya Super Admin yang dapat mengubah pengaturan instansi");
      return;
    }

    setSubmitting(true);
    setUploadProgress(0);
    try {
      if (user?.level !== 'super_admin') {
        throw new Error("Akses ditolak");
      }

      let logoUrl = formData.logoUrl;
      if (file) {
        // Validate size (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
          toast.error("Ukuran logo terlalu besar (maks 2MB)");
          setSubmitting(false);
          return;
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `logo_${Date.now()}.${fileExt}`;
        const filePath = `instansi/${fileName}`;

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
          
        logoUrl = publicUrl;
      }

      await setDoc(doc(db, 'instansi', 'config'), {
        ...formData,
        logoUrl,
        updatedAt: serverTimestamp()
      });
      
      toast.success("Pengaturan instansi berhasil disimpan");
      setTimeout(() => window.location.reload(), 1500);
    } catch (error: any) {
      console.error("Error saving instansi:", error);
      let errMsg = "Gagal menyimpan pengaturan";
      if (error.message?.includes("row-level security policy")) {
        errMsg = "Gagal unggah: Izin RLS Supabase ditolak. Pastikan Bapak sudah menambahkan Policy 'Allow Public' di bucket simars-storage.";
      } else if (error.message?.includes("Upload Error")) {
        errMsg = `Gagal unggah logo ke Supabase: ${error.message}.`;
      }
      toast.error(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Pengaturan Instansi</h1>
          <p className="text-muted-foreground text-[14px]">Kelola identitas instansi yang akan tampil di laporan dan kop surat</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 minimal-card">
          <div className="mb-6">
            <h3 className="font-semibold text-[16px] text-foreground">Data Identitas</h3>
            <p className="text-[13px] text-muted-foreground">Informasi resmi instansi pemerintah</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="nama" className="text-[13px] text-foreground/80">Nama Instansi</Label>
                  <Input 
                    id="nama" 
                    value={formData.nama}
                    onChange={(e) => setFormData({...formData, nama: e.target.value})}
                    placeholder="Contoh: Pengadilan Agama Jakarta Pusat"
                    required
                    className="text-sm"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="kodeInstansi" className="text-[13px] text-foreground/80">Kode Instansi (untuk No. Surat)</Label>
                  <Input 
                    id="kodeInstansi" 
                    value={formData.kodeInstansi || ''}
                    onChange={(e) => setFormData({...formData, kodeInstansi: e.target.value})}
                    placeholder="Contoh: W10-A1"
                    className="text-sm"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="alamat" className="text-[13px] text-foreground/80">Alamat Lengkap</Label>
                <Input 
                  id="alamat" 
                  value={formData.alamat}
                  onChange={(e) => setFormData({...formData, alamat: e.target.value})}
                  placeholder="Jl. Gajah Mada No. 17, Jakarta Pusat"
                  required
                  className="text-sm"
                />
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="pimpinan" className="text-[13px] text-foreground/80">Nama Pimpinan</Label>
                  <Input 
                    id="pimpinan" 
                    value={formData.namaPimpinan}
                    onChange={(e) => setFormData({...formData, namaPimpinan: e.target.value})}
                    placeholder="Nama Lengkap & Gelar"
                    required
                    className="text-sm"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="nip" className="text-[13px] text-foreground/80">NIP Pimpinan</Label>
                  <Input 
                    id="nip" 
                    value={formData.nipPimpinan}
                    onChange={(e) => setFormData({...formData, nipPimpinan: e.target.value})}
                    placeholder="19xxxxxxxxxxxxxx"
                    required
                    className="text-sm"
                  />
                </div>
              </div>
            </div>
            <div className="pt-4 border-t border-border">
              {submitting && uploadProgress > 0 && uploadProgress < 100 && (
                <div className="mb-4">
                  <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                    <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${uploadProgress}%` }}></div>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1 text-center">Mengunggah Logo: {uploadProgress}%</p>
                </div>
              )}
              <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {uploadProgress > 0 && uploadProgress < 100 ? 'Mengunggah...' : 'Menyimpan...'}
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Simpan Perubahan
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>

        <div className="minimal-card">
          <div className="mb-6">
            <h3 className="font-semibold text-[16px] text-foreground">Logo Instansi</h3>
            <p className="text-[13px] text-muted-foreground">Logo akan tampil di navbar dan kop surat</p>
          </div>
          <div className="flex flex-col items-center justify-center py-6">
            <div className="relative mb-6 flex h-40 w-40 items-center justify-center rounded-2xl border-2 border-dashed border-border bg-muted">
              {formData.logoUrl || file ? (
                <img 
                  src={file ? URL.createObjectURL(file) : formData.logoUrl} 
                  alt="Logo Preview" 
                  className="h-full w-full object-contain p-4"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <Building2 className="h-16 w-16 text-muted-foreground/30" />
              )}
            </div>
            <Label htmlFor="logo" className="cursor-pointer w-full">
              <div className="flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors">
                <Upload className="h-4 w-4" />
                Pilih Logo Baru
              </div>
              <Input 
                id="logo" 
                type="file" 
                className="hidden" 
                accept="image/*"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </Label>
            <p className="mt-3 text-[11px] text-muted-foreground/60">Format: PNG, JPG (Maks. 2MB)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
