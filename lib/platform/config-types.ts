export const PLATFORM_CONFIG_KEY = 'platform_config';

export type NetworkSupplierId = 'manual' | 'skanka5' | 'successbizhub';
export type NetworkSlug = 'mtn' | 'telecel' | 'at';

export interface SupplierRoutingConfig {
  mtn?: NetworkSupplierId;
  telecel?: NetworkSupplierId;
  at?: NetworkSupplierId;
}

export interface ContactConfig {
  supportWhatsApp: string;
  whatsappChannelUrl: string;
}

export interface MoolreSmsConfig {
  enabled: boolean;
  senderId: string;
}

export interface SmsTemplatesConfig {
  paymentReceived: string;
  orderFulfilled: string;
  walletTopUpAdmin: string;
}

export interface ShopBanner {
  id: string;
  title: string;
  description: string;
  active: boolean;
}

export interface PlatformConfig {
  recipientOrderCooldownMinutes: number;
  referralRewardGhs: number;
  supplierRouting: SupplierRoutingConfig;
  contact: ContactConfig;
  moolreSms: MoolreSmsConfig;
  smsTemplates: SmsTemplatesConfig;
  shopBanners: ShopBanner[];
}

export const DEFAULT_SHOP_BANNERS: ShopBanner[] = [
  {
    id: 'flash-sale',
    title: 'Flash Sale!',
    description: 'Get 10% bonus on all MTN bundles today.',
    active: true,
  },
  {
    id: 'new-user',
    title: 'New Here?',
    description: 'Use code FDS500 for free 500MB on your first order.',
    active: true,
  },
];

export const DEFAULT_PLATFORM_CONFIG: PlatformConfig = {
  recipientOrderCooldownMinutes: 3,
  referralRewardGhs: 5,
  supplierRouting: {},
  contact: { supportWhatsApp: '', whatsappChannelUrl: '' },
  moolreSms: { enabled: true, senderId: 'FDS' },
  smsTemplates: {
    paymentReceived:
      'FDS: Payment of GH₵{amount} received for {ref}. Your data is being processed.',
    orderFulfilled: 'FDS: {bundle} delivered to {phone}. Ref: {ref}. Thank you!',
    walletTopUpAdmin:
      'FDS ADMIN: Wallet TOP-UP of GH₵{amount} by {name} ({phone}). Ref: {ref}. Not a data order.',
  },
  shopBanners: DEFAULT_SHOP_BANNERS,
};

const VALID_SUPPLIERS = new Set<NetworkSupplierId>(['manual', 'skanka5', 'successbizhub']);

function clampInt(value: unknown, fallback: number, min: number, max: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function clampNum(value: unknown, fallback: number, min: number, max: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n * 100) / 100));
}

export function normalizePlatformConfig(input: unknown): PlatformConfig {
  const base = DEFAULT_PLATFORM_CONFIG;
  if (!input || typeof input !== 'object') return base;
  const raw = input as Partial<PlatformConfig>;

  const routing: SupplierRoutingConfig = {};
  const sr = raw.supplierRouting ?? {};
  for (const net of ['mtn', 'telecel', 'at'] as const) {
    const v = sr[net];
    if (typeof v === 'string' && VALID_SUPPLIERS.has(v as NetworkSupplierId)) {
      routing[net] = v as NetworkSupplierId;
    }
  }

  return {
    recipientOrderCooldownMinutes: clampInt(raw.recipientOrderCooldownMinutes, base.recipientOrderCooldownMinutes, 1, 10),
    referralRewardGhs: clampNum(raw.referralRewardGhs, base.referralRewardGhs, 0, 1000),
    supplierRouting: routing,
    contact: {
      supportWhatsApp: typeof raw.contact?.supportWhatsApp === 'string' ? raw.contact.supportWhatsApp.trim() : base.contact.supportWhatsApp,
      whatsappChannelUrl: typeof raw.contact?.whatsappChannelUrl === 'string' ? raw.contact.whatsappChannelUrl.trim() : base.contact.whatsappChannelUrl,
    },
    moolreSms: {
      enabled: typeof raw.moolreSms?.enabled === 'boolean' ? raw.moolreSms.enabled : base.moolreSms.enabled,
      senderId: typeof raw.moolreSms?.senderId === 'string' ? raw.moolreSms.senderId.trim().slice(0, 11) : base.moolreSms.senderId,
    },
    smsTemplates: {
      paymentReceived: typeof raw.smsTemplates?.paymentReceived === 'string' ? raw.smsTemplates.paymentReceived.slice(0, 320) : base.smsTemplates.paymentReceived,
      orderFulfilled: typeof raw.smsTemplates?.orderFulfilled === 'string' ? raw.smsTemplates.orderFulfilled.slice(0, 320) : base.smsTemplates.orderFulfilled,
      walletTopUpAdmin: typeof raw.smsTemplates?.walletTopUpAdmin === 'string' ? raw.smsTemplates.walletTopUpAdmin.slice(0, 320) : base.smsTemplates.walletTopUpAdmin,
    },
    shopBanners: normalizeShopBanners(raw.shopBanners),
  };
}

function normalizeShopBanners(input: unknown): ShopBanner[] {
  if (!Array.isArray(input) || input.length === 0) return DEFAULT_SHOP_BANNERS;
  const banners: ShopBanner[] = [];
  for (const item of input) {
    if (!item || typeof item !== 'object') continue;
    const raw = item as Partial<ShopBanner>;
    const title = typeof raw.title === 'string' ? raw.title.trim().slice(0, 80) : '';
    const description = typeof raw.description === 'string' ? raw.description.trim().slice(0, 200) : '';
    if (!title) continue;
    banners.push({
      id: typeof raw.id === 'string' && raw.id ? raw.id : `banner-${banners.length + 1}`,
      title,
      description,
      active: typeof raw.active === 'boolean' ? raw.active : true,
    });
  }
  return banners.length ? banners.slice(0, 6) : DEFAULT_SHOP_BANNERS;
}
