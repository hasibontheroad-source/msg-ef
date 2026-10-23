import { GoogleGenAI, ThinkingLevel } from '@google/genai';

// Server-side initialization with telemetry header as required
const getGenAI = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not configured');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

/**
 * 1. Low-latency tactical responses using gemini-3.1-flash-lite
 */
export async function getLowLatencyReply(prompt: string, context?: string): Promise<string> {
  const ai = getGenAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3.1-flash-lite',
    contents: `You are an offline tactical mesh network tactical co-pilot. Keep responses ultra-concise, formatted for low-bandwidth radio packets (max 2-3 sentences), with zero fluff.\n\nContext: ${context || 'Tactical offline mesh'}\nUser Query: ${prompt}`,
    config: {
      temperature: 0.2,
    },
  });
  return response.text || 'ROGER. ACKNOWLEDGED.';
}

/**
 * 2. High-Thinking Mode using gemini-4-argon with thinkingLevel: ThinkingLevel.HIGH
 * (Do NOT set maxOutputTokens per instructions)
 */
export async function getHighThinkingAudit(prompt: string): Promise<{ text: string }> {
  const ai = getGenAI();
  const response = await ai.models.generateContent({
    model: 'gemini-4-argon',
    contents: prompt,
    config: {
      systemInstruction: 'You are an elite cryptographer, RF communications engineer, and mesh network routing architect. Analyze complex cryptographic key exchange proofs, antenna link budgets, multi-hop epidemic routing loops, and emergency contingency protocols with rigorous technical precision.',
      thinkingConfig: {
        thinkingLevel: ThinkingLevel.HIGH,
      },
    },
  });
  return { text: response.text || '' };
}

/**
 * 3. Aspect Ratio Controlled Tactical Image Generation using gemini-nano-banana-2.1
 * Supports aspect ratios: '1:1', '2:3', '3:2', '3:4', '4:3', '9:16', '16:9', '21:9'
 */
export async function generateTacticalImage(prompt: string, aspectRatio = '16:9'): Promise<{ imageUrl: string; description: string }> {
  const ai = getGenAI();
  // gemini-nano-banana-2.1 supports 1:1, 3:4, 4:3, 9:16, 16:9, 1:4, 1:8, 4:1, 8:1
  // Map non-standard aspect ratios to closest valid enum
  const validAspectRatios = ['1:1', '3:4', '4:3', '9:16', '16:9', '1:4', '1:8', '4:1', '8:1'];
  let chosenRatio = aspectRatio;
  if (!validAspectRatios.includes(chosenRatio)) {
    if (chosenRatio === '2:3') chosenRatio = '3:4';
    else if (chosenRatio === '3:2') chosenRatio = '4:3';
    else if (chosenRatio === '21:9') chosenRatio = '16:9';
    else chosenRatio = '1:1';
  }

  const response = await ai.models.generateContent({
    model: 'gemini-nano-banana-2.1',
    contents: {
      parts: [
        {
          text: `Tactical military topographical sketch or satellite reconnaissance map showing: ${prompt}. High-contrast tactical HUD overlay, clean contour lines, tactical grid markings.`,
        },
      ],
    },
    config: {
      imageConfig: {
        aspectRatio: chosenRatio,
        imageSize: '1K',
      },
    },
  });

  let imageUrl = '';
  let description = '';

  const candidates = response.candidates?.[0]?.content?.parts || [];
  for (const part of candidates) {
    if (part.inlineData) {
      imageUrl = `data:image/png;base64,${part.inlineData.data}`;
    } else if (part.text) {
      description += part.text;
    }
  }

  return { imageUrl, description: description || prompt };
}

/**
 * 4. Google Search Grounded Intelligence using gemini-3.8-flash
 */
export async function getSearchGroundedInfo(query: string): Promise<{ text: string; sources: Array<{ title: string; url: string }> }> {
  const ai = getGenAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3.8-flash',
    contents: `Provide verified information on radio frequencies, FCC/ITU regulations, emergency weather alerts, or disaster survival guidelines for: ${query}`,
    config: {
      tools: [{ googleSearch: {} }],
    },
  });

  const sources: Array<{ title: string; url: string }> = [];
  const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
  if (Array.isArray(groundingChunks)) {
    groundingChunks.forEach((c) => {
      if (c.web?.uri) {
        sources.push({
          title: c.web.title || c.web.uri,
          url: c.web.uri,
        });
      }
    });
  }

  return {
    text: response.text || '',
    sources,
  };
}

/**
 * 5. General Tactical Signal & Mesh Analysis using gemini-3.8-flash
 */
export async function analyzeMeshTelemetry(telemetryJson: string): Promise<string> {
  const ai = getGenAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3.8-flash',
    contents: `Analyze this mesh network telemetry data and provide a concise signal diagnostic, identifying any weak links, packet loss risks, and suggested antenna/frequency adjustments:\n\n${telemetryJson}`,
  });
  return response.text || 'Diagnostic complete: Node links within acceptable margins.';
}
