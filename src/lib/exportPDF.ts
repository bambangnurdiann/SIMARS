import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { SuratMasuk, Disposisi } from '@/types';

export const exportLembarDisposisi = async (surat: SuratMasuk, disposisi: Disposisi[], instansi: any) => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header / Kop Surat
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(instansi?.nama || 'INSTANSI PEMERINTAH', pageWidth / 2, 18, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(instansi?.alamat || 'Alamat Instansi', pageWidth / 2, 23, { align: 'center' });
  
  doc.setLineWidth(0.5);
  doc.line(15, 28, pageWidth - 15, 28);
  doc.setLineWidth(0.2);
  doc.line(15, 29, pageWidth - 15, 29);

  // Title
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('LEMBAR DISPOSISI', pageWidth / 2, 40, { align: 'center' });

  // Surat Info Table
  autoTable(doc, {
    startY: 45,
    theme: 'grid',
    head: [],
    body: [
      ['No. Agenda', `: ${surat.noAgenda}`, 'Kode Klasifikasi', `: ${surat.kodeKlasifikasi}`],
      ['Asal Surat', `: ${surat.asalSurat}`, 'Nomor Surat', `: ${surat.nomorSurat}`],
      ['Tanggal Surat', `: ${format(new Date(surat.tanggalSurat), 'dd MMMM yyyy', { locale: localeId })}`, 'Diterima Tgl', `: ${format(new Date(surat.createdAt?.toDate()), 'dd MMMM yyyy', { locale: localeId })}`],
    ],
    styles: { fontSize: 10, cellPadding: 3 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 35 },
      1: { cellWidth: 60 },
      2: { fontStyle: 'bold', cellWidth: 35 },
      3: { cellWidth: 60 },
    }
  });

  // Perihal
  const finalY = (doc as any).lastAutoTable.finalY;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Perihal / Isi Ringkas:', 15, finalY + 10);
  doc.setFont('helvetica', 'normal');
  const splitText = doc.splitTextToSize(surat.isiRingkas, pageWidth - 30);
  doc.text(splitText, 15, finalY + 15);

  // Disposisi Table
  autoTable(doc, {
    startY: finalY + 25,
    theme: 'grid',
    head: [['Tujuan Disposisi', 'Isi Instruksi', 'Sifat', 'Batas Waktu']],
    body: disposisi.map(d => [
      d.tujuanNama,
      d.isiDisposisi,
      d.sifat,
      format(new Date(d.batasWaktu), 'dd/MM/yyyy')
    ]),
    headStyles: { fillColor: [22, 163, 74], textColor: 255 },
    styles: { fontSize: 9 },
  });

  // Footer / Tanda Tangan
  const lastY = (doc as any).lastAutoTable.finalY;
  const footerY = Math.max(lastY + 20, 240);
  
  doc.setFontSize(10);
  doc.text('Dicetak pada: ' + format(new Date(), 'dd/MM/yyyy HH:mm'), 15, 285);
  
  doc.text('Pimpinan / Atasan,', pageWidth - 70, footerY);
  doc.setFont('helvetica', 'bold');
  doc.text(instansi?.namaPimpinan || '................................', pageWidth - 70, footerY + 30);
  doc.setFont('helvetica', 'normal');
  doc.text('NIP. ' + (instansi?.nipPimpinan || '................................'), pageWidth - 70, footerY + 35);

  doc.save(`Lembar_Disposisi_${surat.noAgenda}.pdf`);
};
