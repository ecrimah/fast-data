'use client';

import React, { useEffect, useState } from 'react';
import { User } from '../types';
import { Copy, Gift, Users, Lock, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getReferralsEnabled } from '../services/supabaseDatabase';

interface ReferralProps {
  user: User | null;
}

export const Referrals: React.FC<ReferralProps> = ({ user }) => {
  const router = useRouter();
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkStatus = async () => {
      const isEnabled = await getReferralsEnabled();
      setEnabled(isEnabled);
      setLoading(false);
    };
    checkStatus();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-brand-600" size={48} />
      </div>
    );
  }

  // Locked State
  if (!enabled) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in-up">
        <div className="bg-slate-100 dark:bg-slate-800 p-8 rounded-full mb-6 relative">
          <Lock className="text-slate-400 dark:text-slate-500 w-16 h-16" />
          <div className="absolute -bottom-2 -right-2 bg-brand-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
            Soon
          </div>
        </div>
        <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-3">Coming Soon</h2>
        <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto">
          Our referral program is currently under construction. Check back later to invite friends and earn rewards!
        </p>
      </div>
    );
  }

  // Not Logged In State (but enabled)
  if (!user) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold mb-4 text-slate-900 dark:text-white">Join our Referral Program</h2>
        <p className="text-slate-600 dark:text-slate-400 mb-6">Sign in to get your unique code and start earning.</p>
        <button onClick={() => router.push('/login')} className="bg-brand-600 text-white px-6 py-2 rounded-lg hover:bg-brand-700 transition-colors">Login Now</button>
      </div>
    );
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(user.referral_code);
    alert('Code copied!');
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-indigo-900 dark:bg-indigo-950 rounded-3xl p-8 md:p-12 text-white text-center mb-8 relative overflow-hidden transition-colors">
        <div className="relative z-10 max-w-2xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">Invite Friends, Earn Data</h1>
          <p className="text-indigo-200 text-lg mb-8">Share your code. When your friend makes their first purchase, you both get 1GB Free Data or equivalent wallet credit.</p>
          
          <div className="bg-white/10 backdrop-blur-md p-2 rounded-xl inline-flex items-center space-x-4 border border-white/20">
            <span className="font-mono text-xl md:text-2xl font-bold tracking-wider px-4">{user.referral_code}</span>
            <button 
              onClick={copyToClipboard}
              className="bg-white text-indigo-900 p-2 rounded-lg hover:bg-indigo-50 transition-colors"
            >
              <Copy size={20} />
            </button>
          </div>
        </div>
        <Gift className="absolute top-10 left-10 text-white/5 w-48 h-48 rotate-12" />
        <Users className="absolute bottom-10 right-10 text-white/5 w-40 h-40 -rotate-12" />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors">
          <h3 className="font-bold text-slate-900 dark:text-white mb-2">How it works</h3>
          <ul className="space-y-4 text-slate-600 dark:text-slate-300">
            <li className="flex gap-3">
              <span className="bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 w-6 h-6 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">1</span>
              <span>Copy your unique referral code above.</span>
            </li>
            <li className="flex gap-3">
              <span className="bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 w-6 h-6 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">2</span>
              <span>Send it to friends. They enter it during signup.</span>
            </li>
            <li className="flex gap-3">
              <span className="bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 w-6 h-6 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">3</span>
              <span>Receive rewards instantly after their first order.</span>
            </li>
          </ul>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors">
          <h3 className="font-bold text-slate-900 dark:text-white mb-4">Your Stats</h3>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg transition-colors">
              <div className="text-2xl font-bold text-brand-600 dark:text-brand-400">0</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 uppercase font-medium">Friends Invited</div>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg transition-colors">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">0 GB</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 uppercase font-medium">Data Earned</div>
            </div>
          </div>
          <div className="mt-6 text-center text-sm text-slate-400">
            Stats update in real-time.
          </div>
        </div>
      </div>
    </div>
  );
};