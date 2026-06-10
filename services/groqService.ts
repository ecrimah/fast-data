import { SITE } from '@/lib/brand';
import { getPricePerGb } from './supabaseDatabase';

const LLM_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const LLM_MODEL = 'llama-3.3-70b-versatile';

export const generateSupportResponse = async (query: string): Promise<string> => {
  const apiKey = process.env.GROQ_API_KEY;

  const currentPrice = await getPricePerGb();

  if (!apiKey) {
    return `${SITE.name} sells non-expiry MTN, Telecel & AT bundles at GH₵ ${currentPrice}/GB. Pay with Moolre MoMo or wallet. How can I help with: ${query}?`;
  }

  try {
    const systemPrompt = `You are support for ${SITE.name} — Ghana data bundle vending.
- Networks: MTN, Telecel, AT. Non-expiry bundles.
- Price: GH₵ ${currentPrice} per 1 GB.
- Pay via Moolre Mobile Money or wallet balance.
- Delivery usually within 2–10 minutes after payment.
- Be concise, friendly, use GH₵ for prices.`;

    const res = await fetch(LLM_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: LLM_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: query },
        ],
        temperature: 0.6,
        max_tokens: 400,
      }),
    });

    const data = await res.json();
    return data.choices?.[0]?.message?.content || "I couldn't process that right now.";
  } catch (error) {
    console.error('Groq error:', error);
    return "I'm having trouble connecting. Try again or contact support.";
  }
};
