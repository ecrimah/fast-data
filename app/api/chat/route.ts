import { NextResponse } from 'next/server';
import {
  listBundles,
  getStoreInfo,
  trackOrder,
  checkWallet,
  createChatOrder,
  type ChatOrder,
} from '@/lib/chat-tools';
import { SITE } from '@/lib/brand';
import { getPricePerGb } from '@/services/supabaseDatabase';

const LLM_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const LLM_MODEL = 'llama-3.3-70b-versatile';

type ChatMessage = { role: 'user' | 'assistant'; content: string };

type ChatAction =
  | { type: 'payment_link'; paymentUrl: string; paymentRef: string; label: string }
  | { type: 'view_order'; order: ChatOrder };

type RequestBody = {
  messages?: ChatMessage[];
  message?: string;
  userId?: string;
  userEmail?: string;
  walletBalance?: number;
};

const LLM_TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'list_bundles',
      description: 'List all available data bundle sizes and prices in GHS.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_store_info',
      description: 'Get store info: networks, payment methods, delivery times, FAQs.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'track_order',
      description: `Track order status by payment reference (${SITE.paymentRefPrefix}-...) or beneficiary phone number.`,
      parameters: {
        type: 'object',
        properties: {
          payment_ref: { type: 'string', description: `Payment reference e.g. ${SITE.paymentRefPrefix}-1234567890` },
          phone: { type: 'string', description: 'Beneficiary phone number' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'check_wallet',
      description: 'Check signed-in customer wallet balance.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'create_order',
      description:
        'Create a data bundle order after confirming network, GB size, phone, and payment method with the customer.',
      parameters: {
        type: 'object',
        properties: {
          network: { type: 'string', description: 'MTN, Telecel, or AT' },
          size_gb: { type: 'number', description: 'Bundle size in GB' },
          phone: { type: 'string', description: 'Beneficiary Ghana phone number' },
          payment_method: { type: 'string', enum: ['moolre', 'wallet'], description: 'moolre for MoMo, wallet for signed-in users' },
        },
        required: ['network', 'size_gb', 'phone', 'payment_method'],
      },
    },
  },
];

async function executeTool(
  name: string,
  args: Record<string, unknown>,
  ctx: { userId?: string; userEmail?: string; walletBalance?: number; baseUrl: string }
): Promise<{ result: unknown; action?: ChatAction; orderCard?: ChatOrder }> {
  switch (name) {
    case 'list_bundles': {
      const bundles = await listBundles();
      return { result: { bundles } };
    }
    case 'get_store_info': {
      const info = await getStoreInfo();
      return { result: { info } };
    }
    case 'track_order': {
      const tracked = await trackOrder({
        paymentRef: args.payment_ref as string | undefined,
        phone: args.phone as string | undefined,
      });
      return {
        result: tracked,
        orderCard: tracked.orders[0],
        action: tracked.orders[0]
          ? { type: 'view_order', order: tracked.orders[0] }
          : undefined,
      };
    }
    case 'check_wallet': {
      const wallet = await checkWallet(ctx.userId);
      if (ctx.walletBalance != null && wallet.signedIn) {
        wallet.balance = ctx.walletBalance;
      }
      return { result: wallet };
    }
    case 'create_order': {
      const orderResult = await createChatOrder({
        network: String(args.network),
        sizeGb: Number(args.size_gb),
        phone: String(args.phone),
        paymentMethod: args.payment_method === 'wallet' ? 'wallet' : 'moolre',
        user: ctx.userId
          ? {
              id: ctx.userId,
              email: ctx.userEmail || '',
              wallet_balance: ctx.walletBalance ?? 0,
            }
          : null,
        baseUrl: ctx.baseUrl,
      });

      if (!orderResult.ok) {
        return { result: { ok: false, error: orderResult.error } };
      }

      const action: ChatAction | undefined = orderResult.paymentUrl
        ? {
            type: 'payment_link',
            paymentUrl: orderResult.paymentUrl,
            paymentRef: orderResult.paymentRef || orderResult.order!.payment_ref,
            label: `Pay GH₵${orderResult.order!.amount.toFixed(2)} with MoMo`,
          }
        : undefined;

      return {
        result: orderResult,
        orderCard: orderResult.order,
        action,
      };
    }
    default:
      return { result: { error: 'Unknown tool' } };
  }
}

async function handleWithoutAI(query: string): Promise<string> {
  const price = await getPricePerGb();
  const lower = query.toLowerCase();
  if (lower.includes('price') || lower.includes('cost') || lower.includes('gb')) {
    const bundles = await listBundles();
    const sample = bundles.slice(0, 5).map((b) => `${b.size_gb}GB = GH₵${b.price_ghs}`).join(', ');
    return `Current rate is GH₵${price}/GB. Examples: ${sample}. Say "buy 5GB MTN" and I'll help you order!`;
  }
  if (lower.includes('track') || lower.includes('order')) {
    return `To track an order, send your payment reference (${SITE.paymentRefPrefix}-...) or the phone number on the order.`;
  }
  if (lower.includes('buy') || lower.includes('order')) {
    return `To order: tell me network (MTN/Telecel/AT), bundle size in GB, and phone number. Price is GH₵${price}/GB. Pay with MoMo or wallet.`;
  }
  return `Hi! I'm ${SITE.name} assistant. I can help you buy data, check prices, track orders, and answer questions. What would you like?`;
}

