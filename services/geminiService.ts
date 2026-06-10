import { GoogleGenAI } from "@google/genai";
import { getPricePerGb } from "./supabaseDatabase";
import { SITE } from '@/lib/brand';

export const generateSupportResponse = async (query: string): Promise<string> => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;

  if (!apiKey) {
    return "I'm sorry, I'm currently offline (API Key missing). Please contact human support.";
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    // Fetch current dynamic price
    const currentPrice = await getPricePerGb();

    const systemPrompt = `
      You are a helpful customer support agent for "${SITE.name}", a data bundle vending platform in Ghana.
      
      Key Information:
      - We sell non-expiry internet data bundles for MTN, Telecel (formerly Vodafone), and AT (AirtelTigo).
      - Price is uniform: ${currentPrice} GHS per 1 GB.
      - 5GB costs ${5 * currentPrice} GHS. 10GB costs ${10 * currentPrice} GHS.
      - We support Paystack (Card, Mobile Money) and Wallet payments.
      - Airtime top-up is coming soon.
      - Orders are usually fulfilled within 10-60 minutes.
      - If payment fails, money is refunded to the wallet.
      - 
      
      Tone: Professional, friendly, and concise. Use emojis sparingly.
      Current Query: ${query}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: systemPrompt,
    });

    return response.text || "I couldn't process that request right now.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "I'm having trouble connecting to the server. Please try again later.";
  }
};