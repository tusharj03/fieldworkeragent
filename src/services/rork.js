/**
 * Service for interacting with Rork AI.
 */
export const RorkService = {
  /**
   * Analyzes the transcript to generate a structured report.
   * @param {string} transcript - The text transcript from voice recognition.
   * @param {string} mode - 'EMS' or 'FIRE'.
   * @returns {Promise<object>} - The structured analysis result.
   */
  async analyzeTranscript(transcript, mode = 'EMS', template = null) {
    let systemPrompt;

    if (mode === 'FIRE') {
      systemPrompt = `You are an expert Fire/Rescue reporting assistant using the NERIS (National Emergency Response Information System) standard.
      Your job is to listen to the firefighter's transcript and extract technical data for incident reporting.
      ${template ? `Focus specifically on the "${template.title}" workflow: ${template.description}` : ''}
      
      Return a JSON object with this EXACT structure:
      {
        "summary": "Executive summary of incident (Arrival conditions, Actions, Outcome)",
        "category": "Structure Fire | Wildland | Hazmat | MVA | Rescue | Alarm",
        "urgency": "High | Medium | Low",
        "scene_info": {
            "type": "e.g., Residential, Commercial, Mixed Use",
            "building": "e.g., 2-story wood frame, 5-story brick",
            "smoke_conditions": "Description of smoke color/volume/velocity",
            "flame_conditions": "Description of visible fire location/extent",
            "exposures": "Any threatened structures (Side A, B, C, D)"
        },
        "timeline": [
            { "time": "HH:MM", "event": "Brief description" } 
        ],
        "actions_taken": [
            "List specific NERIS Primary and Additional Actions (e.g., 'Fire Control', 'Search & Rescue', 'Ventilation')"
        ],
        "neris_data": {
            "incident_type": "Likely NERIS incident type code/description",
            "property_use": "Likely NERIS property use code/description",
            "entities_involved": ["List people/agencies involved"],
            "stabilization_status": "Controlled | Uncontrolled | Under Investigation"
        },
        "hazards": [
             "List safety hazards (e.g., 'Collapse risk', 'Live wires', 'Flashover potential')"
        ],
        "action_items": ["Follow-up items for investigator or safety officer"]
      }

      Use 'N/A' for missing fields. Infer times if relative times are given (assume start is now - duration).
      `;
    } else {
      // EMS PROMPT
      systemPrompt = `You are an expert EMS field assistant. 
      Your job is to listen to the transcript and extract key information to fill out a ePCR / patient care report.
      ${template ? `Focus specifically on the "${template.title}" workflow: ${template.description}` : ''}
      
      Return a JSON object with the following structure:
      {
        "summary": "Brief summary of the situation",
        "category": "Medical | Trauma | Cardiac | Respiratory | Neuro | Other",
        "urgency": "Low | Medium | High",
        "patient_info": {
            "name": "Name or 'Unknown'",
            "age": "e.g., 'Mid-60s'",
            "sex": "Female | Male",
            "mental_status": "e.g., 'Alert and oriented x3'"
        },
        "chief_complaint": {
            "primary": "Main symptom",
            "secondary": "Associated symptoms"
        },
        "vitals_timeline": [
            {"time": "HH:MM", "bp": "120/80", "hr": "80", "rr": "16", "spo2": "98%", "o2": "Room air"}
        ],
        "interventions_timeline": [
            {"time": "HH:MM", "intervention": "e.g. IV Access", "dose": "e.g. 18g Left AC"}
        ],
        "assessment": {
            "general": "General impression...",
            "cardiac": "Heart sounds, rhythm...",
            "respiratory": "Lung sounds, work of breathing...",
            "neuro": "GCS, stroke scale..."
        },
        "opqrst": [
            {"field": "Onset", "extracted": "...", "status": "ok|warning"},
            {"field": "Provocation", "extracted": "...", "status": "ok|warning"},
            {"field": "Quality", "extracted": "...", "status": "ok|warning"},
            {"field": "Radiation", "extracted": "...", "status": "ok|warning"},
            {"field": "Severity", "extracted": "0-10", "status": "ok|warning"},
            {"field": "Time", "extracted": "...", "status": "ok|warning"}
        ],
        "action_items": ["List of follow-up actions needed"],
        "qa_flags": ["List of quality assurance flags or protocol deviations"],
        "billing_codes": {
             "icd10": "Suspected code",
             "cpt": "Service codes"
        }
      }
      
      If the transcript is empty or unclear, return a polite error message in the summary.`;
    }

    const requestBody = {
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            { type: 'text', text: `Analyze this transcript:\n\n"${transcript}"` }
          ]
        }
      ]
    };

    try {
      const response = await fetch('https://toolkit.rork.com/text/llm/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`AI request failed: ${response.status}`);
      }

      const data = await response.json();
      return this.parseAIResponse(data.completion);
    } catch (error) {
      console.error('Rork AI Error:', error);
      throw error;
    }
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
        urgency: "Low",
        action_items: []
      };
    }
  }
};
