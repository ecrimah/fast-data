import { User, Order, Transaction, UserRole, PaymentStatus, DeliveryStatus, Network } from '../types';
import { PRICE_PER_GB } from '../constants';
import { SITE } from '@/lib/brand';

// Keys for LocalStorage
const USERS_KEY = 'fds_users';
const ORDERS_KEY = 'fds_orders';
const TX_KEY = 'fds_transactions';
const CURRENT_USER_KEY = 'fds_current_user';
const SETTINGS_KEY = 'fds_settings';

// Helper to simulate network delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Initial Admin User
const adminUser: User = {
  id: 'admin-123',
  email: SITE.adminDemoEmail,
  name: 'Super Admin',
  role: UserRole.ADMIN,
  wallet_balance: 1000,
  referral_code: 'ADMIN1',
  created_at: new Date().toISOString()
};

// --- Auth Services ---

export const getSession = async (): Promise<User | null> => {
  const stored = localStorage.getItem(CURRENT_USER_KEY);
  return stored ? JSON.parse(stored) : null;
};

export const signIn = async (email: string, password: string): Promise<User> => {
  await delay(800);
  
  if (email === SITE.adminDemoEmail && password === 'admin123') {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(adminUser));
    return adminUser;
  }

  const users: User[] = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  const user = users.find(u => u.email === email);
  
  // Mock password check (accept any password for test users if they exist)
  if (user) {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    return user;
  }
  
  throw new Error('Invalid credentials');
};

export const signUp = async (email: string, name: string, phone: string): Promise<User> => {
  await delay(1000);
  const users: User[] = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  
  if (users.find(u => u.email === email)) {
    throw new Error('User already exists');
  }

  const newUser: User = {
    id: Math.random().toString(36).substr(2, 9),
    email,
    name,
    phone,
    role: UserRole.USER,
    wallet_balance: 0,
    referral_code: Math.random().toString(36).substr(2, 6).toUpperCase(),
    created_at: new Date().toISOString()
  };

  users.push(newUser);
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(newUser));
  return newUser;
};

export const signOut = async () => {
  localStorage.removeItem(CURRENT_USER_KEY);
};

// --- Settings Services ---

export const getPricePerGb = async (): Promise<number> => {
  const settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
  return settings.pricePerGb !== undefined ? settings.pricePerGb : PRICE_PER_GB;
};

export const updatePricePerGb = async (price: number): Promise<void> => {
  await delay(500);
  const settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
  settings.pricePerGb = price;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
};

export const getReferralsEnabled = async (): Promise<boolean> => {
  const settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
  return settings.referralsEnabled !== undefined ? settings.referralsEnabled : false;
};

export const setReferralsEnabled = async (enabled: boolean): Promise<void> => {
  await delay(500);
  const settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
  settings.referralsEnabled = enabled;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
};

// --- Data Services ---

export const getUserWallet = async (userId: string): Promise<number> => {
  if (userId === adminUser.id) return adminUser.wallet_balance;
  const users: User[] = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  const user = users.find(u => u.id === userId);
  return user ? user.wallet_balance : 0;
};

export const createOrder = async (
  user: User, 
  network: Network, 
  size: number, 
  phone: string, 
  paymentMethod: 'wallet' | 'paystack'
): Promise<Order> => {
  await delay(1200); // Simulate processing

  const currentPrice = await getPricePerGb();
  const amount = size * currentPrice;
  
  const orders: Order[] = JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]');
  const users: User[] = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  
  // If wallet, check balance
  if (paymentMethod === 'wallet') {
    const userIndex = users.findIndex(u => u.id === user.id);
    if (userIndex === -1 && user.id !== adminUser.id) throw new Error('User not found');
    
    // Check against live DB balance, not session
    const currentUser = user.id === adminUser.id ? adminUser : users[userIndex];
    if (currentUser.wallet_balance < amount) {
      throw new Error('Insufficient wallet balance');
    }
    
    // Deduct
    currentUser.wallet_balance -= amount;
    if (user.id !== adminUser.id) {
      users[userIndex] = currentUser;
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
    }
    
    // Update session
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(currentUser));
    
    // Log Transaction
    const tx: Transaction = {
      id: Math.random().toString(36).substr(2, 9),
      user_id: user.id,
      type: 'purchase',
      amount: -amount,
      status: 'completed',
      reference: `ORD-${Date.now()}`,
      created_at: new Date().toISOString()
    };
    const txs: Transaction[] = JSON.parse(localStorage.getItem(TX_KEY) || '[]');
    txs.unshift(tx);
    localStorage.setItem(TX_KEY, JSON.stringify(txs));
  }

  const newOrder: Order = {
    id: Math.random().toString(36).substr(2, 9),
    user_id: user.id,
    network,
    bundle_size: `${size} GB`,
    amount,
    phone,
    payment_ref: `PAY-${Date.now()}`,
    payment_status: PaymentStatus.PAID, // Assume successful for mock
    delivery_status: DeliveryStatus.PENDING,
    created_at: new Date().toISOString(),
    payment_method: paymentMethod
  };

  orders.unshift(newOrder); // Add to top
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
  
  return newOrder;
};

export const getOrders = async (userId?: string): Promise<Order[]> => {
  await delay(500);
  const orders: Order[] = JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]');
  if (userId) {
    return orders.filter(o => o.user_id === userId);
  }
  return orders;
};

export const fulfillOrder = async (orderId: string): Promise<void> => {
  await delay(500);
  const orders: Order[] = JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]');
  const index = orders.findIndex(o => o.id === orderId);
  if (index !== -1) {
    orders[index].delivery_status = DeliveryStatus.DELIVERED;
    localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
  }
};

export const topUpWallet = async (user: User, amount: number): Promise<void> => {
  await delay(1000);
  const users: User[] = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  const userIndex = users.findIndex(u => u.id === user.id);
  
  if (userIndex !== -1) {
    users[userIndex].wallet_balance += amount;
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(users[userIndex]));

    // Log Tx
    const tx: Transaction = {
      id: Math.random().toString(36).substr(2, 9),
      user_id: user.id,
      type: 'topup',
      amount: amount,
      status: 'completed',
      reference: `TOP-${Date.now()}`,
      created_at: new Date().toISOString()
    };
    const txs: Transaction[] = JSON.parse(localStorage.getItem(TX_KEY) || '[]');
    txs.unshift(tx);
    localStorage.setItem(TX_KEY, JSON.stringify(txs));
  }
};

export const getTransactions = async (userId: string): Promise<Transaction[]> => {
  const txs: Transaction[] = JSON.parse(localStorage.getItem(TX_KEY) || '[]');
  return txs.filter(t => t.user_id === userId);
};