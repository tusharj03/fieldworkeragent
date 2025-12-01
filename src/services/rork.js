/**
 * Service for interacting with Rork AI.
 */
export const RorkService = {
  /**
   * Analyzes the transcript to generate a structured report.
   * @param {string} transcript - The text transcript from voice recognition.
   * @returns {Promise<object>} - The structured analysis result.
   */
  async analyzeTranscript(transcript, context = null) {
    // Rork API doesn't require a key in the user's example, but we'll keep the slot open if needed later.
    // const apiKey = localStorage.getItem('GEMINI_API_KEY'); 

    try {
      let systemPrompt = `You are an expert medical scribe and field assistant for EMTs. Analyze the following voice transcript from an emergency scene and extract structured data.
              
      Return ONLY valid JSON matching this structure:
      {
        "category": "String (e.g. Cardiac, Trauma)",
        "urgency": "High/Medium/Low",
        "summary": "Brief clinical summary",
        "structured_fields": {
          "Patient Info": { "Name": "...", "Age": "...", "Sex": "...", "Mental Status": "..." },
          "Chief Complaint": { "Primary": "...", "Secondary": "..." }
        },
        "vitals_timeline": [{ "time": "...", "bp": "...", "hr": "...", "rr": "...", "spo2": "...", "o2": "..." }],
        "interventions_timeline": [{ "time": "...", "intervention": "...", "dose": "..." }],
        "assessment": { "General": "...", "Cardiac": "...", "Respiratory": "...", "Neuro": "..." },
        "opqrst": [{ "field": "O (Onset)", "extracted": "...", "status": "ok/warning" }, ...],
        "sample": [{ "field": "S – Symptoms", "data": "..." }, ...],
        "mist": { "M – Mechanism": "...", "I – Injuries": "...", "S – Signs": "...", "T – Treatments": "...", "Destination": "..." },
        "narrative": "Full clinical narrative...",
        "action_items": ["...", "..."],
        "qa_qi_flags": ["...", "..."],
        "billing_codes": { "ICD-10": "...", "Procedure codes": "...", "Transport level": "..." }
      }`;

      if (context) {
        systemPrompt += `\n\nCONTEXT / TEMPLATE: ${context}\nFocus the analysis on this specific workflow/template requirements.`;
      }

      const response = await fetch('https://toolkit.rork.com/text/llm/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: systemPrompt },
            {
              role: 'user',
              content: [
                { type: 'text', text: `Transcript:\n"${transcript}"` }
              ]
            }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`Rork API Error: ${response.status}`);
      }

      const data = await response.json();
      // User's example uses data.completion
      return this.parseAIResponse(data.completion);

    } catch (error) {
      console.error("Rork AI Service Error:", error);
      return this.mockAnalyze(transcript, false, context);
    }
  },

  mockAnalyze(transcript, isMissingKey, context = null) {
    const t = transcript.toLowerCase();
    const isTrauma = t.includes("fall") || t.includes("crash") || t.includes("accident") || t.includes("bleeding") || t.includes("cut") || t.includes("hit") || t.includes("hurt");
    const isCardiac = t.includes("chest") || t.includes("heart") || t.includes("pain") || t.includes("pressure");
    const isRespiratory = t.includes("breath") || t.includes("asthma") || t.includes("wheez") || t.includes("air");
    const isStroke = t.includes("slur") || t.includes("droop") || t.includes("weak") || t.includes("numb");

    let category = "General Medical";
    let urgency = "Low";
    let summary = "Patient encounter recorded. No critical keywords detected in transcript.";

    if (isCardiac) {
      category = "Medical – Chest Pain";
      urgency = "High";
      summary = "Patient reports chest pain/tightness. Potential cardiac event. Immediate transport recommended.";
    } else if (isTrauma) {
      category = "Trauma – Injury";
      urgency = "Medium";
      summary = "Patient involved in traumatic event. Assess for fractures and bleeding.";
    } else if (isRespiratory) {
      category = "Medical – Respiratory Distress";
      urgency = "High";
      summary = "Patient experiencing difficulty breathing. Monitor SpO2 and airway.";
    } else if (isStroke) {
      category = "Medical – CVA/Stroke";
      urgency = "Critical";
      summary = "Possible stroke symptoms detected. Initiate stroke protocol immediately.";
    }

    return {
      timestamp: new Date().toISOString(),
      category: category,
      urgency: urgency,
      summary: (context ? `[Template: ${context}] ` : "") + (isMissingKey ? `${summary} (DEMO MODE - Add API Key for full analysis)` : summary),
      structured_fields: {
        "Patient Info": {
          "Name": "Unknown (Field)",
          "Age": "Adult",
          "Sex": "Unknown",
          "Mental Status": "Alert"
        },
        "Chief Complaint": {
          "Primary": category,
          "Secondary": "See narrative"
        }
      },
      vitals_timeline: [
        { time: new Date(Date.now() - 1000 * 60 * 10).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), bp: "120/80", hr: "80", rr: "16", spo2: "98%", o2: "Room air" }
      ],
      interventions_timeline: [
        { time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), intervention: "Assessment", dose: "Initial" }
      ],
      assessment: {
        "General": "Patient is alert. " + summary,
        "Cardiac": isCardiac ? "Reports chest pain." : "Regular rate and rhythm.",
        "Respiratory": isRespiratory ? "Labored breathing." : "Clear to auscultation.",
        "Neuro": isStroke ? "Possible deficits." : "Alert and oriented."
      },
      opqrst: [
        { field: "O (Onset)", extracted: "See transcript", status: "warning" },
        { field: "P (Provocation)", extracted: "Not documented", status: "warning" },
        { field: "Q (Quality)", extracted: "Not documented", status: "warning" },
        { field: "R (Radiation)", extracted: "Not documented", status: "warning" },
        { field: "S (Severity)", extracted: "Not documented", status: "warning" },
        { field: "T (Time)", extracted: "Now", status: "ok" }
      ],
      sample: [
        { field: "S – Symptoms", data: "See transcript" },
        { field: "A – Allergies", data: "Not documented ⚠️" },
        { field: "M – Medications", data: "Not documented ⚠️" },
        { field: "P – Past History", data: "Not documented ⚠️" },
        { field: "L – Last Oral Intake", data: "Not documented ⚠️" },
        { field: "E – Events Leading Up", data: "See transcript" }
      ],
      mist: {
        "M – Mechanism": "See transcript",
        "I – Injuries": isTrauma ? "Possible trauma injuries" : "None apparent",
        "S – Signs": "Stable vitals initially",
        "T – Treatments": "Monitoring",
        "Destination": "TBD"
      },
      narrative: `Unit arrived on scene. Patient found as described. \n\nTranscript Analysis:\n"${transcript}"\n\nAssessment and transport initiated.`,
      action_items: [
        "Obtain full SAMPLE history",
        "Record baseline vitals",
        "Determine transport destination"
      ],
      qa_qi_flags: [
        "Incomplete patient demographics",
        "Missing insurance info"
      ],
      billing_codes: {
        "ICD-10": "R69 (Illness, unspecified)",
        "Procedure codes": "Assessment",
        "Transport level": "BLS"
      },
      original_transcript: transcript
    };
  },

  parseAIResponse(completion) {
    try {
      let jsonString = completion.trim();
      // Handle potential markdown code blocks
      const codeBlockMatch = jsonString.match(/```(?:json)?\s*([^`]*?)\s*```/);
      if (codeBlockMatch) {
        jsonString = codeBlockMatch[1].trim();
      }
      return JSON.parse(jsonString);
    } catch (error) {
      console.error('Error parsing AI response:', error);
      return {
        summary: "Failed to parse AI response.",
        category: "Error",
        structured_fields: {},
        vitals_timeline: [],
        interventions_timeline: [],
        assessment: {},
        opqrst: [],
        sample: [],
        mist: {},
        narrative: "Error parsing response.",
        action_items: [],
        qa_qi_flags: [],
        billing_codes: {},
        urgency: "Low"
      };
    }
  }
};
