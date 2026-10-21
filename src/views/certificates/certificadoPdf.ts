import type { Certificate } from './useCertificados';

const LOGO_URL =
  'https://linsagro.com.br/wp-content/uploads/2022/07/cropped-Lins_Logo_Horizontal_RGB_Preferencial_20250512_Keenwork_AF.png';

// Mesma paleta das telas (RGB)
const INDIGO_600: [number, number, number] = [79, 70, 229];
const INDIGO_700: [number, number, number] = [67, 56, 202];
const SLATE_900: [number, number, number] = [15, 23, 42];
const SLATE_700: [number, number, number] = [51, 65, 85];
const SLATE_500: [number, number, number] = [100, 116, 139];
const SLATE_400: [number, number, number] = [148, 163, 184];
const EMERALD_600: [number, number, number] = [5, 150, 105];

type LoadedImage = { dataUrl: string; width: number; height: number };

// Baixa a logo e converte para data URL. Se o servidor bloquear (CORS) ou falhar, devolve null
// e o PDF usa o nome da empresa em texto.
const loadImage = async (url: string): Promise<LoadedImage | null> => {
  try {
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) return null;
    const blob = await response.blob();

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    const size = await new Promise<{ width: number; height: number }>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = reject;
      img.src = dataUrl;
    });

    return { dataUrl, ...size };
  } catch {
    return null;
  }
};

const formatDate = (dateString: string) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('pt-BR');
};

// Nome de arquivo seguro: sem caracteres que o sistema operacional não aceita
const buildFileName = (cert: Certificate) => {
  const safe = `Certificado - ${cert.employeeName} - ${cert.code}`.replace(/[\\/:*?"<>|]/g, '').trim();
  return `${safe}.pdf`;
};

// Gera e baixa o certificado em PDF, A4 paisagem, só com o diploma.
// jsPDF é carregado sob demanda para não pesar o carregamento inicial do sistema.
export async function downloadCertificatePdf(cert: Certificate): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  const pageW = doc.internal.pageSize.getWidth(); // 297
  const pageH = doc.internal.pageSize.getHeight(); // 210
  const centerX = pageW / 2;

  // Moldura dupla
  doc.setDrawColor(...INDIGO_600);
  doc.setLineWidth(1.2);
  doc.rect(8, 8, pageW - 16, pageH - 16);
  doc.setLineWidth(0.3);
  doc.rect(11, 11, pageW - 22, pageH - 22);

  // Logo (ou nome em texto, se a imagem não puder ser carregada)
  const logo = await loadImage(LOGO_URL);
  let logoDrawn = false;
  if (logo) {
    try {
      const logoH = 14;
      const logoW = (logo.width / logo.height) * logoH;
      doc.addImage(logo.dataUrl, 'PNG', centerX - logoW / 2, 20, logoW, logoH);
      logoDrawn = true;
    } catch {
      logoDrawn = false;
    }
  }
  if (!logoDrawn) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(...INDIGO_700);
    doc.text('LINS AGROINDUSTRIAL', centerX, 31, { align: 'center' });
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...INDIGO_600);
  doc.text('UNIVERSIDADE CORPORATIVA', centerX, 42, { align: 'center' });

  // Título
  doc.setFontSize(28);
  doc.setTextColor(...INDIGO_700);
  doc.text('CERTIFICADO DE CAPACITAÇÃO', centerX, 62, { align: 'center' });

  // Colaborador
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(13);
  doc.setTextColor(...SLATE_500);
  doc.text('Certificamos que o colaborador', centerX, 78, { align: 'center' });

  let nameSize = 32;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(nameSize);
  while (doc.getTextWidth(cert.employeeName) > 240 && nameSize > 16) {
    nameSize -= 1;
    doc.setFontSize(nameSize);
  }
  doc.setTextColor(...SLATE_900);
  doc.text(cert.employeeName, centerX, 94, { align: 'center' });

  // Treinamento
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(13);
  doc.setTextColor(...SLATE_700);
  doc.text('concluiu com êxito o treinamento de', centerX, 108, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  let titleSize = 20;
  doc.setFontSize(titleSize);
  let titleLines: string[] = doc.splitTextToSize(cert.trainingTitle, 230);
  if (titleLines.length > 2) {
    titleSize = 16;
    doc.setFontSize(titleSize);
    titleLines = doc.splitTextToSize(cert.trainingTitle, 230);
  }
  doc.setTextColor(...INDIGO_700);
  const titleLineHeight = titleSize * 0.42;
  titleLines.forEach((line, index) => {
    doc.text(line, centerX, 121 + index * titleLineHeight, { align: 'center' });
  });

  const detailsY = 121 + (titleLines.length - 1) * titleLineHeight + 10;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(13);
  doc.setTextColor(...SLATE_700);
  doc.text(
    `com carga horária de ${cert.workloadHours} horas, concluído em ${formatDate(cert.issueDate)}.`,
    centerX,
    detailsY,
    { align: 'center' }
  );

  // Rodapé: instrutor à esquerda, autenticidade e código à direita
  const footerY = 168;

  doc.setDrawColor(...SLATE_400);
  doc.setLineWidth(0.3);
  doc.line(30, footerY, 110, footerY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...SLATE_900);
  doc.text(cert.instructorName, 30, footerY + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...SLATE_500);
  doc.text('Instrutor Técnico', 30, footerY + 11);

  const rightX = pageW - 30;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...EMERALD_600);
  doc.text('Autêntico', rightX, footerY - 4, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...SLATE_500);
  doc.text('Código de validação', rightX, footerY + 2, { align: 'right' });
  doc.setFont('courier', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...INDIGO_700);
  doc.text(cert.code, rightX, footerY + 9, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...SLATE_400);
  doc.text(
    'Para conferir a autenticidade, informe o código de validação na página de Validação de Certificados.',
    centerX,
    pageH - 15,
    { align: 'center' }
  );

  doc.save(buildFileName(cert));
}
