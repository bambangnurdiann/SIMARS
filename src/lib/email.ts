/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export async function sendEmailNotification(to: string | string[], subject: string, html: string) {
  try {
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ to, subject, html }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to send email');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Email notification error:', error);
    // We don't want to break the app flow if email fails
    return null;
  }
}

export const emailTemplates = {
  newSuratMasuk: (data: any) => `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded: 8px;">
      <h2 style="color: #16a34a;">Notifikasi Surat Masuk Baru</h2>
      <p>Halo Pimpinan, ada surat masuk baru yang memerlukan perhatian Anda.</p>
      <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0;">
        <p><strong>No. Agenda:</strong> ${data.noAgenda}</p>
        <p><strong>Asal Surat:</strong> ${data.asalSurat}</p>
        <p><strong>Nomor Surat:</strong> ${data.nomorSurat}</p>
        <p><strong>Isi Ringkas:</strong> ${data.isiRingkas}</p>
        <p><strong>Tanggal Surat:</strong> ${data.tanggalSurat}</p>
      </div>
      <p>Silakan login ke aplikasi SIMARS untuk melihat detail selengkapnya.</p>
      <a href="${window.location.origin}" style="display: inline-block; background-color: #16a34a; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Buka Aplikasi</a>
    </div>
  `,
  newDisposisi: (data: any) => `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded: 8px;">
      <h2 style="color: #16a34a;">Notifikasi Disposisi Baru</h2>
      <p>Halo, Anda menerima instruksi disposisi baru.</p>
      <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0;">
        <p><strong>Dari:</strong> ${data.pengolahNama}</p>
        <p><strong>Isi Disposisi:</strong> ${data.isiDisposisi}</p>
        <p><strong>Sifat:</strong> ${data.sifat}</p>
        <p><strong>Batas Waktu:</strong> ${data.batasWaktu}</p>
      </div>
      <p>Silakan login ke aplikasi SIMARS untuk menindaklanjuti.</p>
      <a href="${window.location.origin}" style="display: inline-block; background-color: #16a34a; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Buka Aplikasi</a>
    </div>
  `
};
