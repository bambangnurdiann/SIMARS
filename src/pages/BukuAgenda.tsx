/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { 
  Search, 
  Printer, 
  FileSpreadsheet,
  Loader2,
  Filter,
  Calendar as CalendarIcon
} from 'lucide-react';
import { 
  collection, 
  getDocs, 
  query, 
  orderBy,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { SuratMasuk, SuratKeluar, SuratKeputusan } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function BukuAgendaPage() {
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-01'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [activeTab, setActiveTab] = useState('masuk');
  
  const [dataMasuk, setDataMasuk] = useState<SuratMasuk[]>([]);
  const [dataKeluar, setDataKeluar] = useState<SuratKeluar[]>([]);
  const [dataSK, setDataSK] = useState<SuratKeputusan[]>([]);

  const handleFilter = async () => {
    setLoading(true);
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      if (activeTab === 'masuk') {
        const q = query(
          collection(db, 'suratMasuk'), 
          where('createdAt', '>=', start),
          where('createdAt', '<=', end),
          orderBy('createdAt', 'asc')
        );
        const snap = await getDocs(q);
        const items: SuratMasuk[] = [];
        snap.forEach(doc => items.push({ id: doc.id, ...doc.data() } as SuratMasuk));
        setDataMasuk(items);
      } else if (activeTab === 'keluar') {
        const q = query(
          collection(db, 'suratKeluar'), 
          where('createdAt', '>=', start),
          where('createdAt', '<=', end),
          orderBy('createdAt', 'asc')
        );
        const snap = await getDocs(q);
        const items: SuratKeluar[] = [];
        snap.forEach(doc => items.push({ id: doc.id, ...doc.data() } as SuratKeluar));
        setDataKeluar(items);
      } else {
        const q = query(
          collection(db, 'suratKeputusan'), 
          where('createdAt', '>=', start),
          where('createdAt', '<=', end),
          orderBy('createdAt', 'asc')
        );
        const snap = await getDocs(q);
        const items: SuratKeputusan[] = [];
        snap.forEach(doc => items.push({ id: doc.id, ...doc.data() } as SuratKeputusan));
        setDataSK(items);
      }
    } catch (error) {
      console.error("Error filtering data:", error);
      toast.error("Gagal memfilter data. Pastikan index Firestore sudah dibuat.");
    } finally {
      setLoading(false);
    }
  };

  const exportExcel = () => {
    let exportData: any[] = [];
    let fileName = '';

    if (activeTab === 'masuk') {
      exportData = dataMasuk.map(item => ({
        'No. Agenda': item.noAgenda,
        'Kode': item.kodeKlasifikasi,
        'Asal Surat': item.asalSurat,
        'Nomor Surat': item.nomorSurat,
        'Tanggal Surat': item.tanggalSurat,
        'Isi Ringkas': item.isiRingkas,
        'Keterangan': item.keterangan
      }));
      fileName = `Agenda_Surat_Masuk_${startDate}_to_${endDate}.xlsx`;
    } else if (activeTab === 'keluar') {
      exportData = dataKeluar.map(item => ({
        'No. Agenda': item.noAgenda,
        'Kode': item.kodeKlasifikasi,
        'Tujuan Surat': item.tujuanSurat,
        'Nomor Surat': item.nomorSurat,
        'Tanggal Surat': item.tanggalSurat,
        'Isi Ringkas': item.isiRingkas,
        'Keterangan': item.keterangan
      }));
      fileName = `Agenda_Surat_Keluar_${startDate}_to_${endDate}.xlsx`;
    } else {
      exportData = dataSK.map(item => ({
        'Nomor SK': item.noSK,
        'Tahun': item.tahun,
        'Tentang': item.tentang,
        'Tanggal SK': item.tanggalSurat,
        'Keterangan': item.keterangan
      }));
      fileName = `Agenda_Surat_Keputusan_${startDate}_to_${endDate}.xlsx`;
    }

    if (exportData.length === 0) {
      toast.error("Tidak ada data untuk diexport");
      return;
    }

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Agenda");
    XLSX.writeFile(wb, fileName);
    toast.success("File Excel berhasil diunduh");
  };

  const exportPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    const title = activeTab === 'masuk' ? 'AGENDA SURAT MASUK' : activeTab === 'keluar' ? 'AGENDA SURAT KELUAR' : 'AGENDA SURAT KEPUTUSAN';
    
    doc.setFontSize(16);
    doc.text(title, 14, 20);
    doc.setFontSize(10);
    doc.text(`Periode: ${startDate} s/d ${endDate}`, 14, 28);

    let head: string[][] = [];
    let body: any[][] = [];

    if (activeTab === 'masuk') {
      head = [['No. Agenda', 'Kode', 'Asal Surat', 'Nomor Surat', 'Tgl Surat', 'Isi Ringkas']];
      body = dataMasuk.map(item => [item.noAgenda, item.kodeKlasifikasi, item.asalSurat, item.nomorSurat, item.tanggalSurat, item.isiRingkas]);
    } else if (activeTab === 'keluar') {
      head = [['No. Agenda', 'Kode', 'Tujuan Surat', 'Nomor Surat', 'Tgl Surat', 'Isi Ringkas']];
      body = dataKeluar.map(item => [item.noAgenda, item.kodeKlasifikasi, item.tujuanSurat, item.nomorSurat, item.tanggalSurat, item.isiRingkas]);
    } else {
      head = [['Nomor SK', 'Tahun', 'Tentang', 'Tgl SK', 'Keterangan']];
      body = dataSK.map(item => [item.noSK, item.tahun, item.tentang, item.tanggalSurat, item.keterangan]);
    }

    if (body.length === 0) {
      toast.error("Tidak ada data untuk dicetak");
      return;
    }

    autoTable(doc, {
      head: head,
      body: body,
      startY: 35,
      theme: 'grid',
      headStyles: { fillColor: [22, 163, 74] }
    });

    doc.save(`${title.replace(/ /g, '_')}_${startDate}.pdf`);
    toast.success("File PDF berhasil diunduh");
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Buku Agenda</h1>
          <p className="text-muted-foreground text-[14px]">Cetak dan export agenda surat masuk, keluar, dan SK</p>
        </div>
      </div>

      <div className="minimal-card">
        <div className="mb-4">
          <h3 className="font-semibold text-[14px] text-foreground">Filter Periode</h3>
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <div className="grid w-full max-w-[200px] gap-2">
            <Label htmlFor="start" className="text-[12px] text-muted-foreground">Tanggal Awal</Label>
            <Input id="start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="text-sm" />
          </div>
          <div className="grid w-full max-w-[200px] gap-2">
            <Label htmlFor="end" className="text-[12px] text-muted-foreground">Tanggal Akhir</Label>
            <Input id="end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="text-sm" />
          </div>
          <Button onClick={handleFilter} className="bg-primary hover:bg-primary/90" disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Filter className="mr-2 h-4 w-4" />}
            Tampilkan
          </Button>
          <div className="flex-1" />
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportExcel} className="text-muted-foreground">
              <FileSpreadsheet className="mr-2 h-4 w-4 text-green-600 dark:text-green-400" />
              Excel
            </Button>
            <Button variant="outline" onClick={exportPDF} className="text-muted-foreground">
              <Printer className="mr-2 h-4 w-4 text-red-600 dark:text-red-400" />
              Cetak PDF
            </Button>
          </div>
        </div>
      </div>

      <Tabs defaultValue="masuk" onValueChange={setActiveTab}>
        <TabsList className="bg-muted p-1 rounded-lg">
          <TabsTrigger value="masuk" className="data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-md px-6 py-2 text-[13px]">Surat Masuk</TabsTrigger>
          <TabsTrigger value="keluar" className="data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-md px-6 py-2 text-[13px]">Surat Keluar</TabsTrigger>
          <TabsTrigger value="sk" className="data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-md px-6 py-2 text-[13px]">Surat Keputusan</TabsTrigger>
        </TabsList>
        
        <TabsContent value="masuk" className="mt-6">
          <AgendaTable data={dataMasuk} type="masuk" />
        </TabsContent>
        
        <TabsContent value="keluar" className="mt-6">
          <AgendaTable data={dataKeluar} type="keluar" />
        </TabsContent>
        
        <TabsContent value="sk" className="mt-6">
          <AgendaTable data={dataSK} type="sk" />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AgendaTable({ data, type }: { data: any[], type: string }) {
  return (
    <div className="minimal-card !p-0 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full minimal-table">
          <thead>
            <tr>
              <th className="w-[120px]">No. Agenda</th>
              <th>{type === 'sk' ? 'Nomor SK' : 'Nomor Surat'}</th>
              <th>{type === 'masuk' ? 'Asal Surat' : type === 'keluar' ? 'Tujuan Surat' : 'Tentang'}</th>
              <th>Isi Ringkas / Perihal</th>
              <th>Tgl Surat</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-12 text-muted-foreground">
                  Klik "Tampilkan" untuk memuat data periode ini
                </td>
              </tr>
            ) : (
              data.map((item) => (
                <tr key={item.id}>
                  <td className="font-mono font-bold text-primary">{item.noAgenda || item.noSK}</td>
                  <td className="text-[12px]">{item.nomorSurat || item.noSK}</td>
                  <td className="text-[13px]">{item.asalSurat || item.tujuanSurat || item.tentang}</td>
                  <td className="max-w-[250px] truncate text-[13px]">{item.isiRingkas || item.tentang}</td>
                  <td className="text-[11px] text-muted-foreground">
                    {format(new Date(item.tanggalSurat), 'dd/MM/yyyy')}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
