/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserLevel = 'super_admin' | 'admin' | 'pimpinan' | 'pegawai';

export interface User {
  id: string;
  username: string;
  nama: string;
  nip: string;
  email: string;
  level: UserLevel;
  createdAt: any;
  updatedAt?: any;
}

export interface Klasifikasi {
  id: string;
  kode: string;
  nama: string;
  uraian: string;
  createdAt: any;
  updatedAt: any;
}

export interface SuratMasuk {
  id: string;
  noAgenda: string; // SM-YYYY-XXXX
  asalSurat: string;
  nomorSurat: string;
  isiRingkas: string;
  kodeKlasifikasi: string;
  indeksBerkas: string;
  tanggalSurat: string;
  fileSurat: string; // URL
  keterangan: string;
  pengolah: string; // userId
  pengolahNama: string;
  createdAt: any;
  updatedAt: any;
  sudahDisposisi: boolean;
}

export interface Disposisi {
  id: string;
  suratMasukId: string;
  tujuanDisposisi: string;
  tujuanNama: string;
  isiDisposisi: string;
  sifat: 'Segera' | 'Biasa' | 'Rahasia';
  batasWaktu: string;
  catatan: string;
  createdAt: any;
  pengolah: string;
  pengolahNama: string;
}

export interface SuratKeluar {
  id: string;
  noAgenda: string; // SK-YYYY-XXXX
  nomorSurat: string; // W[kode]/[noAgenda]/[kodeKlasifikasi]/[bulan]/[tahun]
  tujuanSurat: string;
  isiRingkas: string;
  kodeKlasifikasi: string;
  tanggalSurat: string;
  fileSurat: string; // URL
  keterangan: string;
  pengolah: string;
  pengolahNama: string;
  createdAt: any;
  updatedAt: any;
}

export interface SuratKeputusan {
  id: string;
  noSK: string;
  tahun: string;
  tentang: string;
  tanggalSurat: string;
  fileSurat: string; // URL
  keterangan: string;
  pengolah: string;
  pengolahNama: string;
  createdAt: any;
  updatedAt: any;
}

export interface Instansi {
  nama: string;
  alamat: string;
  namaPimpinan: string;
  nipPimpinan: string;
  logoUrl: string;
  kodeInstansi?: string;
}
