import { 
  Document, 
  Packer, 
  Paragraph, 
  TextRun, 
  Table, 
  TableRow, 
  TableCell, 
  WidthType, 
  BorderStyle, 
  AlignmentType, 
  HeadingLevel,
  VerticalAlign
} from 'docx';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { SuratMasuk, Disposisi } from '@/types';

export const exportLembarDisposisiDocx = async (surat: SuratMasuk, disposisi: Disposisi[], instansi: any) => {
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        // Header
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              text: instansi?.nama || 'INSTANSI PEMERINTAH',
              bold: true,
              size: 28, // 14pt
              color: "000000",
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              text: instansi?.alamat || 'Alamat Instansi',
              size: 20, // 10pt
              color: "000000",
            }),
          ],
        }),
        // Double line logic
        new Paragraph({
          border: {
            bottom: {
              color: "000000",
              space: 1,
              style: BorderStyle.SINGLE,
              size: 6,
            },
          },
        }),
        new Paragraph({ text: "" }), // Spacing

        // Title
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              text: 'LEMBAR DISPOSISI',
              bold: true,
              size: 32, // Sedikit diperbesar untuk judul (16pt)
              color: "000000",
            }),
          ],
        }),
        new Paragraph({ text: "" }), // Spacing

        // Info Table
        new Table({
          width: {
            size: 100,
            type: WidthType.PERCENTAGE,
          },
          rows: [
            new TableRow({
              children: [
                createCell("No. Agenda", true),
                createCell(`: ${surat.noAgenda}`),
                createCell("Kode Klasifikasi", true),
                createCell(`: ${surat.kodeKlasifikasi}`),
              ],
            }),
            new TableRow({
              children: [
                createCell("Asal Surat", true),
                createCell(`: ${surat.asalSurat}`),
                createCell("Nomor Surat", true),
                createCell(`: ${surat.nomorSurat}`),
              ],
            }),
            new TableRow({
              children: [
                createCell("Tanggal Surat", true),
                createCell(`: ${format(new Date(surat.tanggalSurat), 'dd MMMM yyyy', { locale: localeId })}`),
                createCell("Diterima Tgl", true),
                createCell(`: ${format(new Date(surat.createdAt?.toDate()), 'dd MMMM yyyy', { locale: localeId })}`),
              ],
            }),
          ],
        }),

        new Paragraph({ text: "" }), // Spacing
        new Paragraph({
          children: [
            new TextRun({ text: 'Perihal / Isi Ringkas:', bold: true, color: "000000" }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({ text: surat.isiRingkas, color: "000000" }),
          ],
        }),

        new Paragraph({ text: "" }), // Spacing
        new Paragraph({
          children: [
            new TextRun({ text: 'RIWAYAT DISPOSISI:', bold: true, color: "000000" }),
          ],
        }),
        new Table({
          width: {
            size: 100,
            type: WidthType.PERCENTAGE,
          },
          rows: [
            new TableRow({
              children: [
                createHeaderCell("Tujuan Disposisi"),
                createHeaderCell("Isi Instruksi"),
                createHeaderCell("Sifat"),
                createHeaderCell("Batas Waktu"),
              ],
            }),
            ...disposisi.map(d => new TableRow({
              children: [
                createCell(d.tujuanNama),
                createCell(d.isiDisposisi),
                createCell(d.sifat),
                createCell(format(new Date(d.batasWaktu), 'dd/MM/yyyy')),
              ],
            })),
          ],
        }),

        new Paragraph({ text: "" }), // Spacing
        new Paragraph({ text: "" }), // Spacing

        // Footer
        new Table({
          width: {
            size: 100,
            type: WidthType.PERCENTAGE,
          },
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  border: {
                    top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                    bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                    left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                    right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                  },
                  children: [
                    new Paragraph({
                      children: [new TextRun({ text: 'Dicetak pada: ' + format(new Date(), 'dd/MM/yyyy HH:mm'), size: 16, color: "000000" })],
                    }),
                  ],
                  width: { size: 50, type: WidthType.PERCENTAGE }
                }),
                new TableCell({
                  border: {
                    top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                    bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                    left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                    right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                  },
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      children: [new TextRun({ text: 'Pimpinan / Atasan,', color: "000000" })],
                    }),
                    new Paragraph({ text: "" }),
                    new Paragraph({ text: "" }),
                    new Paragraph({ text: "" }),
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      children: [new TextRun({ text: instansi?.namaPimpinan || '................................', bold: true, color: "000000" })],
                    }),
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      children: [new TextRun({ text: 'NIP. ' + (instansi?.nipPimpinan || '................................'), color: "000000" })],
                    }),
                  ],
                  width: { size: 50, type: WidthType.PERCENTAGE }
                }),
              ],
            }),
          ],
        }),
      ],
    }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Lembar_Disposisi_${surat.noAgenda}.docx`);
};

function createCell(text: string, bold: boolean = false) {
  return new TableCell({
    verticalAlign: VerticalAlign.CENTER,
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text,
            bold,
            size: 20, // 10pt
            color: "000000",
          }),
        ],
      }),
    ],
    margins: {
      top: 100,
      bottom: 100,
      left: 100,
      right: 100,
    },
  });
}

function createHeaderCell(text: string) {
  return new TableCell({
    verticalAlign: VerticalAlign.CENTER,
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text,
            bold: true,
            size: 20, // 10pt
            color: "000000",
          }),
        ],
      }),
    ],
    margins: {
      top: 100,
      bottom: 100,
      left: 100,
      right: 100,
    },
  });
}
