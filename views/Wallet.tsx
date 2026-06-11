'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, Transaction } from '../types';
import { getTransactions } from '../services/supabaseDatabase';
import { supabase } from '../services/supabaseClient';
import { Plus, ArrowUpRight, ArrowDownLeft, RefreshCcw, CreditCard, Wifi } from 'lucide-react';

interface WalletProps {
  user: User | null;
  refreshUser: () => void;
}

export const Wallet: React.FC<WalletProps> = ({ user }) => {
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);
  const [amount, setAmount] = useState('');

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    fetchTx();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchTx = async () => {
    if (user) {
      const data = await getTransactions(user.id);
      setTransactions(data);
    }
  };

  const handleTopUp = async () => {
    if (!user || !amount) return;
    setLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Please sign in again');

      const res = await fetch('/api/wallet/topup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ amount: parseFloat(amount) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Top-up failed');

      alert(data.message || 'Top-up request submitted. Pay via MoMo — admin will credit your wallet after confirmation.');
      fetchTx();
      setIsTopUpOpen(false);
      setAmount('');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Top-up failed');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in-up">
      <div className="flex flex-col md:flex-row gap-8 items-start">
        
        {/* Digital Card */}
        <div className="w-full md:w-2/3">
          <div className="relative overflow-hidden rounded-3xl bg-slate-900 text-white shadow-2xl transition-transform hover:scale-[1.01] duration-500 group">
             {/* Card Background Gradients */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 z-0"></div>
            <div className="absolute top-0 right-0 w-80 h-80 bg-brand-500/20 rounded-full blur-3xl -mr-20 -mt-20 z-0"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl -ml-20 -mb-20 z-0"></div>
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 z-0"></div>

            <div className="relative z-10 p-8 flex flex-col justify-between h-64">
              <div className="flex justify-between items-start">
                <div>
                   <p className="text-slate-400 text-xs font-mono uppercase tracking-widest mb-1">Total Balance</p>
                   <h1 className="text-4xl font-bold tracking-tight">GH₵ {user.wallet_balance.toFixed(2)}</h1>
                </div>
                <Wifi className="text-slate-500 rotate-90" />
              </div>

              <div className="flex justify-between items-end">
                <div>
                  <div className="flex space-x-2 mb-4">
                     <div className="w-12 h-8 bg-yellow-500/80 rounded-md"></div> {/* Chip */}
                  </div>
                  <p className="font-mono text-lg tracking-widest text-slate-300">•••• •••• •••• {user.phone ? user.phone.slice(-4) : '1234'}</p>
                  <p className="text-sm text-slate-400 mt-1 uppercase">{user.name}</p>
                </div>
                <div className="text-right">
                   <p className="text-xs text-slate-500 font-bold uppercase">Valid Thru</p>
                   <p className="text-sm font-mono">12/28</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="w-full md:w-1/3 flex flex-col gap-4">
          <button 
            onClick={() => setIsTopUpOpen(true)}
            className="flex-1 bg-brand-600 hover:bg-brand-700 text-white rounded-2xl p-6 shadow-lg shadow-brand-500/30 transition-all flex flex-col items-center justify-center gap-3 group"
          >
            <div className="bg-white/20 p-3 rounded-full group-hover:scale-110 transition-transform">
              <Plus size={24} />
            </div>
            <span className="font-bold">Top Up Wallet</span>
          </button>
          
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
             <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">Monthly Spend</p>
             <p className="text-2xl font-bold text-slate-900 dark:text-white">GH₵ 0.00</p>
          </div>
        </div>
      </div>

      {/* Top Up Modal (Inline) */}
      {isTopUpOpen && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-brand-200 dark:border-brand-900 shadow-xl shadow-brand-900/5 animate-fade-in-up">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
              <CreditCard size={20} className="text-brand-600" />
              Add Funds via Paystack
            </h3>
            <button onClick={() => setIsTopUpOpen(false)} className="text-slate-400 hover:text-slate-600">Close</button>
          </div>
          <div className="flex gap-4">
            <input 
              type="number" 
              value={amount} 
              onChange={(e) => setAmount(e.target.value)} 
              placeholder="Amount (e.g. 50)" 
              className="flex-grow border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl px-4 py-3 focus:ring-2 focus:ring-brand-500 outline-none text-lg"
            />
            <button 
              onClick={handleTopUp}
              disabled={loading || !amount}
              className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-8 py-3 rounded-xl font-bold hover:opacity-90 disabled:opacity-50 transition-all"
            >
              {loading ? 'Processing...' : 'Pay Now'}
            </button>
          </div>
        </div>
      )}

      {/* Transactions */}
      <div className="pt-4">
        <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
          <RefreshCcw size={18} className="text-slate-400" />
          <span>Recent Activity</span>
        </h2>
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
          {transactions.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center">
              <div className="bg-slate-100 dark:bg-slate-700 p-4 rounded-full mb-3">
                 <RefreshCcw className="text-slate-400" size={24} />
              </div>
              <p className="text-slate-500 dark:text-slate-400 font-medium">No transactions yet.</p>
              <p className="text-xs text-slate-400 mt-1">Top up your wallet to get started.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {transactions.map(tx => (
                <div key={tx.id} className="p-5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group">
                  <div className="flex items-center space-x-4">
                    <div className={`p-3 rounded-xl transition-colors ${
                      tx.amount > 0 
                        ? 'bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400' 
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 group-hover:bg-red-100 group-hover:text-red-600 dark:group-hover:bg-red-900/20 dark:group-hover:text-red-400'
                    }`}>
                      {tx.amount > 0 ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white capitalize">{tx.type === 'purchase' ? 'Data Bundle Purchase' : tx.type === 'topup' ? 'Wallet Top Up' : tx.type}</p>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">{new Date(tx.created_at).toLocaleDateString()} • {new Date(tx.created_at).toLocaleTimeString()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                     <span className={`font-bold text-lg ${tx.amount > 0 ? 'text-green-600 dark:text-green-400' : 'text-slate-900 dark:text-white'}`}>
                        {tx.amount > 0 ? '+' : ''}{tx.amount.toFixed(2)}
                     </span>
                     <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">GHS</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};