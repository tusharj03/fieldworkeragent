import { jsPDF } from "jspdf";
import "jspdf-autotable";

export const PdfService = {
    generateReport(report, transcript) {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 15;
        let yPos = 20;

        const isFireMode = report.mode === 'FIRE' || report.neris_mapping;

        // Color Palette
        const colors = {
            primary: isFireMode ? [220, 38, 38] : [16, 185, 129], // Red-600 or Emerald-500
            secondary: [71, 85, 105], // Slate-600
            accent: isFireMode ? [254, 242, 242] : [236, 253, 245], // Red-50 or Emerald-50
            text: [30, 41, 59], // Slate-800
            lightText: [100, 116, 139], // Slate-500
            white: [255, 255, 255],
            border: [226, 232, 240] // Slate-200
        };

        // Helper: Draw Header
        const drawHeader = () => {
            // Top colored bar
            doc.setFillColor(...colors.primary);
            doc.rect(0, 0, pageWidth, 6, 'F');

            // Logo/Title area
            doc.setFontSize(24);
            doc.setTextColor(...colors.primary);
            doc.setFont("helvetica", "bold");
            doc.text(isFireMode ? "FIRE INCIDENT REPORT" : "EMS PATIENT CARE REPORT", margin, 25);

            // Meta info (right aligned)
            doc.setFontSize(10);
            doc.setTextColor(...colors.secondary);
            doc.setFont("helvetica", "normal");

            const dateStr = new Date().toLocaleDateString() + " " + new Date().toLocaleTimeString();
            const rightMargin = pageWidth - margin;

            doc.text(`Generated: ${dateStr}`, rightMargin, 20, { align: "right" });
            doc.text(`Reference ID: #${report.id || 'N/A'}`, rightMargin, 25, { align: "right" });

            yPos = 35;
        };

        // Helper: Draw Section Title
        const drawSectionTitle = (title) => {
            // Check for page break
            if (yPos > pageHeight - 30) {
                doc.addPage();
                yPos = 20;
            }

            doc.setFillColor(...colors.accent);
            doc.rect(margin, yPos, pageWidth - (margin * 2), 8, 'F');

            doc.setFontSize(11);
            doc.setTextColor(...colors.primary);
            doc.setFont("helvetica", "bold");
            doc.text(title.toUpperCase(), margin + 3, yPos + 5.5);

            yPos += 14; // Space after title
        };

        // Helper: Key-Value Grid
        const drawKeyValueGrid = (data, startY) => {
            const keys = Object.keys(data);
            if (keys.length === 0) return startY;

            const colWidth = (pageWidth - (margin * 2)) / 2;
            let currentY = startY;

            doc.setFontSize(10);

            keys.forEach((key, index) => {
                const x = margin + ((index % 2) * colWidth);
                if (index > 0 && index % 2 === 0) currentY += 10;

                // Label
                doc.setFont("helvetica", "bold");
                doc.setTextColor(...colors.lightText);
                doc.text(key.toUpperCase(), x, currentY);

                // Value
                doc.setFont("helvetica", "normal");
                doc.setTextColor(...colors.text);
                const value = String(data[key] || "N/A");
                doc.text(value, x, currentY + 5);
            });

            return currentY + 15;
        };

        // --- START GENERATION ---
        drawHeader();

        // 1. INCIDENT OVERVIEW (Grid)
        doc.setLineWidth(0.5);
        doc.setDrawColor(...colors.border);
        doc.rect(margin, yPos, pageWidth - (margin * 2), 25); // Box container

        // Inner layout for Overview
        let overviewY = yPos + 6;
        doc.setFontSize(9);
        doc.setTextColor(...colors.lightText);
        doc.text("INCIDENT CATEGORY", margin + 5, overviewY);
        doc.text("URGENCY LEVEL", margin + 60, overviewY);
        doc.text("LOCATION (Approx)", margin + 120, overviewY); // Placeholder if we had it

        overviewY += 6;
        doc.setFontSize(12);
        doc.setTextColor(...colors.text);
        doc.setFont("helvetica", "bold");
        doc.text(report.category || "General", margin + 5, overviewY);

        // Urgency Badge-ish text
        doc.setTextColor(...(report.urgency === 'High' ? [220, 38, 38] : [30, 41, 59]));
        doc.text(report.urgency || "Normal", margin + 60, overviewY);

        doc.setTextColor(...colors.text);
        doc.text("Unknown Location", margin + 120, overviewY);

        yPos += 35;

        // 2. EXECUTIVE SUMMARY
        drawSectionTitle("Executive Summary");
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(...colors.text);

        const summaryLines = doc.splitTextToSize(report.summary || "No summary available.", pageWidth - (margin * 2));
        doc.text(summaryLines, margin, yPos);
        yPos += (summaryLines.length * 5) + 10;

        // 3. SCENE INFO / PATIENT INFO (Conditional)
        if (isFireMode && report.scene_info) {
            drawSectionTitle("Scene & Structure Information");

            const sceneData = {
                "Type": report.scene_info.type,
                "Building Construction": report.scene_info.building,
                "Smoke Conditions": report.scene_info.smoke_conditions,
                "Flame Conditions": report.scene_info.flame_conditions,
                "Exposures": report.scene_info.exposures
            };
            yPos = drawKeyValueGrid(sceneData, yPos);
        }
        else if (!isFireMode && report.patient_info) {
            drawSectionTitle("Patient Information");
            const patientData = {
                "Patient Name": report.patient_info.name,
                "Age": report.patient_info.age,
                "Sex": report.patient_info.sex,
                "Mental Status": report.patient_info.mental_status
            };
            yPos = drawKeyValueGrid(patientData, yPos);
        }

        // 4. NERIS / BILLING CODES
        if (isFireMode && report.neris_mapping) {
            drawSectionTitle("NERIS Coding Classification");

            // Draw distinct boxes for the 3 main codes
            const boxWidth = (pageWidth - (margin * 2) - 10) / 3;
            const boxHeight = 25;
            let boxX = margin;

            const codes = [
                { label: "Incident Type", value: report.neris_mapping.incident_type },
                { label: "Property Use", value: report.neris_mapping.property_use },
                { label: "Cause / Ignition", value: report.neris_mapping.cause }
            ];

            codes.forEach((code) => {
                // Background
                doc.setFillColor(248, 250, 252); // Slate-50
                doc.setDrawColor(...colors.border);
                doc.roundedRect(boxX, yPos, boxWidth, boxHeight, 2, 2, 'FD');

                // Label
                doc.setFontSize(8);
                doc.setTextColor(...colors.lightText);
                doc.setFont("helvetica", "bold");
                doc.text(code.label.toUpperCase(), boxX + 3, yPos + 6);

                // Value
                doc.setFontSize(10);
                doc.setTextColor(...colors.primary);
                const valueLines = doc.splitTextToSize(code.value || "N/A", boxWidth - 6);
                doc.text(valueLines, boxX + 3, yPos + 12);

                boxX += boxWidth + 5;
            });

            yPos += boxHeight + 15;
        }

        // 5. ACTIONS & SUB-TABLES (using autoTable)

        // FIRE ACTIONS
        if (isFireMode && report.actions_taken && report.actions_taken.length > 0) {
            doc.autoTable({
                startY: yPos,
                head: [['Actions Taken (NERIS)']],
                body: report.actions_taken.map(a => [a]),
                theme: 'striped',
                headStyles: { fillColor: colors.primary, textColor: 255, fontStyle: 'bold' },
                margin: { left: margin, right: margin }
            });
            yPos = doc.lastAutoTable.finalY + 10;
        }

        // EMS / FIRE TIMELINE
        const timelineData = isFireMode ? report.timeline : report.vitals_timeline;
        if (timelineData && timelineData.length > 0) {
            // Headers differ by mode
            const headers = isFireMode
                ? [['Time', 'Event/Description']]
                : [['Time', 'BP', 'HR', 'RR', 'SpO2', 'O2']];

            const body = isFireMode
                ? timelineData.map(t => [t.time, t.event])
                : timelineData.map(v => [v.time, v.bp, v.hr, v.rr, v.spo2, v.o2]);

            doc.setFontSize(14);
            doc.setTextColor(...colors.text);
            doc.text(isFireMode ? "Incident Timeline" : "Vitals Log", margin, yPos);
            yPos += 5;

            doc.autoTable({
                startY: yPos,
                head: headers,
                body: body,
                theme: 'grid',
                headStyles: { fillColor: colors.secondary, textColor: 255 },
                styles: { fontSize: 9 },
                margin: { left: margin, right: margin }
            });
            yPos = doc.lastAutoTable.finalY + 15;
        }

        // HAZARDS (Fire) or ACTION ITEMS (Both)
        const hazards = report.hazards || [];
        const actions = report.action_items || [];
        const combinedLists = [];

        if (hazards.length > 0) combinedLists.push({ title: "Hazards", items: hazards, color: [220, 38, 38] }); // Red text
        if (actions.length > 0) combinedLists.push({ title: "Action Items", items: actions, color: [0, 0, 0] });

        if (combinedLists.length > 0) {
            // Simple list custom drawing
            if (yPos > pageHeight - 40) doc.addPage();

            combinedLists.forEach(list => {
                doc.setFontSize(12);
                doc.setTextColor(...colors.text);
                doc.setFont("helvetica", "bold");
                doc.text(list.title, margin, yPos);
                yPos += 5;

                doc.setFontSize(10);
                doc.setFont("helvetica", "normal");
                list.items.forEach(item => {
                    doc.setTextColor(...list.color);
                    doc.text(`• ${item}`, margin + 5, yPos);
                    yPos += 6;
                });
                yPos += 10;
            });
        }

        // TRANSCRIPT ATTACHMENT PAGE
        if (transcript) {
            doc.addPage();
            doc.setFillColor(...colors.secondary);
            doc.rect(0, 0, pageWidth, 20, 'F');
            doc.setFontSize(16);
            doc.setTextColor(255, 255, 255);
            doc.text("Original Transcript Analysis", margin, 13);

            yPos = 30;
            doc.setFontSize(9);
            doc.setTextColor(...colors.lightText);
            doc.setFont("courier", "normal");

            const lines = doc.splitTextToSize(transcript, pageWidth - (margin * 2));
            doc.text(lines, margin, yPos);
        }

        // Save
        doc.save(`field-report-${report.id || Date.now()}.pdf`);
    }
};
