'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, Send, X, Bot, Loader2, CreditCard, Package } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';

type ChatAction =
  | { type: 'payment_link'; paymentUrl: string; paymentRef: string; label: string }
  | { type: 'view_order'; order: OrderCard };

type OrderCard = {
  payment_ref: string;
  network: string;
  bundle_size: string;
  amount: number;
  phone: string;
  payment_status: string;
  delivery_status: string;
};

type ChatMessage = {
  role: 'user' | 'assistant';
  text: string;
  actions?: ChatAction[];
  orderCard?: OrderCard;
};

export const SupportChat: React.FC = () => {
  const { user } = useUser();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      text: "Hi, I'm Tay — your Fast Data Services assistant. I can help you buy data bundles, check prices, track orders, and answer questions. Try \"I want 5GB MTN\" or \"Track my order\".",
    },
  ]);
  const [quickReplies, setQuickReplies] = useState(['Show prices', 'Buy 5GB MTN', 'Track order']);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, loading]);

  useEffect(() => {
    const openChat = () => setIsOpen(true);
    window.addEventListener('open-tay-chat', openChat);
    return () => window.removeEventListener('open-tay-chat', openChat);
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || loading) return;

      const userText = text.trim();
      setInput('');
      setMessages((prev) => [...prev, { role: 'user', text: userText }]);
      setLoading(true);

      try {
        const history = [...messages, { role: 'user' as const, text: userText }].map((m) => ({
          role: m.role,
          content: m.text,
        }));

        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: history,
            userId: user?.id,
            userEmail: user?.email,
            walletBalance: user?.wallet_balance,
          }),
        });

        const data = await res.json();
        const response =
          data.response || data.error || "I couldn't process that request right now.";

        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            text: response,
            actions: data.actions,
            orderCard: data.orderCard,
          },
        ]);

        if (Array.isArray(data.quickReplies) && data.quickReplies.length) {
          setQuickReplies(data.quickReplies);
        }
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            text: "I'm having trouble connecting. Please try again later.",
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [loading, messages, user]
  );

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-4 right-4 z-50 rounded-full p-4 shadow-lg transition-all duration-300 sm:bottom-6 sm:right-6 ${
          isOpen ? 'bg-red-600' : 'gradient-accent shadow-gold/30'
        }`}
        aria-label={isOpen ? 'Close chat' : 'Open chat'}
      >
        {isOpen ? <X className="text-white" /> : <MessageCircle className="text-white" />}
      </button>

      {isOpen && (
        <div
          className="fixed z-50 flex flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-2xl animate-fade-in-up
            inset-x-4 bottom-[5.5rem] max-h-[min(560px,calc(100dvh-6.5rem))]
            sm:inset-x-auto sm:right-6 sm:bottom-24 sm:w-[22rem] md:w-96"
        >
          <div className="flex shrink-0 items-center gap-3 bg-royal p-4">
            <div className="rounded-full bg-white/20 p-2">
              <Bot className="text-white" size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="truncate font-bold text-white">Tay</h3>
              <p className="text-xs text-gold-glow">
                Powered by Tay · {user ? `Wallet GH₵${user.wallet_balance.toFixed(2)}` : 'Guest'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-lg p-1.5 text-white/80 hover:bg-white/10 sm:hidden"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50 p-4">
            <div className="flex flex-col gap-3">
              {messages.map((msg, idx) => (
                <div key={idx}>
                  <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[90%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                        msg.role === 'user'
                          ? 'gradient-accent rounded-br-md text-white'
                          : 'rounded-bl-md border border-border bg-white text-slate-800 shadow-sm'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>

                  {msg.orderCard && (
                    <div className="mt-2 ml-1 max-w-[90%] rounded-xl border border-border bg-white p-3 text-xs shadow-sm">
                      <div className="flex items-center gap-2 font-bold text-royal">
                        <Package size={14} />
                        Order {msg.orderCard.payment_ref}
                      </div>
                      <p className="mt-1 text-muted">
                        {msg.orderCard.network} · {msg.orderCard.bundle_size} · {msg.orderCard.phone}
                      </p>
                      <p className="mt-1">
                        GH₵ {msg.orderCard.amount.toFixed(2)} · Pay: {msg.orderCard.payment_status} · Delivery:{' '}
                        {msg.orderCard.delivery_status}
                      </p>
                    </div>
                  )}

                  {msg.actions?.map((action, i) =>
                    action.type === 'payment_link' ? (
                      <a
                        key={i}
                        href={action.paymentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 ml-1 flex max-w-[90%] items-center justify-center gap-2 rounded-xl susu-btn-gold py-3 text-sm"
                      >
                        <CreditCard size={16} />
                        {action.label}
                      </a>
                    ) : null
                  )}
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="rounded-2xl border border-border bg-white px-4 py-3 shadow-sm">
                    <Loader2 className="animate-spin text-royal" size={16} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {quickReplies.length > 0 && !loading && (
            <div className="flex shrink-0 gap-2 overflow-x-auto border-t border-border bg-white px-3 py-2">
              {quickReplies.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => sendMessage(q)}
                  className="shrink-0 rounded-full border border-border bg-slate-50 px-3 py-1 text-[11px] font-semibold text-royal hover:border-gold/40"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={handleSend} className="flex shrink-0 gap-2 border-t border-border bg-white p-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Tay — buy data, track order..."
              className="min-w-0 flex-1 rounded-full border border-border bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-gold focus:ring-2 focus:ring-gold/30"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="shrink-0 rounded-full gradient-accent p-2.5 text-white disabled:opacity-50"
              aria-label="Send"
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      )}
    </>
  );
};
