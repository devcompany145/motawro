
import { GoogleGenAI, Type } from "@google/genai";
import { getSystemInstruction } from '../constants';
import { Business, BusinessGenome, MatchResult } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateBusinessAdvice = async (query: string, chatHistory: string[], language: string = 'ar'): Promise<string> => {
  try {
    const model = 'gemini-3-flash-preview';
    
    let prompt = '';
    if (language === 'ar') {
       prompt = `
      تاريخ المحادثة:
      ${chatHistory.join('\n')}
      
      سؤال المستخدم الحالي: ${query}
      
      قدم إجابة مفيدة وموجزة بصفتك مستشار أعمال خبير في منصة مطورو الاعمال.
      `;
    } else if (language === 'es') {
       prompt = `
      Historial de chat:
      ${chatHistory.join('\n')}
      
      Pregunta actual del usuario: ${query}
      
      Proporcione una respuesta útil y concisa como consultor de negocios experto en la plataforma Business Developers.
      `;
    } else {
      prompt = `
      Chat History:
      ${chatHistory.join('\n')}
      
      Current User Question: ${query}
      
      Provide a helpful and concise answer as an expert business consultant on the Business Developers platform.
      `;
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

export const generateMarketingPitch = async (businessName: string, category: string, language: string = 'ar'): Promise<string> => {
  try {
    let prompt = '';
    if (language === 'ar') {
      prompt = `اكتب وصفاً تسويقياً قصيراً وجذاباً (تغريدة واحدة) لشركة اسمها "${businessName}" تعمل في مجال "${category}".`;
    } else if (language === 'es') {
      prompt = `Escribe una descripción de marketing corta y atractiva (un tweet) para una empresa llamada "${businessName}" en la categoría "${category}".`;
    } else {
      prompt = `Write a short and catchy marketing pitch (one tweet) for a company named "${businessName}" in the "${category}" industry.`;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "";
  } catch (error) {
    return "Leading company in its field.";
  }
};

export const generateBusinessMatches = async (myProfile: BusinessGenome, availableBusinesses: Business[], language: string = 'ar'): Promise<MatchResult[]> => {
  try {
    const simplifiedCandidates = availableBusinesses
        .filter(b => b.isOccupied && b.genomeProfile)
        .map(b => ({
           id: b.id,
           name: b.name,
           genome: b.genomeProfile
        }));

    const prompt = `
      You are the "Business Genome Matching Engine" for a digital business district.
      
      YOUR PROFILE (The User):
      ${JSON.stringify(myProfile)}
      
      CANDIDATE ECOSYSTEM (Potential Partners):
      ${JSON.stringify(simplifiedCandidates)}
      
      TASK:
      Perform deep analysis of compatibility based on Genome Profiles.
      Look for:
      1. SUPPLY-DEMAND MATCH: Do they offer what you need?
      2. SYNERGY: Could you bundle services together?
      3. MARKET FIT: Do you target similar demographics but different products?

      SCORING LOGIC:
      - 90-100: Perfect Synergy (Direct service cross-match).
      - 70-89: Strategic Growth Partner.
      - 50-69: Potential Ecosystem Ally.

      REQUIREMENTS:
      1. Return TOP 6 matches.
      2. matchReason must be insightful.
      3. collaborationOpportunity must be a concrete business project proposal.
      4. analysisPoints must evaluate: "Industry Sector", "Services Synergy", and "Strategic Fit".
      
      Output Language: ${language === 'ar' ? 'Arabic' : language === 'es' ? 'Spanish' : 'English'}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview', // Upgraded for complex reasoning
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
            required: ['companyId', 'score', 'matchReason', 'collaborationOpportunity', 'sharedInterests', 'analysisPoints']
          }
        }
      }
    });

    const text = response.text || "[]";
    return JSON.parse(text) as MatchResult[];

  } catch (error) {
    console.error("AI Matching Error:", error);
    return [];
  }
};

export const searchBusinessesWithAI = async (query: string, businesses: Business[], language: string = 'ar'): Promise<any> => {
  try {
    const simplifiedData = businesses.map(b => ({
      id: b.id,
      name: b.name,
      description: b.description,
      category: b.category,
      services: b.services,
      isOccupied: b.isOccupied
    }));

    const categories = [...new Set(businesses.map(b => b.category).filter(c => c !== 'AVAILABLE'))];

    const prompt = `
      Analyze search query for Business Developers District.
      Data: ${JSON.stringify(simplifiedData)}
      Query: "${query}"
      Return JSON: {"ids": [], "filters": {"status": "...", "categories": []}}
    `;

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

export const analyzeMapTrends = async (businesses: Business[], language: string = 'ar'): Promise<string> => {
  try {
    const data = businesses.filter(b => b.isOccupied).map(b => ({
      name: b.name,
      category: b.category,
      visitors: b.activeVisitors || 0
    }));

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analyze these market trends: ${JSON.stringify(data)} in ${language}.`,
    });

    return response.text || "";
  } catch (error) {
    return "Error generating insights.";
  }
};

export const recommendConsultingService = async (query: string, language: string = 'ar'): Promise<any> => {
  try {
    const prompt = `Recommend consulting for: "${query}". Return JSON {"recommendedId": "...", "reasoning": "..."}`;
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(response.text || "{}");
  } catch (error) {
    return { recommendedId: '', reasoning: '' };
  }
};
