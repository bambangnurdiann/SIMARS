/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { 
  Mail, 
  Send, 
  FileText, 
  ClipboardList,
  TrendingUp,
  TrendingDown,
  PlusCircle,
  FolderOpen
} from 'lucide-react';
import { collection, query, getDocs, where, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';

const COLORS = ['#16a34a', '#22c55e', '#4ade80', '#86efac', '#bbf7d0'];

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState({
    suratMasuk: 0,
    suratKeluar: 0,
    suratKeputusan: 0,
    disposisiPending: 0
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [recentSurat, setRecentSurat] = useState<any[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const smSnap = await getDocs(collection(db, 'suratMasuk'));
        const skSnap = await getDocs(collection(db, 'suratKeluar'));
        const skpSnap = await getDocs(collection(db, 'suratKeputusan'));
        const dispSnap = await getDocs(query(collection(db, 'suratMasuk'), where('sudahDisposisi', '==', false)));
        
        setStats({
          suratMasuk: smSnap.size,
          suratKeluar: skSnap.size,
          suratKeputusan: skpSnap.size,
          disposisiPending: dispSnap.size
        });

        // Classification stats (mocked logic based on data)
        const smByClass: any = {};
        smSnap.forEach(doc => {
          const c = doc.data().kodeKlasifikasi || 'Lainnya';
          smByClass[c] = (smByClass[c] || 0) + 1;
        });
        
        const skByClass: any = {};
        skSnap.forEach(doc => {
          const c = doc.data().kodeKlasifikasi || 'Lainnya';
          skByClass[c] = (skByClass[c] || 0) + 1;
        });

        setClassificationStats({
          masuk: Object.entries(smByClass).map(([kode, count]) => ({ kode, count })),
          keluar: Object.entries(skByClass).map(([kode, count]) => ({ kode, count }))
        });

        setChartData([
          { name: 'Jan', masuk: 40, keluar: 24 },
          { name: 'Feb', masuk: 30, keluar: 13 },
          { name: 'Mar', masuk: 20, keluar: 98 },
          { name: 'Apr', masuk: 27, keluar: 39 },
          { name: 'Mei', masuk: 18, keluar: 48 },
          { name: 'Jun', masuk: 23, keluar: 38 },
        ]);

        const recentQ = query(collection(db, 'suratMasuk'), orderBy('createdAt', 'desc'), limit(5));
        const recentSnap = await getDocs(recentQ);
        const recent: any[] = [];
        recentSnap.forEach(doc => recent.push({ id: doc.id, ...doc.data() }));
        setRecentSurat(recent);
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
      }
    };

    fetchStats();
  }, []);

  const [classificationStats, setClassificationStats] = useState<{masuk: any[], keluar: any[]}>({ masuk: [], keluar: [] });

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Dashboard SIMARS</h1>
          <p className="text-muted-foreground text-[14px]">Sistem Informasi Manajemen Arsip Surat - Pengadilan Agama</p>
        </div>
      </div>

      {(user?.level === 'admin' || user?.level === 'super_admin') && (
        <section className="space-y-4">
          <h3 className="text-[14px] font-semibold text-foreground flex items-center gap-2">
            <PlusCircle className="h-4 w-4 text-primary" /> Menu Input Cepat (CRUD)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button 
              onClick={() => navigate('/surat-masuk')} 
              className="h-16 justify-start gap-4 bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800"
            >
              <Mail className="h-5 w-5" />
              <div className="text-left">
                <div className="text-[13px] font-bold">Input Surat Masuk</div>
                <div className="text-[10px] opacity-80">Registrasi arsip masuk baru</div>
              </div>
            </Button>
            <Button 
              onClick={() => navigate('/surat-keluar')} 
              className="h-16 justify-start gap-4 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800"
            >
              <Send className="h-5 w-5" />
              <div className="text-left">
                <div className="text-[13px] font-bold">Input Surat Keluar</div>
                <div className="text-[10px] opacity-80">Registrasi arsip keluar baru</div>
              </div>
            </Button>
            <Button 
              onClick={() => navigate('/surat-keputusan')} 
              className="h-16 justify-start gap-4 bg-purple-600 hover:bg-purple-700 dark:bg-purple-700 dark:hover:bg-purple-800"
            >
              <FileText className="h-5 w-5" />
              <div className="text-left">
                <div className="text-[13px] font-bold">Input SK</div>
                <div className="text-[10px] opacity-80">Registrasi Surat Keputusan</div>
              </div>
            </Button>
            <Button 
              onClick={() => navigate('/referensi')} 
              className="h-16 justify-start gap-4 bg-orange-500 hover:bg-orange-600 dark:bg-orange-600 dark:hover:bg-orange-700"
            >
              <FolderOpen className="h-5 w-5" />
              <div className="text-left">
                <div className="text-[13px] font-bold">Input Klasifikasi</div>
                <div className="text-[10px] opacity-80">Kelola Referensi / Kode</div>
              </div>
            </Button>
          </div>
        </section>
      )}

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Surat Masuk" 
          value={stats.suratMasuk} 
          description="Total arsip surat masuk"
        />
        <StatCard 
          title="Surat Keluar" 
          value={stats.suratKeluar} 
          description="Total arsip surat keluar"
        />
        <StatCard 
          title="Surat Keputusan" 
          value={stats.suratKeputusan} 
          description="Total arsip SK"
        />
        <StatCard 
          title="Disposisi Pending" 
          value={stats.disposisiPending} 
          description="Perlu tindak lanjut"
          color="text-orange-600 dark:text-orange-400"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 minimal-card !p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex justify-between items-center">
            <h3 className="font-semibold text-[14px] text-foreground">Surat Masuk Terbaru</h3>
            <a href="/surat-masuk" className="text-[12px] text-primary hover:underline">Lihat Semua</a>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full minimal-table">
              <thead>
                <tr>
                  <th>No. Agenda</th>
                  <th>Asal Surat</th>
                  <th>Perihal</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {recentSurat.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-4 text-muted-foreground">Belum ada data</td></tr>
                ) : recentSurat.map((surat) => (
                  <tr key={surat.id}>
                    <td className="font-mono font-semibold text-foreground/80">{surat.noAgenda}</td>
                    <td>{surat.asalSurat}</td>
                    <td className="truncate max-w-[200px]">{surat.isiRingkas}</td>
                    <td>
                      <button 
                        onClick={() => navigate(`/surat-masuk/${surat.id}/disposisi`)}
                        className="bg-orange-500 text-white px-2 py-1 rounded text-[11px] font-medium"
                      >
                        Disp
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="minimal-card flex flex-col">
          <div className="mb-4">
            <h3 className="font-semibold text-[14px] text-foreground">Statistik Volume</h3>
          </div>
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="name" hide />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--card)', borderRadius: '8px', border: '1px solid var(--border)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '12px', color: 'var(--foreground)' }}
                  itemStyle={{ color: 'var(--foreground)' }}
                />
                <Bar dataKey="masuk" fill="var(--primary)" radius={[4, 4, 0, 0]} name="Surat Masuk" />
                <Bar dataKey="keluar" fill="var(--muted)" radius={[4, 4, 0, 0]} name="Surat Keluar" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-between text-[11px] text-muted-foreground px-2 mt-2">
            {chartData.map(d => <span key={d.name}>{d.name}</span>)}
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="minimal-card !p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="font-semibold text-[14px] text-foreground">Surat Masuk per Klasifikasi</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full minimal-table">
              <thead>
                <tr>
                  <th>Kode Klasifikasi</th>
                  <th className="text-right">Jumlah Surat</th>
                </tr>
              </thead>
              <tbody>
                {classificationStats.masuk.length === 0 ? (
                  <tr><td colSpan={2} className="text-center py-4 text-muted-foreground">Belum ada data</td></tr>
                ) : classificationStats.masuk.map((item) => (
                  <tr key={item.kode}>
                    <td className="font-medium">{item.kode}</td>
                    <td className="text-right font-bold text-primary">{item.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="minimal-card !p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="font-semibold text-[14px] text-foreground">Surat Keluar per Klasifikasi</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full minimal-table">
              <thead>
                <tr>
                  <th>Kode Klasifikasi</th>
                  <th className="text-right">Jumlah Surat</th>
                </tr>
              </thead>
              <tbody>
                {classificationStats.keluar.length === 0 ? (
                  <tr><td colSpan={2} className="text-center py-4 text-muted-foreground">Belum ada data</td></tr>
                ) : classificationStats.keluar.map((item) => (
                  <tr key={item.kode}>
                    <td className="font-medium">{item.kode}</td>
                    <td className="text-right font-bold text-primary">{item.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, description, trend, color = "text-foreground" }: any) {
  return (
    <div className="minimal-card">
      <span className="text-[12px] text-muted-foreground uppercase tracking-wider font-medium mb-2 block">{title}</span>
      <div className={`text-[28px] font-bold ${color}`}>{value}</div>
      <div className={`text-[12px] mt-1 ${trend === 'up' ? 'text-green-600 dark:text-green-400' : trend === 'down' ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'}`}>
        {description}
      </div>
    </div>
  );
}
