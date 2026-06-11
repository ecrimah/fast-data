import { NextResponse } from 'next/server';
import { assertAdminApi } from '@/lib/auth/admin-api';
import {
  adjustCustomerWallet,
  bulkFulfillOrders,
  cancelOrder,
  cancelOrders,
  createPromotion,
  creditCustomerWallet,
  fulfillOrder,
  getAnalyticsSummary,
  getCustomerOrders,
  getOpsSummary,
  getOrderDetails,
  getPlatformSettings,
  getSupplierRouting,
  listDisputes,
  listOrders,
  listPackages,
  listPromotions,
  listReferralRewards,
  listSmsLogs,
  listSupplierLogs,
  listTransactions,
  listUnmatchedPayments,
  matchPayment,
  pingSupplier,
  pollSupplierOrderStatus,
  resolveDispute,
  resolveManualOrder,
  retrySupplierOrder,
  searchCustomers,
  searchOrder,
  sendTestSms,
  setReferralsEnabled,
  setSupplierRouting,
  updateCustomerRole,
  updatePackage,
  updatePlatformConfig,
  updatePricePerGb,
  updatePromotion,
} from '@/lib/admin-chat-tools';
import { SITE } from '@/lib/brand';
import { checkRateLimit, clientIp } from '@/lib/security/rate-limit';
import { truncateForLlm } from '@/lib/security/sanitize';

const LLM_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const LLM_MODEL = 'llama-3.3-70b-versatile';

type ChatMessage = { role: 'user' | 'assistant'; content: string };

type RequestBody = {
  messages?: ChatMessage[];
  message?: string;
};

