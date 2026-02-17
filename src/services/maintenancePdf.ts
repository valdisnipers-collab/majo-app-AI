import jsPDF from 'jspdf';
import type { MaintenanceTopic } from '../types';

interface PdfOptions {
  topic: MaintenanceTopic;
  houseConfig: {
    address: string;
    totalApartments: number;
  };
  language: 'lv' | 'ru';
  t: (key: string) => string;
}

export async function generateMaintenancePdf(opts: PdfOptions) {
  const { topic, houseConfig, language, t } = opts;
  const locale = language === 'lv' ? 'lv-LV' : 'ru-RU';

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // ── Load and register custom fonts for LV/RU diacritics ──
  const loadFont = async (url: string, name: string, style: string) => {
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);
    const fileName = `${name}-${style}.ttf`;
    doc.addFileToVFS(fileName, base64);
    doc.addFont(fileName, name, style);
  };

  await loadFont('/fonts/Roboto-Regular.ttf', 'Roboto', 'normal');
  await loadFont('/fonts/Roboto-Bold.ttf', 'Roboto', 'bold');
  doc.setFont('Roboto', 'normal');

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginL = 20;
  const marginR = 20;
  const contentW = pageW - marginL - marginR;
  let y = 20;

  // ── Helpers ──
  const addPageFooter = () => {
    const pages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(160, 160, 160);
      doc.text(`Majo | ${new Date().toLocaleString(locale)}`, marginL, pageH - 8);
      doc.text(`${i} / ${pages}`, pageW - marginR, pageH - 8, { align: 'right' });
    }
  };

  const checkPageBreak = (needed: number) => {
    if (y + needed > pageH - 20) {
      doc.addPage();
      y = 20;
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case 'NEW': return t('maintenance.status_new');
      case 'APPROVED': return t('maintenance.status_approved');
      case 'RESOLVED': return t('maintenance.status_resolved');
      case 'REJECTED': return t('maintenance.status_rejected');
      default: return status;
    }
  };

  const priorityLabel = (priority: string) => {
    return priority === 'urgent' ? t('maintenance.urgent_badge') : t('maintenance.prio_normal');
  };

  // ── 1. HEADER ──
  doc.setFontSize(10);
  doc.setTextColor(120, 120, 120);
  doc.text(houseConfig.address, pageW / 2, y, { align: 'center' });
  y += 8;

  doc.setFontSize(16);
  doc.setTextColor(30, 30, 30);
  doc.setFont('Roboto', 'bold');
  doc.text(t('admin_maintenance.pdf_title'), pageW / 2, y, { align: 'center' });
  y += 7;

  doc.setFontSize(9);
  doc.setFont('Roboto', 'normal');
  doc.setTextColor(120, 120, 120);
  const reportNo = `Nr. ${topic.id.substring(0, 8).toUpperCase()}`;
  const genDate = new Date().toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' });
  doc.text(`${reportNo}  |  ${genDate}`, pageW / 2, y, { align: 'center' });
  y += 4;

  // Separator
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(marginL, y, pageW - marginR, y);
  y += 10;

  // ── 2. REQUEST INFO TABLE ──
  const labelX = marginL;
  const valueX = marginL + 45;
  const lineH = 7;

  const drawRow = (label: string, value: string) => {
    checkPageBreak(lineH + 2);
    doc.setFontSize(9);
    doc.setFont('Roboto', 'bold');
    doc.setTextColor(100, 100, 100);
    doc.text(label, labelX, y);
    doc.setFont('Roboto', 'normal');
    doc.setTextColor(50, 50, 50);
    const lines = doc.splitTextToSize(value, contentW - 45);
    doc.text(lines, valueX, y);
    y += lines.length * 5 + 3;
  };

  drawRow(t('admin_maintenance.pdf_category'), topic.category);
  drawRow(t('admin_maintenance.pdf_subject'), topic.title);
  drawRow(t('admin_maintenance.pdf_priority'), priorityLabel(topic.priority));
  drawRow(t('admin_maintenance.pdf_status'), statusLabel(topic.status));
  drawRow(t('admin_maintenance.pdf_submitter'), `${topic.authorName} (${t('home.apartment')} ${topic.aptNumber})`);
  drawRow(t('admin_maintenance.pdf_date'), new Date(topic.date).toLocaleString(locale));

  if (topic.status === 'REJECTED' && topic.rejectionReason) {
    drawRow(t('maintenance.rejection_reason_prefix'), topic.rejectionReason);
  }

  y += 3;
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.2);
  doc.line(marginL, y, pageW - marginR, y);
  y += 8;

  // ── 3. DESCRIPTION ──
  checkPageBreak(20);
  doc.setFontSize(11);
  doc.setFont('Roboto', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text(t('admin_maintenance.pdf_description'), marginL, y);
  y += 6;

  doc.setFontSize(9);
  doc.setFont('Roboto', 'normal');
  doc.setTextColor(50, 50, 50);
  const descLines = doc.splitTextToSize(topic.description, contentW);
  for (const line of descLines) {
    checkPageBreak(6);
    doc.text(line, marginL, y);
    y += 5;
  }
  y += 5;

  // ── 4. PHOTOS ──
  if (topic.images && topic.images.length > 0) {
    checkPageBreak(20);
    doc.setFontSize(11);
    doc.setFont('Roboto', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text(`${t('admin_maintenance.photos')} (${topic.images.length})`, marginL, y);
    y += 8;

    const imgSize = 50;
    const gap = 5;
    const cols = Math.floor(contentW / (imgSize + gap));
    let col = 0;

    for (const imgSrc of topic.images) {
      try {
        checkPageBreak(imgSize + 10);
        const xPos = marginL + col * (imgSize + gap);
        doc.addImage(imgSrc, 'JPEG', xPos, y, imgSize, imgSize);
        col++;
        if (col >= cols) {
          col = 0;
          y += imgSize + gap;
        }
      } catch {
        // Skip images that fail to load
      }
    }
    if (col > 0) y += imgSize + gap;
    y += 5;
  }

  // ── 5. COMMENTS ──
  if (topic.comments.length > 0) {
    checkPageBreak(20);
    doc.setFontSize(11);
    doc.setFont('Roboto', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text(`${t('maintenance.comments')} (${topic.comments.length})`, marginL, y);
    y += 7;

    for (const comment of topic.comments) {
      checkPageBreak(15);
      doc.setFontSize(8);
      doc.setFont('Roboto', 'bold');
      doc.setTextColor(80, 80, 80);
      doc.text(`${comment.userName}  •  ${new Date(comment.date).toLocaleString(locale)}`, marginL, y);
      y += 4;

      doc.setFontSize(9);
      doc.setFont('Roboto', 'normal');
      doc.setTextColor(50, 50, 50);
      const commentLines = doc.splitTextToSize(comment.text, contentW);
      for (const line of commentLines) {
        checkPageBreak(5);
        doc.text(line, marginL, y);
        y += 4.5;
      }
      y += 3;
    }
  }

  // ── 6. SIGNATURE LINES ──
  checkPageBreak(40);
  y += 10;
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.3);

  // Left signature
  const sigW = contentW / 2 - 10;
  doc.line(marginL, y, marginL + sigW, y);
  doc.setFontSize(8);
  doc.setFont('Roboto', 'normal');
  doc.setTextColor(130, 130, 130);
  doc.text(t('pdf.signature_admin'), marginL, y + 5);

  // Right signature
  const sigRightX = pageW - marginR - sigW;
  doc.line(sigRightX, y, pageW - marginR, y);
  doc.text(t('pdf.signature_manager'), sigRightX, y + 5);

  // ── Footers ──
  addPageFooter();

  // ── Save ──
  const safeTitle = topic.title.replace(/[^a-zA-Z0-9āčēģīķļņōŗšūžĀČĒĢĪĶĻŅŌŖŠŪŽ ]/g, '').replace(/\s+/g, '_').substring(0, 30);
  doc.save(`pieteikums_${safeTitle}_${new Date().toISOString().slice(0, 10)}.pdf`);
}
