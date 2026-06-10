import { supabase, isSupabaseConfigured } from './supabaseClient';
import { User, Order, Transaction, UserRole, PaymentStatus, DeliveryStatus, Network } from '../types';
import { PRICE_PER_GB } from '../constants';
import { SITE } from '@/lib/brand';

// --- Auth Services ---

const notConfigured = () =>
  new Error(
    'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.'
  );

export const getSession = async (): Promise<User | null> => {
  if (!isSupabaseConfigured) return null;
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return null;

  // Get user profile from profiles table
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();

  if (!profile) return null;

  return {
    id: profile.id,
    email: session.user.email || '',
    name: profile.name || '',
    phone: profile.phone || '',
    role: profile.role || UserRole.USER,
    wallet_balance: profile.wallet_balance || 0,
    referral_code: profile.referral_code || '',
    created_at: profile.created_at
  };
};

export const signIn = async (email: string, password: string): Promise<User> => {
  if (!isSupabaseConfigured) throw notConfigured();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) throw error;
  if (!data.user) throw new Error('Login failed');

  // Get user profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .single();

  if (profileError || !profile) throw new Error('Profile not found');

  return {
    id: profile.id,
    email: profile.email || '',
    name: profile.name || '',
    phone: profile.phone || '',
    role: profile.role || UserRole.USER,
    wallet_balance: profile.wallet_balance || 0,
    referral_code: profile.referral_code || '',
    created_at: profile.created_at
  };
};

export const signUp = async (email: string, name: string, phone: string): Promise<User> => {
  if (!isSupabaseConfigured) throw notConfigured();
  const { data, error } = await supabase.auth.signUp({
    email,
    password: Math.random().toString(36) + 'TempPass123!' // Temporary password
  });

  if (error) throw error;
  if (!data.user) throw new Error('Signup failed');

  // Create profile
  const referralCode = Math.random().toString(36).substr(2, 6).toUpperCase();
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .insert({
      id: data.user.id,
      email,
      name,
      phone,
      role: UserRole.USER,
      wallet_balance: 0,
      referral_code: referralCode
    })
    .select()
    .single();

  if (profileError) throw profileError;

  return {
    id: profile.id,
    email: profile.email,
    name: profile.name,
    phone: profile.phone,
    role: profile.role,
    wallet_balance: profile.wallet_balance,
    referral_code: profile.referral_code,
    created_at: profile.created_at
  };
};

