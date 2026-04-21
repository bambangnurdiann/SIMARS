/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { useAuth } from '@/hooks/useAuth';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import KlasifikasiPage from '@/pages/Klasifikasi';
import SuratMasukPage from '@/pages/SuratMasuk';
import SuratKeluarPage from '@/pages/SuratKeluar';
import SuratKeputusanPage from '@/pages/SuratKeputusan';
import BukuAgendaPage from '@/pages/BukuAgenda';
import DisposisiPage from '@/pages/Disposisi';
import PengaturanInstansi from '@/pages/PengaturanInstansi';
import PengaturanPengguna from '@/pages/PengaturanPengguna';
import Layout from '@/components/layout/Layout';

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
        
        <Route element={user ? <Layout /> : <Navigate to="/login" />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/referensi" element={<KlasifikasiPage />} />
          <Route path="/surat-masuk" element={<SuratMasukPage />} />
          <Route path="/surat-masuk/:id/disposisi" element={<DisposisiPage />} />
          <Route path="/surat-keluar" element={<SuratKeluarPage />} />
          <Route path="/surat-keputusan" element={<SuratKeputusanPage />} />
          <Route path="/buku-agenda" element={<BukuAgendaPage />} />
          <Route path="/pengaturan/instansi" element={<PengaturanInstansi />} />
          <Route path="/pengaturan/pengguna" element={<PengaturanPengguna />} />
        </Route>
      </Routes>
      <Toaster />
    </Router>
  );
}
