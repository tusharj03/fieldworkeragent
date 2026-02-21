/**
 * Service for interacting with Rork AI.
 */
export const RorkService = {
  /**
   * Updates the list of action items based on the current transcript.
   * @param {string} transcript - The current accumulated transcript.
   * @param {Array} currentItems - The existing list of action items.
   * @returns {Promise<Array>} - The updated list of action items.
   */
  async updateActionItems(transcript, currentItems) {
    const systemPrompt = `You are an expert Fire/Rescue AI assistant.
      Your job is to monitor a live transcript of a fire incident and update a dynamic checklist of action items.
      
      You will be given:
      1. The current list of action items (some may be completed, some pending).
      2. The latest transcript of the incident.
      
      Your goal is to:
      1. MARK COMPLETED: If the transcript indicates an item has been done, mark it as completed.
      2. ADD NEW ITEMS: based on the evolving scenario, add new critical tasks that the firefighter needs to do next.
      3. KEEP PENDING: If an item hasn't been done yet, keep it in the list.
      
      CRITICAL: The list starts EMPTY. You MUST populate it based on the context.
      Common standard items to consider adding (only if relevant to the specific call type):
      - "Water supply" (if fire/suppression needed)
      - "Fire suppression" (if working fire)
      - "Primary search" (if search needed)
      - "Secondary search" (if search needed)
      - "Ventilation" (if needed)
      - "Overhaul" (if needed)
      
      Return a JSON object with a single key "items", which is an array of objects:
      {
        "id": "unique_string_id",
        "text": "Action description",
        "isCompleted": boolean,
        "isNew": boolean (true if you just added it this turn)
      }
      
      IMPORTANT:
      - Do NOT remove completed items. Keep them but set isCompleted: true.
      - Do NOT duplicate items.
      - Be aggressive in marking items complete if the user says something like "Primary search complete" or "We have water on the fire".
      - Keep descriptions short and actionable (e.g., "Establish RIT", "Utilities Control").
      `;

    const requestBody = {
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: JSON.stringify({
            transcript: transcript,
            currentItems: currentItems
          })
        }
      ]
    };

    try {
      // Re-using the same endpoint as analyzeTranscript
      // In a real app complexity, we might want a different endpoint or a 'stream' but for now one-shot is fine
      const response = await fetch('https://toolkit.rork.com/text/llm/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`AI request failed: ${response.status}`);
      }

      const data = await response.json();
      const parsed = this.parseAIResponse(data.completion);
      return parsed.items || currentItems; // Fallback to current if parse fails
    } catch (error) {
      console.error('Rork AI Action Item Update Error:', error);
      return currentItems; // Fail gracefully by returning existing state
    }
  },

  /**
   * Analyzes the transcript to generate a structured report.
 * @param {string} transcript - The text transcript from voice recognition.
   * @param {string} mode - 'EMS' or 'FIRE'.
   * @param {object} template - Optional template.
   * @param {Array} additionalEvents - Optional array of manual events {time, description}.
   * @returns {Promise<object>} - The structured analysis result.
   */
  async analyzeTranscript(transcript, mode = 'EMS', template = null, additionalEvents = []) {
    let systemPrompt;

    if (mode === 'FIRE') {
      const eventsContext = additionalEvents.length > 0
        ? `\n\nMANUAL LOGGED EVENTS (Must be included in timeline):\n${JSON.stringify(additionalEvents, null, 2)}`
        : '';

      const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      systemPrompt = `You are an expert Fire/Rescue reporting assistant using the NERIS (National Emergency Response Information System) standard.
      Your job is to listen to the firefighter's transcript and extract technical data for incident reporting.
      Current System Time: ${currentTime}
      
      CRITICAL TIMELINE INSTRUCTION: The transcript contains embedded, invisible timestamps at natural pauses formatted like [[PAUSE 14:32:05]]. You MUST use these exact markers to determine the true, real-world time of events when building the timeline. DO NOT guess or hallucinate times. Match the event to the nearest preceding or succeeding PAUSE marker.

      ${template ? `Focus specifically on the "${template.title}" workflow: ${template.description}` : ''}
      ${eventsContext}
      
      Return a JSON object with this EXACT structure:
      {
        "summary": "Executive summary of incident (Arrival conditions, Actions, Outcome)",
        "category": "Structure Fire | Wildland | Hazmat | MVA | Rescue | Alarm",
        "urgency": "High | Medium | Low",
        "scene_info": {
            "type": "e.g., Residential, Commercial, Mixed Use (If not MVA)",
            "building": "e.g., 2-story wood frame, 5-story brick (If not MVA)",
            "smoke_conditions": "Description of smoke color/volume/velocity (If not MVA)",
            "flame_conditions": "Description of visible fire location/extent (If not MVA)",
            "exposures": "Any threatened structures (Side A, B, C, D) (If not MVA)"
        },
        "mva_info": {
            "vehicles_involved": "Number and type of vehicles, e.g. '2 vehicles (Sedan and SUV)' (If MVA)",
            "extrication": "Required? Yes/No, and details e.g. 'Driver door removed' (If MVA)",
            "traffic_conditions": "Impact on traffic, e.g. 'All lanes blocked' (If MVA)"
        },
        "timeline": [
            { "time": "HH:MM", "event": "Brief description" } 
        ],
        "actions_taken": [
            "List specific NERIS Primary and Additional Actions (e.g., 'Fire Control', 'Search & Rescue', 'Ventilation')"
        ],
        "neris_data": {
            "incident_type": "Likely NERIS incident type description (MUST NOT INCLUDE NUMBERS)",
            "property_use": "Likely NERIS property use description (MUST NOT INCLUDE NUMBERS)",
            "entities_involved": ["List people/agencies involved"],
            "stabilization_status": "Controlled | Uncontrolled | Under Investigation"
        },
        "hazards": [
             "List safety hazards (e.g., 'Collapse risk', 'Live wires', 'Flashover potential')"
        ],
        "action_items": ["Follow-up items for investigator or safety officer"],
        "notes": ["Extract ANY explicit 'notes to self', 'make a note', or specific observations the user wanted recorded verbatim"]
      }

      Use 'N/A' for missing fields. Infer times if relative times are given (assume start is now - duration).
      `;
    } else {
      // EMS PROMPT
      const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      systemPrompt = `You are an expert EMS/Paramedic reporting assistant.
        Your job is to listen to the paramedic's transcript and extract clinical data for patient care reports.
        Current System Time: ${currentTime}
        
        CRITICAL TIMELINE INSTRUCTION: The transcript contains embedded, invisible timestamps at natural pauses formatted like [[PAUSE 14:32:05]]. You MUST use these exact markers to determine the true, real-world time of interventions or status changes when building the timeline. DO NOT guess or hallucinate times. Match the event to the nearest preceding or succeeding PAUSE marker.

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
        },
        "notes": ["Extract ANY explicit 'notes to self', 'make a note', or specific observations the user wanted recorded verbatim"]
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