const ADMIN_TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'get_ops_summary',
      description: 'Get admin ops dashboard: queue counts, alerts, and key metrics.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'list_orders',
      description: 'List orders with optional filter and search.',
      parameters: {
        type: 'object',
        properties: {
          filter: {
            type: 'string',
            enum: ['all', 'pending_payment', 'pending_delivery', 'delivered', 'failed', 'manual', 'supplier_failed'],
          },
          query: { type: 'string', description: 'Search by phone, payment ref, or order id' },
          limit: { type: 'number', description: 'Max rows (default 15)' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'search_order',
      description: 'Find a specific order by payment reference or phone.',
      parameters: {
        type: 'object',
        properties: {
          payment_ref: { type: 'string' },
          phone: { type: 'string' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'fulfill_order',
      description: 'Mark an order as delivered/fulfilled by order id or payment reference.',
      parameters: {
        type: 'object',
        properties: {
          ref_or_id: { type: 'string', description: 'Order UUID or payment reference' },
        },
        required: ['ref_or_id'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'cancel_order',
      description: 'Cancel a single order by order id or payment reference. Use for unpaid orders or paid orders not yet delivered.',
      parameters: {
        type: 'object',
        properties: {
          ref_or_id: { type: 'string', description: 'Order UUID or payment reference' },
          note: { type: 'string', description: 'Optional cancellation reason' },
          refund_wallet: {
            type: 'boolean',
            description: 'If true and order was paid via wallet, credit the customer wallet back',
          },
        },
        required: ['ref_or_id'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'cancel_orders',
      description: 'Cancel multiple orders at once using their order ids or payment refs from the conversation.',
      parameters: {
        type: 'object',
        properties: {
          ref_or_ids: {
            type: 'array',
            items: { type: 'string' },
            description: 'List of order UUIDs or payment references',
          },
          note: { type: 'string' },
          refund_wallet: { type: 'boolean' },
        },
        required: ['ref_or_ids'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'retry_supplier_order',
      description: 'Clear supplier state and re-dispatch an order to the supplier API.',
      parameters: {
        type: 'object',
        properties: { order_id: { type: 'string' } },
        required: ['order_id'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'resolve_manual_order',
      description: 'Resolve an order awaiting manual fulfilment as fulfilled or failed.',
      parameters: {
        type: 'object',
        properties: {
          order_id: { type: 'string' },
          outcome: { type: 'string', enum: ['fulfilled', 'failed'] },
          note: { type: 'string' },
        },
        required: ['order_id', 'outcome'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'list_unmatched_payments',
      description: 'List MoMo payment events not yet matched to an order.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'match_payment',
      description: 'Match an unmatched payment event to an order and complete the order.',
      parameters: {
        type: 'object',
        properties: {
          event_id: { type: 'string' },
          order_id: { type: 'string' },
        },
        required: ['event_id', 'order_id'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'search_customers',
      description: 'Search customer profiles by email, phone, or name.',
      parameters: {
        type: 'object',
        properties: { search: { type: 'string' } },
        required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'adjust_customer_wallet',
      description: 'Credit or debit a customer wallet. Positive amount = credit, negative = debit.',
      parameters: {
        type: 'object',
        properties: {
          user_id: { type: 'string' },
          amount: { type: 'number', description: 'Amount in GHS (+ credit, - debit)' },
        },
        required: ['user_id', 'amount'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'list_packages',
      description: 'List data package catalog, optionally filtered by network (MTN, Telecel, AT).',
      parameters: {
        type: 'object',
        properties: { network: { type: 'string' } },
        required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'update_package',
      description: 'Update a package price, active flag, or popular flag.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          price: { type: 'number' },
          active: { type: 'boolean' },
          popular: { type: 'boolean' },
        },
        required: ['id'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'update_price_per_gb',
      description: 'Update the global price-per-GB setting.',
      parameters: {
        type: 'object',
        properties: { price: { type: 'number' } },
        required: ['price'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_analytics_summary',
      description: 'Get revenue, order counts, payment mix, and network breakdown.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'bulk_fulfill_orders',
      description: 'Mark multiple orders as fulfilled by payment refs or order ids.',
      parameters: {
        type: 'object',
        properties: {
          ref_or_ids: { type: 'array', items: { type: 'string' } },
        },
        required: ['ref_or_ids'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'ping_supplier',
      description: 'Ping a supplier API (successbizhub, skanka5) to check connectivity and balance.',
      parameters: {
        type: 'object',
        properties: { supplier_id: { type: 'string', enum: ['successbizhub', 'skanka5', 'manual'] } },
        required: ['supplier_id'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_supplier_routing',
      description: 'Show which supplier handles each network (MTN, Telecel, AT).',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'list_supplier_logs',
      description: 'Recent supplier dispatch logs, failures, and manual queue.',
      parameters: {
        type: 'object',
        properties: { limit: { type: 'number' } },
        required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'poll_order_status',
      description: 'Poll SuccessBiz/DataCore for live status of an order by reference.',
      parameters: {
        type: 'object',
        properties: { identifier: { type: 'string' } },
        required: ['identifier'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'list_disputes',
      description: 'List open and recent customer disputes.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'resolve_dispute',
      description: 'Mark a dispute as resolved with optional resolution note.',
      parameters: {
        type: 'object',
        properties: {
          dispute_id: { type: 'string' },
          resolution: { type: 'string' },
        },
        required: ['dispute_id'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'list_referrals',
      description: 'List recent referral reward payouts.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'list_transactions',
      description: 'List recent wallet transactions (top-ups, debits).',
      parameters: {
        type: 'object',
        properties: { limit: { type: 'number' } },
        required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'list_sms_logs',
      description: 'Recent SMS notification delivery logs.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'send_test_sms',
      description: 'Send a test SMS via Moolre to verify SMS delivery.',
      parameters: {
        type: 'object',
        properties: {
          phone: { type: 'string' },
          message: { type: 'string' },
        },
        required: ['phone', 'message'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_platform_config',
      description: 'Platform settings: price per GB, referrals, contact info, supplier routing.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'update_customer_role',
      description: 'Change a customer profile role (user, admin, agent).',
      parameters: {
        type: 'object',
        properties: {
          user_id: { type: 'string' },
          role: { type: 'string', enum: ['user', 'admin', 'agent'] },
        },
        required: ['user_id', 'role'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'list_promotions',
      description: 'List promo codes and campaigns.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'credit_customer_wallet',
      description: 'Credit a customer wallet (positive amount only).',
      parameters: {
        type: 'object',
        properties: {
          user_id: { type: 'string' },
          amount: { type: 'number' },
          note: { type: 'string' },
        },
        required: ['user_id', 'amount'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_order_details',
      description: 'Full detail for one order incl. supplier reference, supplier error, and timestamps.',
      parameters: {
        type: 'object',
        properties: { ref_or_id: { type: 'string' } },
        required: ['ref_or_id'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_customer_orders',
      description: 'Order history and total spend for a customer by user id or phone.',
      parameters: {
        type: 'object',
        properties: {
          user_id: { type: 'string' },
          phone: { type: 'string' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'set_supplier_routing',
      description: 'Change which supplier (manual, skanka5, successbizhub) fulfils a network (mtn, telecel, at).',
      parameters: {
        type: 'object',
        properties: {
          network: { type: 'string', enum: ['mtn', 'telecel', 'at'] },
          supplier_id: { type: 'string', enum: ['manual', 'skanka5', 'successbizhub'] },
        },
        required: ['network', 'supplier_id'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'create_promotion',
      description: 'Create a promo code with a percent or fixed GH₵ discount.',
      parameters: {
        type: 'object',
        properties: {
          code: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string' },
          discount_percent: { type: 'number' },
          discount_amount: { type: 'number' },
          active: { type: 'boolean' },
        },
        required: ['code', 'title'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'update_promotion',
      description: 'Activate/deactivate or edit a promo code by id.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          active: { type: 'boolean' },
          title: { type: 'string' },
          discount_percent: { type: 'number' },
          discount_amount: { type: 'number' },
        },
        required: ['id'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'set_referrals_enabled',
      description: 'Turn the referral rewards program on or off.',
      parameters: {
        type: 'object',
        properties: { enabled: { type: 'boolean' } },
        required: ['enabled'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'update_platform_config',
      description:
        'Update platform settings: SMS on/off, sender id, support WhatsApp, referral reward, order cooldown, SMS templates.',
      parameters: {
        type: 'object',
        properties: {
          sms_enabled: { type: 'boolean' },
          sms_sender_id: { type: 'string' },
          support_whatsapp: { type: 'string' },
          whatsapp_channel_url: { type: 'string' },
          referral_reward_ghs: { type: 'number' },
          recipient_order_cooldown_minutes: { type: 'number' },
          payment_received_template: { type: 'string' },
          order_fulfilled_template: { type: 'string' },
        },
        required: [],
      },
    },
  },
];

async function executeAdminTool(
  name: string,
  args: Record<string, unknown>,
  ctx: { adminUserId: string }
): Promise<{ result: unknown }> {
  switch (name) {
    case 'get_ops_summary':
      return { result: await getOpsSummary() };
    case 'list_orders':
      return {
        result: await listOrders({
          filter: args.filter as string | undefined,
          query: args.query as string | undefined,
          limit: args.limit as number | undefined,
        }),
      };
    case 'search_order':
      return {
        result: await searchOrder({
          payment_ref: args.payment_ref as string | undefined,
          phone: args.phone as string | undefined,
        }),
      };
    case 'fulfill_order':
      return { result: await fulfillOrder(String(args.ref_or_id), { adminUserId: ctx.adminUserId }) };
    case 'cancel_order':
      return {
        result: await cancelOrder(
          String(args.ref_or_id),
          args.note as string | undefined,
          args.refund_wallet as boolean | undefined
        ),
      };
    case 'cancel_orders': {
      const ids = Array.isArray(args.ref_or_ids) ? args.ref_or_ids.map(String) : [];
      return {
        result: await cancelOrders(
          ids,
          args.note as string | undefined,
          args.refund_wallet as boolean | undefined
        ),
      };
    }
    case 'retry_supplier_order':
      return { result: await retrySupplierOrder(String(args.order_id)) };
    case 'resolve_manual_order':
      return {
        result: await resolveManualOrder(
          String(args.order_id),
          args.outcome as 'fulfilled' | 'failed',
          args.note as string | undefined,
          { adminUserId: ctx.adminUserId }
        ),
      };
    case 'list_unmatched_payments':
      return { result: await listUnmatchedPayments() };
    case 'match_payment':
      return {
        result: await matchPayment(String(args.event_id), String(args.order_id)),
      };
    case 'search_customers':
      return { result: await searchCustomers(args.search as string | undefined) };
    case 'adjust_customer_wallet':
      return {
        result: await adjustCustomerWallet(String(args.user_id), Number(args.amount)),
      };
    case 'list_packages':
      return { result: await listPackages(args.network as string | undefined) };
    case 'update_package':
      return {
        result: await updatePackage(String(args.id), {
          price: args.price !== undefined ? Number(args.price) : undefined,
          active: args.active as boolean | undefined,
          popular: args.popular as boolean | undefined,
        }),
      };
    case 'update_price_per_gb':
      return { result: await updatePricePerGb(Number(args.price)) };
    case 'get_analytics_summary':
      return { result: await getAnalyticsSummary() };
    case 'bulk_fulfill_orders': {
      const ids = Array.isArray(args.ref_or_ids) ? args.ref_or_ids.map(String) : [];
      return { result: await bulkFulfillOrders(ids, ctx) };
    }
    case 'ping_supplier':
      return { result: await pingSupplier(String(args.supplier_id)) };
    case 'get_supplier_routing':
      return { result: await getSupplierRouting() };
    case 'list_supplier_logs':
      return { result: await listSupplierLogs(Number(args.limit) || 15) };
    case 'poll_order_status':
      return { result: await pollSupplierOrderStatus(String(args.identifier)) };
    case 'list_disputes':
      return { result: await listDisputes() };
    case 'resolve_dispute':
      return {
        result: await resolveDispute(String(args.dispute_id), args.resolution as string | undefined),
      };
    case 'list_referrals':
      return { result: await listReferralRewards() };
    case 'list_transactions':
      return { result: await listTransactions(Number(args.limit) || 20) };
    case 'list_sms_logs':
      return { result: await listSmsLogs() };
    case 'send_test_sms':
      return {
        result: await sendTestSms(String(args.phone), String(args.message), ctx),
      };
    case 'get_platform_config':
      return { result: await getPlatformSettings() };
    case 'update_customer_role':
      return {
        result: await updateCustomerRole(String(args.user_id), String(args.role)),
      };
    case 'list_promotions':
      return { result: await listPromotions() };
    case 'credit_customer_wallet':
      return {
        result: await creditCustomerWallet(
          String(args.user_id),
          Number(args.amount),
          args.note as string | undefined
        ),
      };
    case 'get_order_details':
      return { result: await getOrderDetails(String(args.ref_or_id)) };
    case 'get_customer_orders':
      return {
        result: await getCustomerOrders({
          user_id: args.user_id as string | undefined,
          phone: args.phone as string | undefined,
        }),
      };
    case 'set_supplier_routing':
      return {
        result: await setSupplierRouting(String(args.network), String(args.supplier_id)),
      };
    case 'create_promotion':
      return {
        result: await createPromotion({
          code: String(args.code),
          title: String(args.title),
          description: args.description as string | undefined,
          discountPercent: args.discount_percent !== undefined ? Number(args.discount_percent) : undefined,
          discountAmount: args.discount_amount !== undefined ? Number(args.discount_amount) : undefined,
          active: args.active as boolean | undefined,
        }),
      };
    case 'update_promotion':
      return {
        result: await updatePromotion(String(args.id), {
          active: args.active as boolean | undefined,
          title: args.title as string | undefined,
          discountPercent: args.discount_percent !== undefined ? Number(args.discount_percent) : undefined,
          discountAmount: args.discount_amount !== undefined ? Number(args.discount_amount) : undefined,
        }),
      };
    case 'set_referrals_enabled':
      return { result: await setReferralsEnabled(Boolean(args.enabled)) };
    case 'update_platform_config':
      return {
        result: await updatePlatformConfig({
          smsEnabled: args.sms_enabled as boolean | undefined,
          smsSenderId: args.sms_sender_id as string | undefined,
          supportWhatsApp: args.support_whatsapp as string | undefined,
          whatsappChannelUrl: args.whatsapp_channel_url as string | undefined,
          referralRewardGhs:
            args.referral_reward_ghs !== undefined ? Number(args.referral_reward_ghs) : undefined,
          recipientOrderCooldownMinutes:
            args.recipient_order_cooldown_minutes !== undefined
              ? Number(args.recipient_order_cooldown_minutes)
              : undefined,
          paymentReceivedTemplate: args.payment_received_template as string | undefined,
          orderFulfilledTemplate: args.order_fulfilled_template as string | undefined,
        }),
      };
    default:
      return { result: { ok: false, error: 'Unknown tool' } };
  }
}

async function handleWithoutAI(query: string): Promise<string> {
  const lower = query.toLowerCase();
  if (lower.includes('queue') || lower.includes('summary') || lower.includes('ops')) {
    const summary = await getOpsSummary();
    if (!summary.ok) return summary.error;
    return `Ops summary: ${summary.alerts.total} items need attention — pending delivery ${summary.alerts.pendingDelivery}, manual ${summary.alerts.awaitingManual}, supplier failed ${summary.alerts.failedSupplier}, unmatched MoMo ${summary.alerts.unmatchedPayments}. GMV 30d: ${summary.metrics.gmv30d}.`;
  }
  if (lower.includes('order') || lower.includes('fulfill')) {
    const pending = await listOrders({ filter: 'pending_delivery', limit: 5 });
    if (!pending.ok) return pending.error;
    if (!pending.orders.length) return 'No pending delivery orders right now.';
    const lines = pending.orders.map((o) => `${o.payment_ref} · ${o.network} ${o.bundle_size} · ${o.phone}`).join('\n');
    return `Pending delivery (${pending.count} total):\n${lines}`;
  }
  return `Tay Ops ready. I can check the queue, fulfill orders, match MoMo payments, manage customers/packages, and pull analytics. Try "Check queue" or "Show pending orders".`;
}

export async function POST(request: Request) {
  const auth = await assertAdminApi(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const rate = checkRateLimit(`admin-chat:${auth.userId}:${clientIp(request)}`, { max: 40, windowMs: 60_000 });
  if (!rate.ok) {
    return NextResponse.json(
      { response: `Too many requests. Try again in ${rate.retryAfterSec}s.` },
      { status: 429 }
    );
  }

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
    const ctx = { adminUserId: auth.userId! };

    if (!groqKey) {
      const response = await handleWithoutAI(latest);
      return NextResponse.json({
        response,
        quickReplies: ['Check queue', 'Pending orders', 'Unmatched MoMo', 'Analytics'],
      });
    }

    const systemPrompt = `You are Tay Ops — the admin operations AI for ${SITE.name}.

You help authenticated admins run the platform. You are NOT the customer-facing assistant.

Capabilities (use tools — never guess):
- Ops queue: pending delivery, manual fulfilment, supplier failures, unmatched MoMo, disputes
- Orders: search, list, full detail (incl supplier error), fulfill (single/bulk), cancel, retry supplier, resolve manual, poll supplier status
- Suppliers: ping API, view + change network routing (set_supplier_routing), supplier logs
- Payments: list/match unmatched MoMo events to orders, list transactions
- Customers: search profiles, order history + spend, credit/debit wallets, update roles (confirm amounts before debits)
- Catalog: list/update packages, global price per GB
- Promotions: list, create, activate/deactivate promo codes
- Settings: view + update platform config (SMS on/off, sender id, support WhatsApp, referral reward, cooldown, SMS templates), toggle referrals
- Comms: SMS logs, send test SMS
- Analytics: GMV, fulfillment rate, payment mix, network breakdown, referrals

Rules:
- Be concise and action-oriented. Use GH₵ for money.
- Only offer actions you can perform with the tools above. Use cancel_orders when the admin says "cancel them" and you already listed specific order ids/refs.
- Before fulfill_order, cancel_order(s), retry_supplier_order, match_payment, or wallet adjustments: confirm the target id/ref unless the admin was explicit.
- For MoMo-paid orders, cancel stops fulfilment but does not auto-refund MoMo — say that clearly.
- For wallet-paid orders, set refund_wallet=true when cancelling if the admin wants money returned.
- For destructive actions (debit wallet, mark failed): double-check identifiers.
- Never help with customer purchases here — direct those to the storefront Tay.
- Summarize tool results clearly; include payment refs and phones when listing orders.`;

    const groqMessages: Array<{
      role: string;
      content?: string;
      tool_calls?: unknown[];
      tool_call_id?: string;
      name?: string;
    }> = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-12).map((m) => ({ role: m.role, content: m.content })),
    ];

    if (!history.length || history[history.length - 1]?.content !== latest) {
      groqMessages.push({ role: 'user', content: latest });
    }

    let quickReplies: string[] = ['Check queue', 'Pending orders', 'Unmatched MoMo', 'Analytics'];

    for (let step = 0; step < 6; step++) {
      const res = await fetch(LLM_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${groqKey}`,
        },
        body: JSON.stringify({
          model: LLM_MODEL,
          messages: groqMessages,
          tools: ADMIN_TOOLS,
          tool_choice: 'auto',
          temperature: 0.3,
          max_tokens: 800,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const groqError =
          typeof data?.error?.message === 'string'
            ? data.error.message
            : 'AI service temporarily unavailable.';
        console.error('[admin/chat] groq', groqError);
        return NextResponse.json({
          response: `Tay Ops could not reach the AI service: ${groqError}`,
          quickReplies,
        });
      }

      const choice = data.choices?.[0]?.message;

      if (!choice) {
        return NextResponse.json({
          response: 'Tay Ops is unavailable right now. Please try again.',
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
          const fn = tc?.function;
          if (!fn?.name) {
            groqMessages.push({
              role: 'tool',
              tool_call_id: tc?.id ?? `missing-${step}`,
              name: 'unknown',
              content: JSON.stringify({ ok: false, error: 'Malformed tool call from AI' }),
            });
            continue;
          }

          let args: Record<string, unknown> = {};
          try {
            args = JSON.parse(fn.arguments || '{}');
          } catch {
            args = {};
          }

          let result: unknown;
          try {
            ({ result } = await executeAdminTool(fn.name, args, ctx));
          } catch (toolError) {
            console.error('[admin/chat] tool', fn.name, toolError);
            result = {
              ok: false,
              error: toolError instanceof Error ? toolError.message : 'Tool execution failed',
            };
          }

          groqMessages.push({
            role: 'tool',
            tool_call_id: tc.id,
            name: fn.name,
            content: truncateForLlm(result),
          });
        }
        continue;
      }

      const responseText = choice.content || 'What should we tackle next?';

      if (/fulfill|queue|order/i.test(latest)) {
        quickReplies = ['Check queue', 'Show manual orders', 'Retry supplier', 'Analytics'];
      }

      return NextResponse.json({
        response: responseText,
        quickReplies,
      });
    }

    return NextResponse.json({
      response: 'Done. Anything else in the queue?',
      quickReplies,
    });
  } catch (error) {
    console.error('[admin/chat]', error);
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({
      response: `Tay Ops hit an error: ${message}. Try again or use a shorter request.`,
      quickReplies: ['Check queue', 'Pending orders', 'Analytics'],
    });
  }
}