export async function POST(request: Request) {
  try {
    const body: RequestBody = await request.json();
    const history: ChatMessage[] = Array.isArray(body.messages) ? body.messages : [];
    const latest =
      body.message ||
      (history.length ? history[history.length - 1]?.content : '') ||
      '';

    if (!latest || typeof latest !== 'string') {
      return NextResponse.json({ error: 'Message required' }, { status: 400 });
    }

    const groqKey = process.env.GROQ_API_KEY;
    const requestUrl = new URL(request.url);
    const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || requestUrl.origin).replace(/\/+$/, '');
    const price = await getPricePerGb();

    if (!groqKey) {
      const response = await handleWithoutAI(latest);
      return NextResponse.json({
        response,
        quickReplies: ['Show prices', 'Buy 5GB MTN', 'Track my order'],
      });
    }

    const systemPrompt = `You are Tay, the ${SITE.name} AI assistant for Ghana data bundles.

Capabilities: answer questions, list prices, track orders, and CREATE orders for customers.

Rules:
- Introduce yourself as Tay when greeting new users.
- Networks: MTN, Telecel, AT. Bundles are non-expiry.
- Price: GH₵ ${price} per 1 GB.
- Before create_order: confirm network, GB size, phone, total price, and payment method.
- Payment: "moolre" = Mobile Money (anyone). "wallet" = signed-in users only.
- Collect phone in Ghana format (024XXXXXXX).
- After creating MoMo order, tell customer to tap the Pay button.
- After wallet order, confirm order is placed and data will arrive in minutes.
- Be warm, concise, use GH₵. Use tools for prices, tracking, and ordering — don't guess.

Customer signed in: ${body.userId ? 'yes' : 'no'}${body.walletBalance != null ? `, wallet GH₵ ${body.walletBalance.toFixed(2)}` : ''}.`;

    const groqMessages: Array<{ role: string; content?: string; tool_calls?: unknown[]; tool_call_id?: string; name?: string }> = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-12).map((m) => ({ role: m.role, content: m.content })),
    ];

    if (!history.length || history[history.length - 1]?.content !== latest) {
      groqMessages.push({ role: 'user', content: latest });
    }

    let actions: ChatAction[] = [];
    let orderCard: ChatOrder | undefined;
    let quickReplies: string[] = ['Show all prices', 'Buy data', 'Track order'];

    for (let step = 0; step < 5; step++) {
      const res = await fetch(LLM_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${groqKey}`,
        },
        body: JSON.stringify({
          model: LLM_MODEL,
          messages: groqMessages,
          tools: LLM_TOOLS,
          tool_choice: 'auto',
          temperature: 0.5,
          max_tokens: 600,
        }),
      });

      const data = await res.json();
      const choice = data.choices?.[0]?.message;

      if (!choice) {
        return NextResponse.json({
          response: "I'm having trouble right now. Please try again.",
          quickReplies,
        });
      }

      if (choice.tool_calls?.length) {
        groqMessages.push({
          role: 'assistant',
          content: choice.content || '',
          tool_calls: choice.tool_calls,
        });

        for (const tc of choice.tool_calls) {
          const fn = tc.function;
          let args: Record<string, unknown> = {};
          try {
            args = JSON.parse(fn.arguments || '{}');
          } catch {
            args = {};
          }

          const { result, action, orderCard: card } = await executeTool(fn.name, args, {
            userId: body.userId,
            userEmail: body.userEmail,
            walletBalance: body.walletBalance,
            baseUrl,
          });

          if (action) actions.push(action);
          if (card) orderCard = card;

          groqMessages.push({
            role: 'tool',
            tool_call_id: tc.id,
            name: fn.name,
            content: JSON.stringify(result),
          });
        }
        continue;
      }

      const responseText =
        choice.content ||
        (actions.some((a) => a.type === 'payment_link')
          ? 'Your order is ready! Tap the Pay button below to complete Mobile Money payment.'
          : 'How else can I help you?');

      if (actions.some((a) => a.type === 'payment_link')) {
        quickReplies = ['Track this order', 'Buy another bundle'];
      }

      return NextResponse.json({
        response: responseText,
        actions,
        orderCard,
        quickReplies,
      });
    }

    return NextResponse.json({
      response: 'Let me know if you need anything else!',
      actions,
      orderCard,
      quickReplies,
    });
  } catch (error) {
    console.error('[chat]', error);
    return NextResponse.json({ error: 'Chat failed' }, { status: 500 });
  }
}
