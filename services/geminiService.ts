
import { GoogleGenAI, Type } from "@google/genai";
import { getSystemInstruction } from '../constants';
import { Business, BusinessGenome, MatchResult } from "../types";

// Initialize Gemini Client
// Fix: Use named parameter for apiKey as per guidelines
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Generates strategic business advice using Gemini with streaming support.
 */
export async function* streamBusinessAdvice(query: string, chatHistory: string[], language: string = 'ar') {
  try {
    const model = 'gemini-3-flash-preview';
    // Fix: Using a plain string for contents for simple text tasks
    const prompt = `${getSystemInstruction(language)}\n\nHistory:\n${chatHistory.join('\n')}\n\nUser Question: ${query}`;

    const responseStream = await ai.models.generateContentStream({
      model: model,
      contents: prompt,
      config: {
        temperature: 0.7,
      }
    });

    for await (const chunk of responseStream) {
      // Fix: Access chunk.text property directly
      if (chunk.text) yield chunk.text;
    }
  } catch (error) {
    console.error("Gemini Streaming Error:", error);
    yield "Error connecting to AI service.";
  }
}

/**
 * Generates a comprehensive, reasoned business strategy plan.
 * Uses Gemini 3 Pro for high-level reasoning with thinking budget.
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
      2. 12-Month Roadmap: Quarterly milestones (Q1-Q4) with specific KPIs for the services provided.
      3. Ecosystem Synergy: How to leverage neighbors in the Digital District (Riyadh) based on the current service portfolio.
      4. Risk & Mitigation: Top 3 strategic risks.
      5. Resource Allocation: Budget and headcount suggestions.
      
      Output Format: High-quality Markdown with professional business headers.
      Language: ${language === 'ar' ? 'Arabic' : 'English'}
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        systemInstruction: "You are an elite management consultant from a top-tier firm. Your tone is authoritative, insightful, and strategic. Focus on scaling the specific services provided by the user.",
        // Fix: Added appropriate thinkingBudget for gemini-3-pro-preview
        thinkingConfig: { thinkingBudget: 16000 },
        temperature: 0.4,
      }
    });

    // Fix: Access response.text property directly
    return response.text || "";
  } catch (error) {
    console.error("Strategy Generation Error:", error);
    return "Failed to construct strategy blueprint.";
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
              score: { type: Number },
              matchReason: { type: Type.STRING },
              sharedInterests: { type: Type.ARRAY, items: { type: Type.STRING } },
              collaborationOpportunity: { type: Type.STRING }
            },
            required: ["companyId", "score", "matchReason", "sharedInterests", "collaborationOpportunity"]
          }
        }
      }
    });
    // Fix: Access response.text property directly
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
    // Fix: Extract grounding metadata as per guidelines
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const links = groundingChunks.filter((chunk: any) => chunk.maps?.uri).map((chunk: any) => ({ title: chunk.maps.title, url: chunk.maps.uri }));
    // Fix: Access response.text property directly
    return { text: response.text || "", links };
  } catch (error) { return { text: "Error", links: [] }; }
};

/**
 * Recommends a consulting service category with structured JSON.
 */
export const recommendConsultingService = async (query: string, language: string = 'ar'): Promise<{recommendedId: string, reasoning: string}> => {
  try {
    const prompt = `Based on the query: "${query}", recommend the best consulting service category.`;
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { 
        responseMimeType: "application/json",
        // Fix: Added responseSchema for more robust JSON output
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            recommendedId: { type: Type.STRING, description: "ID of the recommended service category" },
            reasoning: { type: Type.STRING, description: "Professional rationale for the recommendation" }
          },
          required: ["recommendedId", "reasoning"]
        }
      }
    });
    // Fix: Access response.text property directly
    return JSON.parse(response.text || "{}");
  } catch (error) { return { recommendedId: "", reasoning: "" }; }
};