export const signOut = async () => {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

// --- Settings Services ---

export const getPricePerGb = async (): Promise<number> => {
  if (!isSupabaseConfigured) return PRICE_PER_GB;
  const { data, error } = await supabase
    .from('settings')
    .select('price_per_gb')
    .single();

  if (error) return PRICE_PER_GB;
  return data.price_per_gb || PRICE_PER_GB;
};

export const updatePricePerGb = async (price: number): Promise<void> => {
  if (!isSupabaseConfigured) throw notConfigured();
  const { error } = await supabase
    .from('settings')
    .upsert({ id: 1, price_per_gb: price });

  if (error) throw error;
};

export const getReferralsEnabled = async (): Promise<boolean> => {
  if (!isSupabaseConfigured) return false;
  const { data, error } = await supabase
    .from('settings')
    .select('referrals_enabled')
    .single();

  if (error) return false;
  return data.referrals_enabled || false;
};

export const setReferralsEnabled = async (enabled: boolean): Promise<void> => {
  if (!isSupabaseConfigured) throw notConfigured();
  const { error } = await supabase
    .from('settings')
    .upsert({ id: 1, referrals_enabled: enabled });

  if (error) throw error;
};

// --- Data Services ---

async function resolveOrderAmount(network: Network, size: number): Promise<number> {
  const pkgNetwork = network === Network.MTN ? 'MTN' : network === Network.VODAFONE ? 'Telecel' : 'AT';
  const { data: pkg } = await supabase
    .from('data_packages')
    .select('price')
    .eq('network', pkgNetwork)
    .eq('size_gb', size)
    .eq('active', true)
    .maybeSingle();

  if (pkg?.price != null) return Number(pkg.price);

  const currentPrice = await getPricePerGb();
  return +(size * currentPrice).toFixed(2);
}

export const getUserWallet = async (userId: string): Promise<number> => {
  if (!isSupabaseConfigured) return 0;
  const { data, error } = await supabase
    .from('profiles')
    .select('wallet_balance')
    .eq('id', userId)
    .single();

  if (error) return 0;
  return data.wallet_balance || 0;
};

export const createOrder = async (
  user: User,
  network: Network,
  size: number,
  phone: string,
  paymentMethod: 'wallet' | 'paystack' | 'moolre',
  paymentStatus: PaymentStatus = PaymentStatus.PAID
): Promise<Order> => {
  if (!isSupabaseConfigured) throw notConfigured();
  const amount = await resolveOrderAmount(network, size);

  // If wallet payment, check balance and complete immediately
  if (paymentMethod === 'wallet') {
    const balance = await getUserWallet(user.id);
    if (balance < amount) {
      throw new Error('Insufficient wallet balance');
    }

    // Deduct from wallet
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ wallet_balance: balance - amount })
      .eq('id', user.id);

    if (updateError) throw updateError;

    // Log transaction
    const { error: txError } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        type: 'purchase',
        amount: -amount,
        status: 'completed',
        reference: `ORD-${Date.now()}`
      });

    if (txError) throw txError;
  }

  // Create order
  const paymentRef = `${SITE.paymentRefPrefix}-${Date.now()}`;
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      user_id: user.id,
      network,
      bundle_size: `${size} GB`,
      amount,
      phone,
      payment_ref: paymentRef,
      payment_status: paymentStatus,
      delivery_status: DeliveryStatus.PENDING,
      payment_method: paymentMethod
    })
    .select()
    .single();

  if (orderError) throw orderError;

  return order;
};

export const verifyAndCompletePayment = async (reference: string): Promise<Order | null> => {
  if (!isSupabaseConfigured) return null;
  // Find order by payment reference
  const { data: order, error: findError } = await supabase
    .from('orders')
    .select('*')
    .eq('payment_ref', reference)
    .single();

  if (findError || !order) {
    console.error('Order not found for reference:', reference);
    return null;
  }

  if (order.payment_status === PaymentStatus.PAID) {
    console.log('Payment already verified for reference:', reference);
    return order;
  }

  // Update order status to paid
  const { data: updatedOrder, error: updateError } = await supabase
    .from('orders')
    .update({ payment_status: PaymentStatus.PAID })
    .eq('id', order.id)
    .select()
    .single();

  if (updateError) {
    console.error('Failed to update order status:', updateError);
    return null;
  }

  // Log transaction
  const { error: txError } = await supabase
    .from('transactions')
    .insert({
      user_id: order.user_id,
      type: 'purchase',
      amount: -order.amount,
      status: 'completed',
      reference: `TXN-${Date.now()}`
    });

  if (txError) {
    console.error('Failed to log transaction:', txError);
  }

  return updatedOrder;
};

export const getOrders = async (userId?: string): Promise<Order[]> => {
  if (!isSupabaseConfigured) return [];
  let query = supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });

  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

export const fulfillOrder = async (orderId: string): Promise<void> => {
  if (!isSupabaseConfigured) throw notConfigured();
  const { error } = await supabase
    .from('orders')
    .update({ delivery_status: DeliveryStatus.DELIVERED })
    .eq('id', orderId);

  if (error) throw error;
};

export const topUpWallet = async (user: User, amount: number): Promise<void> => {
  if (!isSupabaseConfigured) throw notConfigured();
  const currentBalance = await getUserWallet(user.id);

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ wallet_balance: currentBalance + amount })
    .eq('id', user.id);

  if (updateError) throw updateError;

  // Log transaction
  const { error: txError } = await supabase
    .from('transactions')
    .insert({
      user_id: user.id,
      type: 'topup',
      amount,
      status: 'completed',
      reference: `TOP-${Date.now()}`
    });

  if (txError) throw txError;
};

export const getTransactions = async (userId: string): Promise<Transaction[]> => {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

export const getOrderStatus = async (orderId: string): Promise<Order | null> => {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single();

  if (error) return null;
  return data;
};
