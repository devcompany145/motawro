
import { GoogleGenAI, Type } from "@google/genai";
import { getSystemInstruction } from '../constants';
import { Business, BusinessGenome, MatchResult } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Generates strategic business advice using Gemini
export const generateBusinessAdvice = async (query: string, chatHistory: string[], language: string = 'ar'): Promise<string> => {
  try {
    const model = 'gemini-3-flash-preview';
    
    let prompt = '';
    if (language === 'ar') {
       prompt = `تاريخ المحادثة: ${chatHistory.join('\n')}\nسؤال المستخدم الحالي: ${query}\nقدم إجابة مفيدة وموجزة.`;
    } else if (language === 'es') {
       prompt = `Historial de chat: ${chatHistory.join('\n')}\nPregunta actual: ${query}\nProporcione una respuesta concisa.`;
    } else {
      prompt = `Chat History: ${chatHistory.join('\n')}\nCurrent Question: ${query}\nProvide a helpful, concise answer.`;
    }

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        systemInstruction: getSystemInstruction(language),
        temperature: 0.7,
      }
    });

    return response.text || "Error";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Error connecting to AI service.";
  }
};

/**
 * Generates a comprehensive business strategy plan.
 * Uses Gemini 3 Pro for high-level reasoning.
 */
export const generateStructuredStrategy = async (profile: any, language: string = 'ar'): Promise<string> => {
  try {
    const model = 'gemini-3-pro-preview';
    const prompt = `
      As a Senior Business Architect, create a professional strategy plan for:
      BUSINESS CONTEXT: ${JSON.stringify(profile)}
      
      The plan must include:
      1. Executive Summary
      2. 12-Month Roadmap (divided into quarters)
      3. SWOT Analysis (Detailed)
      4. Digital Transformation Actions
      5. Risk Mitigation Strategy
      
      Format the output in high-quality Markdown. 
      Language: ${language === 'ar' ? 'Arabic' : 'English'}
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        systemInstruction: "You are an elite business consultant. Your strategies are actionable, innovative, and data-driven.",
        thinkingConfig: { thinkingBudget: 16000 },
        temperature: 0.4, // Lower temperature for more structured, professional output
      }
    });

    return response.text || "";
  } catch (error) {
    console.error("Strategy Generation Error:", error);
    return "Failed to generate strategy. Please try again.";
  }
};

// ... (Rest of existing matching and map grounding functions)
export const generateBusinessMatches = async (myProfile: BusinessGenome, availableBusinesses: Business[], language: string = 'ar'): Promise<MatchResult[]> => {
  try {
    const model = 'gemini-3-flash-preview';
    const candidates = availableBusinesses.map(b => ({
      id: b.id,
      name: b.name,
      genome: b.genomeProfile
    }));
    const prompt = `Analyze synergy between: USER: ${JSON.stringify(myProfile)} and CANDIDATES: ${JSON.stringify(candidates)}. Return top 6 matches in JSON. Language: ${language}`;
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
              score: { type: Type.NUMBER },
              matchReason: { type: Type.STRING },
              sharedInterests: { type: Type.ARRAY, items: { type: Type.STRING } },
              collaborationOpportunity: { type: Type.STRING },
              analysisPoints: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { factor: { type: Type.STRING }, description: { type: Type.STRING } } } }
            },
            required: ['companyId', 'score', 'matchReason', 'collaborationOpportunity']
          }
        }
      }
    });
    return JSON.parse(response.text || "[]") as MatchResult[];
  } catch (error) { return []; }
};

export const getRegionalMapInsights = async (language: string = 'ar'): Promise<{text: string, links: any[]}> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: "What are the major business hubs near Riyadh Digital District? Provide a summary.",
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

export const searchBusinessesWithAI = async (query: string, businesses: Business[], language: string = 'ar'): Promise<any> => {
  try {
    const prompt = `Search analysis for: "${query}". Data: ${JSON.stringify(businesses)}. Return JSON: {"ids": [], "filters": {}}`;
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || "{}");
  } catch (error) { return { ids: [], filters: {} }; }
};

export const recommendConsultingService = async (query: string, language: string = 'ar'): Promise<{recommendedId: string, reasoning: string}> => {
  try {
    const prompt = `Recommend consulting for: "${query}". Return JSON: {"recommendedId": "", "reasoning": ""}`;
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: { recommendedId: { type: Type.STRING }, reasoning: { type: Type.STRING } },
          required: ["recommendedId", "reasoning"]
        }
      },
    });
    return JSON.parse(response.text || "{}");
  } catch (error) { return { recommendedId: "", reasoning: "" }; }
};
