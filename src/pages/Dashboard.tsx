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
  format, 
  subMonths, 
  parseISO, 
  startOfMonth, 
  endOfMonth 
} from 'date-fns';
import { id } from 'date-fns/locale';
import { 
  Mail, 
  Send, 
  FileText, 
  ClipboardList,
  TrendingUp,
  TrendingDown,
  PlusCircle,
  FolderOpen,
  Info
} from 'lucide-react';
import { collection, query, getDocs, where, orderBy, limit, collectionGroup } from 'firebase/firestore';
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
  const [myDispositions, setMyDispositions] = useState<any[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const smSnap = await getDocs(collection(db, 'suratMasuk'));
        const skSnap = await getDocs(collection(db, 'suratKeluar'));
        const skpSnap = await getDocs(collection(db, 'suratKeputusan'));
        // Count sm where sudahDisposisi is false for stats
        const dispPendingSnap = await getDocs(query(collection(db, 'suratMasuk'), where('sudahDisposisi', '==', false)));
        
        setStats({
          suratMasuk: smSnap.size,
          suratKeluar: skSnap.size,
          suratKeputusan: skpSnap.size,
          disposisiPending: dispPendingSnap.size
        });

        // ... (existing chart data logic)

        // My Dispositions (Incoming)
        if (user?.id) {
          try {
            // Fetch all disposisi and filter in memory to avoid index requirements
            const qDisp = query(collectionGroup(db, 'disposisi'));
            const dispSnap = await getDocs(qDisp);
            const myDisp: any[] = [];
            dispSnap.forEach(doc => {
              const d = doc.data();
              if (d.tujuanDisposisi === user.id) {
                myDisp.push({ id: doc.id, ...d });
              }
            });
            
            // Sort manually by date
            myDisp.sort((a, b) => {
               const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 
                             (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0);
               const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 
                             (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0);
               return timeB - timeA;
            });
            
            setMyDispositions(myDisp.slice(0, 10));
          } catch (e: any) {
            console.warn("Disposisi fetch failed:", e.message);
          }
        }

        // Calculate Real Chart Data (Last 6 Months)
        const last6Months = [];
        for (let i = 5; i >= 0; i--) {
          const date = subMonths(new Date(), i);
          last6Months.push({
            monthKey: format(date, 'yyyy-MM'),
            name: format(date, 'MMM', { locale: id }),
            masuk: 0,
            keluar: 0
          });
        }

        smSnap.forEach(doc => {
          const data = doc.data();
          const tanggal = data.tanggalSurat; // yyyy-MM-dd
          if (tanggal) {
            const mKey = tanggal.substring(0, 7);
            const monthIdx = last6Months.findIndex(m => m.monthKey === mKey);
            if (monthIdx !== -1) {
              last6Months[monthIdx].masuk++;
            }
          }
        });

        skSnap.forEach(doc => {
          const data = doc.data();
          const tanggal = data.tanggalKeluar; // yyyy-MM-dd
          if (tanggal) {
            const mKey = tanggal.substring(0, 7);
            const monthIdx = last6Months.findIndex(m => m.monthKey === mKey);
            if (monthIdx !== -1) {
              last6Months[monthIdx].keluar++;
            }
          }
        });

        setChartData(last6Months);

        // Classification stats (real data)
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

        const recentSnap = await getDocs(query(collection(db, 'suratMasuk'), where('sudahDisposisi', '==', false)));
        const recent: any[] = [];
        recentSnap.forEach(doc => recent.push({ id: doc.id, ...doc.data() }));
        // Sort in memory
        recent.sort((a, b) => {
          const tA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
          const tB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
          return tB - tA;
        });
        setRecentSurat(recent.slice(0, 5));
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
      }
    };

    fetchStats();
  }, [user?.id]); // Add user.id to dependency

  const [classificationStats, setClassificationStats] = useState<{masuk: any[], keluar: any[]}>({ masuk: [], keluar: [] });

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Dashboard SIMARS</h1>
          <p className="text-muted-foreground text-[14px]">Sistem Informasi Manajemen Arsip Surat - Pengadilan Agama</p>
        </div>
      </div>

      {/* Debug Section for Super Admin */}
      {user?.email === 'Bambangnurdiann@gmail.com' && (
        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-xl mb-6 text-[12px]">
          <h4 className="font-bold text-yellow-800 mb-1 flex items-center gap-2">
            <Info className="h-4 w-4" /> Mode Diagnostik (Hanya Bapak)
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-yellow-700">
            <div>UID: <span className="font-mono">{user.id}</span></div>
            <div>Level: <span className="font-bold">{user.level}</span></div>
            <div>Email: <span className="font-mono">{user.email}</span></div>
            <div>Database: <span className="font-mono">simars-database</span></div>
          </div>
          <p className="mt-2 opacity-70 italic font-medium">Jika data tetap kosong, kemungkinan Bapak sedang terhubung ke database ID yang berbeda di Firebase. Pastikan file firebase-applet-config.json sudah benar.</p>
        </div>
      )}

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
            <h3 className="font-semibold text-[14px] text-foreground">Surat Masuk (Belum Disposisi)</h3>
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

        <div className="lg:col-span-1 minimal-card !p-0 overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="font-semibold text-[14px] text-foreground">Tugas Disposisi Saya</h3>
          </div>
          <div className="overflow-y-auto flex-1 max-h-[400px]">
             {myDispositions.length === 0 ? (
               <div className="p-8 text-center text-muted-foreground text-[12px]">
                 <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-20" />
                 Tidak ada disposisi untuk Anda
               </div>
             ) : (
               <div className="divide-y divide-border">
                 {myDispositions.map((disp) => (
                   <div key={disp.id} className="p-4 hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => navigate(`/surat-masuk/${disp.suratMasukId}/disposisi`)}>
                      <div className="flex justify-between items-start mb-1">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${disp.sifat === 'Rahasia' ? 'bg-red-100 text-red-700' : disp.sifat === 'Segera' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                          {disp.sifat}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {disp.createdAt?.toDate ? format(disp.createdAt.toDate(), 'dd MMM', { locale: id }) : 'Baru'}
                        </span>
                      </div>
                      <div className="text-[12px] font-semibold text-foreground line-clamp-2">{disp.isiDisposisi}</div>
                      <div className="text-[11px] text-muted-foreground mt-1 italic">Diteruskan oleh: {disp.pengolahNama}</div>
                      {disp.batasWaktu && (
                        <div className="text-[10px] text-orange-600 font-medium mt-1 flex items-center gap-1">
                          Batas: {disp.batasWaktu}
                        </div>
                      )}
                   </div>
                 ))}
               </div>
             )}
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
