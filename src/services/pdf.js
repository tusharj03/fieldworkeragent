import { jsPDF } from "jspdf";

export const PdfService = {
    generateReport(report, transcript) {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 20;
        let yPos = 20;

        const isFireMode = report.mode === 'FIRE' || report.neris_data;
        const primaryColor = isFireMode ? [185, 28, 28] : [234, 88, 12]; // Darker Red (Red-700) vs Orange-600
        const accentColor = isFireMode ? [254, 226, 226] : [255, 237, 213]; // Red-100 vs Orange-100
        const slateColor = [51, 65, 85]; // Slate-700
        const lightSlate = [100, 116, 139]; // Slate-500

        // --- DRAWING HELPERS ---

        const drawHeader = () => {
            // Top Accent Bar
            doc.setFillColor(...primaryColor);
            doc.rect(0, 0, pageWidth, 5, 'F');

            // Logo Placeholder
            doc.setFillColor(240, 240, 240);
            doc.circle(28, 28, 12, 'F');
            doc.setFontSize(16);
            doc.setTextColor(...primaryColor);
            doc.setFont("helvetica", "bold");
            doc.text("B", 26, 30); // Pseudo logo

            // Company Name
            doc.setFontSize(12);
            doc.setTextColor(30, 41, 59);
            doc.text("BEACON SYSTEMS", 45, 24);
            doc.setFontSize(8);
            doc.setTextColor(...lightSlate);
            doc.text("INTELLIGENT FIELD REPORTING", 45, 29);

            // Report Title Box
            doc.setFillColor(...accentColor);
            doc.roundedRect(pageWidth - 90, 15, 70, 20, 2, 2, 'F');
            doc.setFontSize(14);
            doc.setTextColor(...primaryColor);
            doc.setFont("helvetica", "bold");
            doc.text(isFireMode ? "FIRE INCIDENT" : "CLINICAL REPORT", pageWidth - 85, 26);
            doc.setFontSize(8);
            doc.setTextColor(...lightSlate);
            doc.text("OFFICIAL RECORD", pageWidth - 85, 31);
        };

        const drawFooter = (pageNo, totalPages) => {
            doc.setDrawColor(200, 200, 200);
            doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);

            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text("CONFIDENTIAL - PROTECTED HEALTH/INCIDENT INFORMATION", margin, pageHeight - 10);
            doc.text(`Page ${pageNo} of ${totalPages}`, pageWidth - margin - 20, pageHeight - 10);
        };

        const addSectionTitle = (title) => {
            if (yPos > pageHeight - 40) {
                doc.addPage();
                drawHeader();
                yPos = 50;
            }
            // Section Header Style
            doc.setFillColor(...slateColor);
            doc.rect(margin, yPos, 4, 18, 'F'); // Vertical accent bar

            doc.setFontSize(14);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(...slateColor);
            doc.text(title.toUpperCase(), margin + 8, yPos + 12);

            // Subtle underline
            doc.setDrawColor(230, 230, 230);
            doc.line(margin, yPos + 22, pageWidth - margin, yPos + 22);

            yPos += 28;
        };

        const drawField = (label, value, x, y, width = 80) => {
            doc.setFontSize(8);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(...lightSlate);
            doc.text(label.toUpperCase(), x, y);

            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(15, 23, 42); // Slate-900

            const valueStr = value !== null && value !== undefined ? String(value) : '-';
            const splitValue = doc.splitTextToSize(valueStr, width);
            doc.text(splitValue, x, y + 5);
            return (splitValue.length * 5) + 5; // Return height used
        };

        const drawTable = (headers, data, colWidths) => {
            if (!data || data.length === 0) return;
            if (yPos > pageHeight - 50) {
                doc.addPage();
                drawHeader();
                yPos = 50;
            }

            // Table Header
            doc.setFillColor(...slateColor);
            doc.roundedRect(margin, yPos, pageWidth - (margin * 2), 10, 1, 1, 'F');

            doc.setFontSize(9);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(255, 255, 255);

            let currentX = margin + 4;
            headers.forEach((h, i) => {
                doc.text(h, currentX, yPos + 6.5);
                currentX += colWidths[i];
            });
            yPos += 14;

            // Table Body
            data.forEach((row, idx) => {
                if (yPos > pageHeight - 20) {
                    doc.addPage();
                    drawHeader();
                    yPos = 50;
                }

                // Row Background
                if (idx % 2 === 0) {
                    doc.setFillColor(248, 250, 252);
                    doc.rect(margin, yPos - 3, pageWidth - (margin * 2), 10, 'F');
                }

                // Border lines
                doc.setDrawColor(241, 245, 249);
                doc.line(margin, yPos + 7, pageWidth - margin, yPos + 7);

                currentX = margin + 4;
                doc.setFontSize(9);
                doc.setFont("helvetica", "normal");
                doc.setTextColor(51, 65, 85);

                headers.forEach((_, i) => {
                    const cellVal = row[i] ? String(row[i]).substring(0, 45) : '-';
                    doc.text(cellVal, currentX, yPos + 3);
                    currentX += colWidths[i];
                });
                yPos += 10;
            });
            yPos += 12;
        };

        // --- DOCUMENT GENERATION ---

        // Page 1
        drawHeader();
        yPos = 55;

        // Metadata Grid
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(margin, yPos, pageWidth - (margin * 2), 25, 2, 2, 'F');
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(margin, yPos, pageWidth - (margin * 2), 25, 2, 2, 'S');

        drawField("Incident ID", `#${report.id || 'N/A'}`, margin + 10, yPos + 8);
        drawField("Date & Time", new Date(report.timestamp).toLocaleString(), margin + 60, yPos + 8);
        drawField("Category", report.category || 'General', margin + 120, yPos + 8);
        drawField("Urgency", report.urgency || 'Normal', margin + 10, yPos + 18);

        yPos += 40;

        // Executive Summary
        addSectionTitle("Executive Summary");
        doc.setFontSize(10);
        doc.setTextColor(30, 41, 59);
        const summaryText = doc.splitTextToSize(report.summary || 'Content unavailable.', pageWidth - (margin * 2) - 10);

        // Quote-like vertical bar for summary
        doc.setDrawColor(...primaryColor);
        doc.setLineWidth(1);
        doc.line(margin + 4, yPos, margin + 4, yPos + (summaryText.length * 5));
        doc.text(summaryText, margin + 10, yPos);
        yPos += (summaryText.length * 5) + 15;

        // --- SPECIFIC SECTIONS ---

        // NERIS Info
        if (isFireMode && report.neris_data) {
            addSectionTitle("NERIS Classification Data");
            const boxHeight = 35;
            doc.setFillColor(250, 250, 250);
            doc.rect(margin, yPos, pageWidth - (margin * 2), boxHeight, 'F');

            let localY = yPos + 8;
            drawField("Incident Type", report.neris_data.incident_type, margin + 5, localY, 80);
            drawField("Stabilization", report.neris_data.stabilization_status, margin + 100, localY, 80);
            localY += 15;
            drawField("Property Use", report.neris_data.property_use, margin + 5, localY, 80);

            yPos += boxHeight + 15;
        }

        // Scene/Patient
        if (isFireMode && report.scene_info) {
            addSectionTitle("Scene Information");
            const startY = yPos;
            drawField("Building Type", report.scene_info.building, margin, yPos);
            drawField("Construction", report.scene_info.type, margin + 65, yPos);
            drawField("Exposures", report.scene_info.exposures, margin + 130, yPos);
            yPos += 12;
            drawField("Smoke Conditions", report.scene_info.smoke_conditions, margin, yPos, 180);
            yPos += 12;
            drawField("Fire Conditions", report.scene_info.flame_conditions, margin, yPos, 180);
            yPos += 20;
        } else if (report.patient_info) {
            addSectionTitle("Patient Demographics");
            doc.setFillColor(255, 247, 237);
            doc.roundedRect(margin, yPos, pageWidth - (margin * 2), 20, 1, 1, 'F');

            drawField("Patient", report.patient_info.name || 'Unknown', margin + 5, yPos + 6);
            drawField("Age / Sex", `${report.patient_info.age || '?'} / ${report.patient_info.sex || '?'}`, margin + 60, yPos + 6);
            drawField("Mental Status", report.patient_info.mental_status, margin + 120, yPos + 6);
            yPos += 30;
        }

        // Tables
        if (isFireMode && report.timeline) {
            addSectionTitle("Incident Timeline");
            const data = report.timeline.map(t => [t.time, t.event]);
            drawTable(["TIME", "EVENT DESCRIPTION"], data, [30, 130]);
        }

        if (!isFireMode && report.vitals_timeline) {
            addSectionTitle("Vitals Flowsheet");
            const data = report.vitals_timeline.map(v => [
                v.time || '-', v.bp || '-', v.hr || '-', v.rr || '-', v.spo2 || '-', v.o2 || '-'
            ]);
            drawTable(
                ["TIME", "BP (mmHg)", "HR (bpm)", "RR", "SpO2 %", "O2 THERAPY"],
                data,
                [25, 30, 25, 20, 25, 45]
            );
        }

        // Hazards
        if (report.hazards && report.hazards.length > 0) {
            addSectionTitle("Safety Hazards");
            report.hazards.forEach(h => {
                doc.setFillColor(...primaryColor); // Red/Orange background
                doc.setTextColor(255, 255, 255);
                doc.setFontSize(8);
                doc.setFont("helvetica", "bold");
                doc.roundedRect(margin, yPos - 4, 18, 6, 1, 1, 'F');
                doc.text("HAZARD", margin + 2, yPos);

                doc.setTextColor(60, 60, 60);
                doc.setFontSize(10);
                doc.setFont("helvetica", "normal");
                doc.text(h, margin + 22, yPos);
                yPos += 10;
            });
            yPos += 10;
        }

        // Action Items (Checkbox style)
        if (report.action_items && report.action_items.length > 0) {
            addSectionTitle("Action Items");
            report.action_items.forEach(item => {
                doc.setDrawColor(100, 100, 100);
                doc.rect(margin, yPos - 3.5, 4, 4); // Checkbox
                doc.setFontSize(10);
                doc.setTextColor(0);
                doc.text(item, margin + 10, yPos);
                yPos += 8;
            });
        }

        // Apply Footer to all pages
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            drawFooter(i, pageCount);
        }

        doc.save(`Beacon_Report_${report.id}.pdf`);
    }
};
