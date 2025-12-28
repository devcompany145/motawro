
import { GoogleGenAI, Type } from "@google/genai";
import { getSystemInstruction } from '../constants';
import { Business, BusinessGenome, MatchResult } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Generates strategic business advice using Gemini with streaming support.
 */
export async function* streamBusinessAdvice(query: string, chatHistory: string[], language: string = 'ar') {
  try {
    const model = 'gemini-3-flash-preview';
    const prompt = `${getSystemInstruction(language)}\n\nHistory:\n${chatHistory.join('\n')}\n\nUser Question: ${query}`;

    const responseStream = await ai.models.generateContentStream({
      model: model,
      contents: prompt,
      config: {
        temperature: 0.7,
      }
    });

    for await (const chunk of responseStream) {
      if (chunk.text) yield chunk.text;
    }
  } catch (error) {
    console.error("Gemini Streaming Error:", error);
    yield "Error connecting to AI service.";
  }
}

/**
 * Generates a comprehensive, reasoned business strategy plan.
 */
export const generateStructuredStrategy = async (profile: any, language: string = 'ar'): Promise<string> => {
  try {
    const model = 'gemini-3-pro-preview';
    const servicesText = profile.servicesOffered?.length > 0 
      ? `SERVICES CURRENTLY PROVIDED: ${profile.servicesOffered.join(', ')}` 
      : 'SERVICES: General industry-aligned offerings';

    const prompt = `
      You are a World-Class Business Architect. Create a hyper-professional 12-month digital transformation strategy for:
      BUSINESS PROFILE: 
      - Industry: ${profile.industry}
      - ${servicesText}
      - Core Objective: ${profile.coreGoal}
      
      Requirements:
      1. Executive Vision: A bold, 2-sentence vision statement.
      2. 12-Month Roadmap: Quarterly milestones (Q1-Q4) with specific KPIs.
      3. Ecosystem Synergy: How to leverage neighbors in Riyadh's Digital District.
       Language: ${language === 'ar' ? 'Arabic' : 'English'}
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        systemInstruction: "You are an elite management consultant. Focus on scaling the specific services provided by the user.",
        thinkingConfig: { thinkingBudget: 16000 },
        temperature: 0.4,
      }
    });

    return response.text || "";
  } catch (error) {
    console.error("Strategy Error:", error);
    return "Failed to construct strategy blueprint.";
  }
};

/**
 * Generates a high-level mentor recommendation summary based on genome and network.
 */
export const generateMentorInsight = async (userGenome: BusinessGenome, mentors: any[], language: string = 'ar'): Promise<string> => {
  try {
    const prompt = `
      User Business Profile: ${JSON.stringify(userGenome)}
      Available Mentors: ${JSON.stringify(mentors.map(m => ({ name: m.name, expertise: m.expertise, background: m.background })))}
      
      Task: Provide a 3-sentence high-level strategic recommendation. 
      1. Identify the single best mentor for their current stage.
      2. Mention a specific trend in the ${userGenome.industrySector} sector (relevant to KSA/GCC).
      3. Explain the synergy.
      Language: ${language === 'ar' ? 'Arabic' : 'English'}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: "You are the District AI Mentor Concierge. Your advice is brief, authoritative, and data-driven.",
        temperature: 0.5,
      }
    });

    return response.text || "";
  } catch (error) {
    return "Analyze your business genome to find the perfect mentor match.";
  }
};

/**
 * Generates business matches using structured JSON response.
 */
export const generateBusinessMatches = async (myProfile: BusinessGenome, availableBusinesses: Business[], language: string = 'ar'): Promise<MatchResult[]> => {
  try {
    const model = 'gemini-3-flash-preview';
    const candidates = availableBusinesses.map(b => ({ id: b.id, name: b.name, genome: b.genomeProfile }));
    const prompt = `Analyze synergy between: USER: ${JSON.stringify(myProfile)} and CANDIDATES: ${JSON.stringify(candidates)}. Return top 6 matches in JSON.`;
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              companyId: { type: Type.STRING },
              // Fix: Use Type.NUMBER instead of JS Number constructor
              score: { type: Type.NUMBER },
              matchReason: { type: Type.STRING },
              sharedInterests: { type: Type.ARRAY, items: { type: Type.STRING } },
              collaborationOpportunity: { type: Type.STRING }
            },
            required: ["companyId", "score", "matchReason", "sharedInterests", "collaborationOpportunity"]
          }
        }
      }
    });
    return JSON.parse(response.text || "[]") as MatchResult[];
  } catch (error) { return []; }
};

/**
 * Retrieves regional map insights with Google Maps grounding.
 */
export const getRegionalMapInsights = async (language: string = 'ar'): Promise<{text: string, links: any[]}> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: "Riyadh Digital District business hubs and networking spots. Coordinates: 24.7136, 46.6753.",
      config: {
        tools: [{ googleMaps: {} }],
        toolConfig: { retrievalConfig: { latLng: { latitude: 24.7136, longitude: 46.6753 } } }
      },
    });
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const links = groundingChunks.filter((chunk: any) => chunk.maps?.uri).map((chunk: any) => ({ title: chunk.maps.title, url: chunk.maps.uri }));
    return { text: response.text || "", links };
  } catch (error) { return { text: "Error", links: [] }; }
};
