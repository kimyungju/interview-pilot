import jsPDF from "jspdf";

interface AnswerData {
  question: string;
  correctAns: string | null;
  userAns: string | null;
  feedback: string | null;
  rating: string | null;
}

interface EnhancedFeedback {
  competencies?: {
    technicalKnowledge: number;
    communicationClarity: number;
    problemSolving: number;
    relevance: number;
  };
  strengths?: string;
  improvements?: string;
  suggestedAnswer?: string;
}

type RGB = [number, number, number];

// ── Design Tokens ──────────────────────────────────────────
const C = {
  navy: [15, 23, 42] as RGB,
  indigo: [99, 102, 241] as RGB,
  emerald: [22, 163, 74] as RGB,
  amber: [217, 119, 6] as RGB,
  red: [220, 38, 38] as RGB,
  blue: [37, 99, 235] as RGB,

  emeraldBg: [240, 253, 244] as RGB,
  amberBg: [255, 251, 235] as RGB,
  redBg: [254, 242, 242] as RGB,
  blueBg: [239, 246, 255] as RGB,
  slateBg: [248, 250, 252] as RGB,
  slateTrack: [226, 232, 240] as RGB,

  textDark: [15, 23, 42] as RGB,
  textMed: [71, 85, 105] as RGB,
  textLight: [148, 163, 184] as RGB,
  white: [255, 255, 255] as RGB,
};

function ratingColor(r: number): RGB {
  if (r >= 4) return C.emerald;
  if (r >= 3) return C.amber;
  return C.red;
}

function tryParse(feedback: string | null): EnhancedFeedback | null {
  if (!feedback) return null;
  try {
    const p = JSON.parse(feedback);
    if (p.competencies) return p;
  } catch {
    // legacy plain-text feedback
  }
  return null;
}

