
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

// Analyzes business synergy and matches using structured JSON output
export const generateBusinessMatches = async (myProfile: BusinessGenome, availableBusinesses: Business[], language: string = 'ar'): Promise<MatchResult[]> => {
  try {
    const model = 'gemini-3-flash-preview';
    
    const candidates = availableBusinesses.map(b => ({
      id: b.id,
      name: b.name,
      genome: b.genomeProfile
    }));

    const prompt = `
      Analyze business synergy between:
      USER: ${JSON.stringify(myProfile)}
      CANDIDATES: ${JSON.stringify(candidates)}
      
      Return TOP 6 matches in JSON format.
      Language: ${language}
    `;

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
              analysisPoints: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    factor: { type: Type.STRING },
                    description: { type: Type.STRING }
                  }
                }
              }
            },
            required: ['companyId', 'score', 'matchReason', 'collaborationOpportunity']
          }
        }
      }
    });

    return JSON.parse(response.text || "[]") as MatchResult[];
  } catch (error) {
    console.error("AI Matching Error:", error);
    return [];
  }
};

/**
 * Uses Gemini 2.5 Maps Grounding to get real-world context for the district.
 */
export const getRegionalMapInsights = async (language: string = 'ar'): Promise<{text: string, links: any[]}> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: "What are the major business hubs, government buildings, and networking spots near the Digital District in Riyadh (near coordinates 24.7136, 46.6753)? Provide a professional summary.",
      config: {
        tools: [{ googleMaps: {} }],
        toolConfig: {
          retrievalConfig: {
            latLng: {
              latitude: 24.7136,
              longitude: 46.6753
            }
          }
        }
      },
    });

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const links = groundingChunks
      .filter((chunk: any) => chunk.maps?.uri)
      .map((chunk: any) => ({
        title: chunk.maps.title,
        url: chunk.maps.uri
      }));

    return {
      text: response.text || "",
      links: links
    };
  } catch (error) {
    console.error("Maps Grounding Error:", error);
    return { text: "Location insights currently unavailable.", links: [] };
  }
};

// Performs a smart search across business data using Gemini
export const searchBusinessesWithAI = async (query: string, businesses: Business[], language: string = 'ar'): Promise<any> => {
  try {
    const simplifiedData = businesses.map(b => ({
      id: b.id,
      name: b.name,
      category: b.category,
      isOccupied: b.isOccupied
    }));

    const prompt = `Analyze search for: "${query}". Data: ${JSON.stringify(simplifiedData)}. Return JSON: {"ids": [], "filters": {"status": "all", "categories": []}}`;
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || "{}");
  } catch (error) {
    return { ids: [], filters: { status: 'all', categories: [] } };
  }
};

/**
 * Recommends a consulting service based on user needs using Gemini.
 * Fixes the compilation error in ConsultingPage.tsx
 */
export const recommendConsultingService = async (query: string, language: string = 'ar'): Promise<{recommendedId: string, reasoning: string}> => {
  try {
    const model = 'gemini-3-flash-preview';
    const categories = [
      { id: 'cons_tech', name: 'Technical Consulting' },
      { id: 'cons_marketing', name: 'Digital Marketing' },
      { id: 'cons_training', name: 'Training & Development' },
      { id: 'cons_recruitment', name: 'Recruitment' },
      { id: 'cons_gov', name: 'Government Relations' }
    ];

    const prompt = `
      Based on the following business challenge/goal: "${query}", 
      recommend the best consulting category from this list: ${JSON.stringify(categories)}.
      Explain your reasoning briefly in ${language}.
      Return the recommendation in JSON format.
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            recommendedId: { 
              type: Type.STRING,
              description: 'The ID of the recommended category.'
            },
            reasoning: { 
              type: Type.STRING,
              description: 'Brief explanation for the recommendation in the user language.'
            }
          },
          required: ["recommendedId", "reasoning"]
        }
