import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Vote, Ballot } from '../types';
import { VoteType } from '../types';

interface UserInfo {
  id: string;
  fullName: string;
  aptNumber: number;
}

interface HouseConfig {
  address: string;
  totalApartments: number;
}

interface PdfOptions {
  vote: Vote;
  ballots: Ballot[];
  users: UserInfo[];
  houseConfig: HouseConfig;
  includeDetails: boolean;
  language: 'lv' | 'ru';
  t: (key: string) => string;
}

export async function generateVoteProtocolPdf(opts: PdfOptions) {
  const { vote, ballots, users, houseConfig, includeDetails, language, t } = opts;
  const locale = language === 'lv' ? 'lv-LV' : 'ru-RU';
  const voteBallots = ballots.filter(b => b.voteId === vote.id);
  const totalApts = houseConfig.totalApartments;
  const participation = voteBallots.length;
  const participationPct = totalApts > 0 ? Math.round((participation / totalApts) * 100) : 0;
  const quorumReached = participationPct > 50;

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
  const marginL = 20;
  const marginR = 20;
  const contentW = pageW - marginL - marginR;
  let y = 20;

  // ── Helpers ──
  const addPageFooter = () => {
    const pageH = doc.internal.pageSize.getHeight();
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
    const pageH = doc.internal.pageSize.getHeight();
    if (y + needed > pageH - 20) {
      doc.addPage();
      y = 20;
    }
  };

  // ── 1. HEADER ──
  doc.setFontSize(10);
  doc.setTextColor(120, 120, 120);
  doc.text(houseConfig.address, pageW / 2, y, { align: 'center' });
  y += 8;

  doc.setFontSize(16);
  doc.setTextColor(30, 30, 30);
  doc.text(t('pdf.title'), pageW / 2, y, { align: 'center' });
  y += 7;

  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  const protocolNo = `Nr. ${vote.id.substring(0, 8).toUpperCase()}`;
  const genDate = new Date().toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' });
  doc.text(`${protocolNo}  |  ${genDate}`, pageW / 2, y, { align: 'center' });
  y += 4;

  // Separator line
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(marginL, y, pageW - marginR, y);
  y += 8;

  // ── 2. VOTE INFO ──
  doc.setFontSize(11);
  doc.setTextColor(30, 30, 30);
  doc.text(t('pdf.vote_info'), marginL, y);
  y += 6;

  const voteInfoRows = [
    [t('pdf.vote_title'), vote.title],
    [t('pdf.vote_desc'), vote.description],
    [t('pdf.vote_type'), vote.type === VoteType.YES_NO ? t('pdf.type_yes_no') : t('pdf.type_multi')],
    [t('pdf.vote_period'), `${new Date(vote.startDate).toLocaleDateString(locale)} - ${new Date(vote.endDate).toLocaleDateString(locale)}`],
    [t('pdf.vote_status'), new Date() > new Date(vote.endDate) ? t('pdf.status_closed') : t('pdf.status_active')],
  ];

  autoTable(doc, {
    startY: y,
    head: [],
    body: voteInfoRows,
    theme: 'plain',
    styles: { font: 'Roboto', fontSize: 9, cellPadding: 2.5, textColor: [50, 50, 50] },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 45, textColor: [100, 100, 100] },
      1: { cellWidth: contentW - 45 },
    },
    margin: { left: marginL, right: marginR },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // ── Compute vote counts & winner (shared by chart + table) ──
  const chartColors: [number, number, number][] = [
    [59, 130, 246],   // blue
    [239, 68, 68],    // red
    [245, 158, 11],   // amber
    [34, 197, 94],    // green
    [139, 92, 246],   // purple
    [236, 72, 153],   // pink
  ];

  const optionData = vote.options.map((opt, i) => {
    const count = voteBallots.filter(b =>
      b.selectedOptionId === opt.id ||
      (b.selectedYes === true && opt.id === 'yes') ||
      (b.selectedYes === false && opt.id === 'no')
    ).length;
    const pct = participation > 0 ? Math.round((count / participation) * 100) : 0;
    return { text: opt.text, count, pct, color: chartColors[i % chartColors.length] };
  });

  let maxVotes = 0;
  let winnerIdx = -1;
  optionData.forEach((d, i) => {
    if (d.count > maxVotes) { maxVotes = d.count; winnerIdx = i; }
  });

  const resultRows = optionData.map(d => [d.text, String(d.count), `${d.pct}%`]);

  // ── 3. PARTICIPATION (left) + DONUT CHART (right) — side by side ──
  const sectionH = 60; // height for the combined section
  checkPageBreak(sectionH + 15);

  // Split page: left half = stats table, right half = donut chart
  const halfW = contentW / 2;

  // — Left: Participation title + table —
  const sectionTopY = y;
  doc.setFontSize(11);
  doc.setTextColor(30, 30, 30);
  doc.text(t('pdf.participation'), marginL, y);
  y += 6;

  const participationRows = [
    [t('pdf.total_apts'), String(totalApts)],
    [t('pdf.voted_count'), `${participation} (${participationPct}%)`],
    [t('pdf.not_voted'), `${totalApts - participation} (${100 - participationPct}%)`],
    [t('pdf.quorum_status'), quorumReached ? t('pdf.quorum_reached') : t('pdf.quorum_not_reached')],
  ];

  autoTable(doc, {
    startY: y,
    head: [],
    body: participationRows,
    theme: 'plain',
    styles: { font: 'Roboto', fontSize: 9, cellPadding: 2.5, textColor: [50, 50, 50] },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 38, textColor: [100, 100, 100] },
      1: { cellWidth: halfW - 42 },
    },
    margin: { left: marginL, right: pageW - marginL - halfW + 4 },
    tableWidth: halfW - 4,
  });

  // — Right: Donut chart title + chart + legend —
  const rightX = marginL + halfW + 4;
  doc.setFontSize(11);
  doc.setTextColor(30, 30, 30);
  doc.text(t('pdf.chart_title'), rightX, sectionTopY);

  const outerR = 18;
  const innerR = 11;
  const cx = rightX + outerR + 2;
  const cy = sectionTopY + 6 + outerR;

  // Draw filled sectors
  let startAngle = -Math.PI / 2;
  optionData.forEach(seg => {
    if (seg.pct === 0) return;
    const sweep = (seg.pct / 100) * 2 * Math.PI;
    const endAngle = startAngle + sweep;
    const steps = Math.max(Math.ceil(sweep / 0.08), 3);
    doc.setFillColor(seg.color[0], seg.color[1], seg.color[2]);
    doc.setDrawColor(seg.color[0], seg.color[1], seg.color[2]);
    for (let i = 0; i < steps; i++) {
      const a1 = startAngle + (sweep * i) / steps;
      const a2 = startAngle + (sweep * (i + 1)) / steps;
      const x1 = cx + outerR * Math.cos(a1);
      const y1 = cy + outerR * Math.sin(a1);
      const x2 = cx + outerR * Math.cos(a2);
      const y2 = cy + outerR * Math.sin(a2);
      doc.triangle(cx, cy, x1, y1, x2, y2, 'F');
    }
    startAngle = endAngle;
  });

  // Cut out donut hole
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(255, 255, 255);
  doc.circle(cx, cy, innerR, 'F');

  // Winner % in center
  if (winnerIdx >= 0) {
    doc.setFont('Roboto', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(optionData[winnerIdx].color[0], optionData[winnerIdx].color[1], optionData[winnerIdx].color[2]);
    doc.text(`${optionData[winnerIdx].pct}%`, cx, cy + 1, { align: 'center' });
    doc.setFont('Roboto', 'normal');
    doc.setFontSize(5.5);
    doc.setTextColor(120, 120, 120);
    doc.text(t('pdf.chart_winner'), cx, cy + 5, { align: 'center' });
  }

  // Legend (right of donut)
  const legendX = cx + outerR + 8;
  let legendY = sectionTopY + 10;
  doc.setFont('Roboto', 'normal');
  optionData.forEach(seg => {
    doc.setFillColor(seg.color[0], seg.color[1], seg.color[2]);
    doc.roundedRect(legendX, legendY - 2.5, 3.5, 3.5, 0.8, 0.8, 'F');
    doc.setFontSize(8);
    doc.setTextColor(50, 50, 50);
    const label = seg.text.length > 20 ? seg.text.substring(0, 18) + '…' : seg.text;
    doc.text(label, legendX + 5, legendY);
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 120);
    doc.text(`${seg.count} (${seg.pct}%)`, legendX + 5, legendY + 3.5);
    legendY += 10;
  });

  // Advance y past the taller of the two sides
  const tableEndY = (doc as any).lastAutoTable.finalY;
  const chartEndY = cy + outerR + 4;
  y = Math.max(tableEndY, chartEndY) + 10;

  // ── 4. RESULTS TABLE ──
  checkPageBreak(40);
  doc.setFontSize(11);
  doc.setTextColor(30, 30, 30);
  doc.text(t('pdf.results'), marginL, y);
  y += 6;

  autoTable(doc, {
    startY: y,
    head: [[t('pdf.option'), t('pdf.vote_count'), '%']],
    body: resultRows,
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246], textColor: 255, fontSize: 9, fontStyle: 'bold', halign: 'center' },
    styles: { font: 'Roboto', fontSize: 9, cellPadding: 3, textColor: [50, 50, 50], halign: 'center' },
    columnStyles: {
      0: { halign: 'left', cellWidth: contentW - 50 },
      1: { cellWidth: 25 },
      2: { cellWidth: 25 },
    },
    margin: { left: marginL, right: marginR },
    didParseCell: (data: any) => {
      if (data.section === 'body' && data.row.index === winnerIdx) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [239, 246, 255];
      }
    },
  });
  y = (doc as any).lastAutoTable.finalY + 5;

  // Decision
  checkPageBreak(15);
  const decisionText = quorumReached
    ? (winnerIdx >= 0 ? `${t('pdf.decision')}: ${resultRows[winnerIdx][0]} (${resultRows[winnerIdx][2]})` : t('pdf.no_decision'))
    : t('pdf.no_quorum_decision');

  doc.setFontSize(10);
  doc.setTextColor(30, 30, 30);
  const decisionLines = doc.splitTextToSize(decisionText, contentW);
  doc.text(decisionLines, marginL, y + 3);
  y += decisionLines.length * 5 + 8;

  // ── 5. DETAILED BALLOT TABLE (optional) ──
  if (includeDetails) {
    checkPageBreak(25);
    doc.setFontSize(11);
    doc.setTextColor(30, 30, 30);
    doc.text(t('pdf.detail_title'), marginL, y);
    y += 6;

    const getBallotAnswer = (ballot: Ballot): string => {
      if (vote.type === VoteType.YES_NO) {
        return ballot.selectedYes ? t('pdf.yes') : t('pdf.no');
      }
      const opt = vote.options.find(o => o.id === ballot.selectedOptionId);
      return opt ? opt.text : '-';
    };

    // Sort by apartment number
    const sortedBallots = [...voteBallots].sort((a, b) => a.aptNumber - b.aptNumber);

    const detailRows = sortedBallots.map((ballot, i) => {
      const user = users.find(u => u.id === ballot.userId || u.aptNumber === ballot.aptNumber);
      const dateStr = ballot.submittedAt;
      const formattedDate = dateStr ? new Date(dateStr).toLocaleDateString(locale) : '-';
      return [
        String(i + 1),
        `#${ballot.aptNumber}`,
        user ? user.fullName : '-',
        getBallotAnswer(ballot),
        formattedDate,
      ];
    });

    autoTable(doc, {
      startY: y,
      head: [['#', t('pdf.apt'), t('pdf.owner'), t('pdf.answer'), t('pdf.date')]],
      body: detailRows,
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246], textColor: 255, fontSize: 8, fontStyle: 'bold', halign: 'center' },
      styles: { font: 'Roboto', fontSize: 8, cellPadding: 2.5, textColor: [50, 50, 50], halign: 'center' },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 18 },
        2: { halign: 'left', cellWidth: contentW - 78 },
        3: { cellWidth: 30 },
        4: { cellWidth: 20 },
      },
      margin: { left: marginL, right: marginR },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });
    y = (doc as any).lastAutoTable.finalY + 8;

    // Non-voted apartments
    checkPageBreak(20);
    const votedApts = new Set(voteBallots.map(b => b.aptNumber));
    const nonVotedUsers = users.filter(u => !votedApts.has(u.aptNumber)).sort((a, b) => a.aptNumber - b.aptNumber);

    if (nonVotedUsers.length > 0) {
      doc.setFontSize(11);
      doc.setTextColor(30, 30, 30);
      doc.text(t('pdf.not_voted_title'), marginL, y);
      y += 6;

      const nonVotedRows = nonVotedUsers.map((u, i) => [
        String(i + 1),
        `#${u.aptNumber}`,
        u.fullName,
      ]);

      autoTable(doc, {
        startY: y,
        head: [['#', t('pdf.apt'), t('pdf.owner')]],
        body: nonVotedRows,
        theme: 'striped',
        headStyles: { fillColor: [156, 163, 175], textColor: 255, fontSize: 8, fontStyle: 'bold', halign: 'center' },
        styles: { font: 'Roboto', fontSize: 8, cellPadding: 2.5, textColor: [100, 100, 100], halign: 'center' },
        columnStyles: {
          0: { cellWidth: 10 },
          1: { cellWidth: 18 },
          2: { halign: 'left', cellWidth: contentW - 78 },
        },
        margin: { left: marginL, right: marginR },
        alternateRowStyles: { fillColor: [248, 250, 252] },
      });
      y = (doc as any).lastAutoTable.finalY + 8;
    }
  }

  // ── 6. SIGNATURE SPACE ──
  checkPageBreak(40);
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);

  // Admin signature line
  y += 5;
  doc.line(marginL, y + 15, marginL + 70, y + 15);
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(t('pdf.signature_admin'), marginL, y + 20);

  // Manager signature line
  doc.line(pageW - marginR - 70, y + 15, pageW - marginR, y + 15);
  doc.text(t('pdf.signature_manager'), pageW - marginR - 70, y + 20);

  // ── Footer on all pages ──
  addPageFooter();

  // ── Save ──
  const filename = `balsojums_${vote.id.substring(0, 8)}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}