export function generatePdf(answers: AnswerData[], overallRating: string) {
  const doc = new jsPDF();
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const mx = 16;
  const cw = pw - mx * 2;
  let y = 0;
  let page = 1;

  // ── Helpers ──

  const addFooter = () => {
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...C.textLight);
    doc.text(`Page ${page}`, pw / 2, ph - 8, { align: "center" });
  };

  const checkPage = (needed: number) => {
    if (y + needed > ph - 18) {
      addFooter();
      doc.addPage();
      page++;
      y = 16;
    }
  };

  const section = (
    label: string,
    content: string,
    bg: RGB,
    accent: RGB
  ) => {
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(content, cw - 18);
    const lineH = 4;
    const h = 8 + lines.length * lineH + 4;
    checkPage(h + 3);

    // Background
    doc.setFillColor(...bg);
    doc.roundedRect(mx, y, cw, h, 2, 2, "F");

    // Left accent bar
    doc.setFillColor(...accent);
    doc.rect(mx, y + 3, 2.5, h - 6, "F");

    // Label
    doc.setTextColor(...accent);
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "bold");
    doc.text(label.toUpperCase(), mx + 7, y + 5.5);

    // Content
    doc.setTextColor(...C.textMed);
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.text(lines, mx + 7, y + 10.5);

    y += h + 2.5;
  };

  // ── HEADER BANNER ──────────────────────────────────────
  doc.setFillColor(...C.navy);
  doc.rect(0, 0, pw, 50, "F");

  // Top accent stripe
  doc.setFillColor(...C.indigo);
  doc.rect(0, 0, pw, 2.5, "F");

  // Title
  doc.setTextColor(...C.white);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Interview Feedback Report", mx, 22);

  // Date
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...C.textLight);
  const dateStr = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  doc.text(dateStr, mx, 30);

  // Overall rating circle
  const rn = parseFloat(overallRating);
  const rc = ratingColor(rn);
  const circleX = pw - mx - 16;
  const circleY = 25;

  doc.setFillColor(...rc);
  doc.circle(circleX, circleY, 13, "F");

  doc.setTextColor(...C.white);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(overallRating, circleX, circleY + 1.5, { align: "center" });

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text("out of 5", circleX, circleY + 7, { align: "center" });

  y = 56;

  // ── STATS BAR ──────────────────────────────────────────
  doc.setFillColor(...C.slateBg);
  doc.setDrawColor(...C.slateTrack);
  doc.roundedRect(mx, y, cw, 16, 2, 2, "FD");

  const answered = answers.filter((a) => a.userAns?.trim()).length;
  const cols = [mx + 14, mx + cw / 3 + 6, mx + (cw * 2) / 3];
  const labY = y + 5.5;
  const valY = y + 11.5;

  doc.setFontSize(6.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C.textLight);
  (["QUESTIONS", "ANSWERED", "AVG RATING"] as const).forEach((l, i) =>
    doc.text(l, cols[i], labY)
  );

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C.textDark);
  doc.text(`${answers.length}`, cols[0], valY);
  doc.text(`${answered}/${answers.length}`, cols[1], valY);
  doc.setTextColor(...rc);
  doc.text(overallRating, cols[2], valY);

  y += 24;

  // ── QUESTIONS ──────────────────────────────────────────
  answers.forEach((answer, idx) => {
    checkPage(45);

    const rating = parseFloat(answer.rating || "0");
    const enhanced = tryParse(answer.feedback);
    const qRc = ratingColor(rating);

    // Question number badge
    doc.setFillColor(...C.indigo);
    doc.circle(mx + 4.5, y + 4.5, 4.5, "F");
    doc.setTextColor(...C.white);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text(`${idx + 1}`, mx + 4.5, y + 5.8, { align: "center" });

    // Question text
    doc.setTextColor(...C.textDark);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    const qLines = doc.splitTextToSize(answer.question, cw - 38);
    doc.text(qLines, mx + 13, y + 3.5);

    // Rating badge
    const badgeW = 16;
    const badgeX = pw - mx - badgeW;
    doc.setFillColor(...qRc);
    doc.roundedRect(badgeX, y - 0.5, badgeW, 9, 2, 2, "F");
    doc.setTextColor(...C.white);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text(`${answer.rating || "0"}/5`, badgeX + badgeW / 2, y + 5, {
      align: "center",
    });

    y += qLines.length * 5 + 7;

    // Competency bars
    if (enhanced?.competencies) {
      checkPage(28);

      doc.setFillColor(...C.slateBg);
      doc.roundedRect(mx, y, cw, 26, 2, 2, "F");

      const comps = [
        ["Technical", enhanced.competencies.technicalKnowledge],
        ["Communication", enhanced.competencies.communicationClarity],
        ["Problem Solving", enhanced.competencies.problemSolving],
        ["Relevance", enhanced.competencies.relevance],
      ] as const;

      const barStartX = mx + 30;
      const barWidth = cw - 48;
      let barY = y + 4;

      comps.forEach(([label, score]) => {
        doc.setTextColor(...C.textMed);
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.text(label, mx + 4, barY + 2.5);

        // Track
        doc.setFillColor(...C.slateTrack);
        doc.roundedRect(barStartX, barY, barWidth, 3.5, 1.5, 1.5, "F");

        // Fill
        const barColor = ratingColor(score);
        doc.setFillColor(...barColor);
        const fillW = Math.max(2, (score / 5) * barWidth);
        doc.roundedRect(barStartX, barY, fillW, 3.5, 1.5, 1.5, "F");

        // Score label
        doc.setTextColor(...C.textMed);
        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        doc.text(`${score}/5`, pw - mx - 4, barY + 2.5, { align: "right" });

        barY += 5.5;
      });

      y += 28;
    }

    // Colored sections
    if (enhanced?.strengths) {
      section("Strengths", enhanced.strengths, C.emeraldBg, C.emerald);
    }
    if (enhanced?.improvements) {
      section(
        "Areas to Improve",
        enhanced.improvements,
        C.amberBg,
        C.amber
      );
    }

    section(
      "Your Answer",
      answer.userAns || "No answer recorded",
      C.redBg,
      C.red
    );

    const suggested = enhanced?.suggestedAnswer || answer.correctAns;
    if (suggested) {
      section(
        enhanced?.suggestedAnswer ? "Suggested Answer" : "Ideal Answer",
        suggested,
        C.blueBg,
        C.blue
      );
    }

    if (!enhanced && answer.feedback) {
      section("Feedback", answer.feedback, C.blueBg, C.blue);
    }

    // Divider between questions
    if (idx < answers.length - 1) {
      y += 3;
      checkPage(6);
      doc.setDrawColor(...C.slateTrack);
      doc.setLineWidth(0.3);
      doc.line(mx + 20, y, pw - mx - 20, y);
      doc.setLineWidth(0.2);
      y += 6;
    }
  });

  addFooter();
  doc.save("interview-feedback.pdf");
}
