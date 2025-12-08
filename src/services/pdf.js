import { jsPDF } from "jspdf";

export const PdfService = {
    generateReport(report, transcript) {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 20;
        let yPos = 20;

        const isFireMode = report.mode === 'FIRE' || report.nfirs_mapping;
        const primaryColor = isFireMode ? [220, 38, 38] : [249, 115, 22]; // Red vs Orange

        // Title
        doc.setFontSize(22);
        doc.setTextColor(...primaryColor);
        doc.text(isFireMode ? "Fire Incident Report" : "Field Agent Report", margin, yPos);
        yPos += 15;

        // Meta Info
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Date: ${new Date().toLocaleString()}`, margin, yPos);
        yPos += 6;
        doc.text(`ID: #${report.id || 'N/A'}`, margin, yPos);
        yPos += 6;
        doc.text(`Category: ${report.category || 'General'}`, margin, yPos);
        yPos += 6;
        doc.text(`Urgency: ${report.urgency || 'Normal'}`, margin, yPos);
        yPos += 15;

        // Summary
        doc.setFontSize(14);
        doc.setTextColor(0);
        doc.text("Executive Summary", margin, yPos);
        yPos += 8;
        doc.setFontSize(11);
        const summaryLines = doc.splitTextToSize(report.summary || '', pageWidth - (margin * 2));
        doc.text(summaryLines, margin, yPos);
        yPos += (summaryLines.length * 7) + 10;

        // FIRE: Scene Info
        if (isFireMode && report.scene_info) {
            doc.setFontSize(14);
            doc.text("Scene Information", margin, yPos);
            yPos += 8;
            doc.setFontSize(10);
            const info = [
                `Type: ${report.scene_info.type}`,
                `Building: ${report.scene_info.building}`,
                `Smoke: ${report.scene_info.smoke_conditions}`,
                `Flames: ${report.scene_info.flame_conditions}`,
                `Exposures: ${report.scene_info.exposures}`
            ];
            info.forEach(line => {
                doc.text(`• ${line}`, margin, yPos);
                yPos += 6;
            });
            yPos += 10;
        }

        // FIRE: Timeline
        if (isFireMode && report.timeline) {
            doc.setFontSize(14);
            doc.text("Fireground Timeline", margin, yPos);
            yPos += 8;
            doc.setFontSize(10);
            report.timeline.forEach(event => {
                doc.setTextColor(...primaryColor);
                doc.text(event.time, margin, yPos);
                doc.setTextColor(0);
                doc.text(event.event, margin + 20, yPos);
                yPos += 6;
            });
            yPos += 10;
        }

        // FIRE: Actions
        if (isFireMode && report.actions_taken) {
            doc.setFontSize(14);
            doc.text("Actions Taken", margin, yPos);
            yPos += 8;
            doc.setFontSize(10);
            report.actions_taken.forEach(action => {
                doc.text(`• ${action}`, margin, yPos);
                yPos += 6;
            });
            yPos += 10;
        }

        // FIRE: Hazards
        if (isFireMode && report.hazards) {
            doc.setFontSize(14);
            doc.setTextColor(220, 38, 38);
            doc.text("Identified Hazards", margin, yPos);
            doc.setTextColor(0);
            yPos += 8;
            doc.setFontSize(10);
            report.hazards.forEach(hazard => {
                doc.text(`[HAZARD] ${hazard}`, margin, yPos);
                yPos += 6;
            });
            yPos += 10;
        }

        // FIRE: NFIRS
        if (isFireMode && report.nfirs_mapping) {
            doc.setFontSize(14);
            doc.text("NFIRS Coding", margin, yPos);
            yPos += 8;
            doc.setFontSize(10);
            doc.text(`Incident Type: ${report.nfirs_mapping.incident_type}`, margin, yPos); yPos += 6;
            doc.text(`Property Use: ${report.nfirs_mapping.property_use}`, margin, yPos); yPos += 6;
            doc.text(`Cause: ${report.nfirs_mapping.cause}`, margin, yPos); yPos += 6;
            yPos += 10;
        }

        // EMS Sections (if applicable and NOT clean fire mode, usually mutually exclusive but good to be safe)
        if (!isFireMode && report.vitals_timeline) {
            doc.setFontSize(14);
            doc.text("Vitals Log", margin, yPos);
            yPos += 8;
            doc.setFontSize(10);
            // Simple table dump
            report.vitals_timeline.forEach(row => {
                doc.text(`${row.time} | BP: ${row.bp} | HR: ${row.hr} | SPO2: ${row.spo2}`, margin, yPos);
                yPos += 6;
            });
            yPos += 10;
        }

        // Action Items (Shared)
        if (report.action_items && report.action_items.length > 0) {
            doc.setFontSize(14);
            doc.text("Follow-up Action Items", margin, yPos);
            yPos += 8;
            doc.setFontSize(11);
            report.action_items.forEach(item => {
                doc.text(`[ ] ${item}`, margin, yPos);
                yPos += 7;
            });
            yPos += 10;
        }

        // Transcript (New Page)
        if (transcript) {
            doc.addPage();
            yPos = 20;
            doc.setFontSize(14);
            doc.text("Original Transcript", margin, yPos);
            yPos += 10;
            doc.setFontSize(10);
            doc.setTextColor(100);
            const transcriptLines = doc.splitTextToSize(transcript, pageWidth - (margin * 2));
            doc.text(transcriptLines, margin, yPos);
        }

        doc.save(`report-${report.mode || 'ems'}-${Date.now()}.pdf`);
    }
};
