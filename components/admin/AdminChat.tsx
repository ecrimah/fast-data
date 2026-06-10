'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, Send, X, Shield, Loader2 } from 'lucide-react';
import { adminFetch } from '@/lib/api/admin-client';

type ChatMessage = {
  role: 'user' | 'assistant';
  text: string;
};

export const AdminChat: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      text: "Tay Ops online. I can check the queue, fulfill orders, match MoMo payments, search customers, adjust wallets, and review analytics. Try \"Check queue\" or \"Show pending orders\".",
    },
  ]);
  const [quickReplies, setQuickReplies] = useState([
    'Check queue',
    'Pending orders',
    'Unmatched MoMo',
    'Analytics',
  ]);
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
    window.addEventListener('open-tay-admin-chat', openChat);
    window.addEventListener('open-tay-chat', openChat);
    return () => {
      window.removeEventListener('open-tay-admin-chat', openChat);
      window.removeEventListener('open-tay-chat', openChat);
    };
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

        const data = await adminFetch('/api/admin/chat', {
          method: 'POST',
          body: JSON.stringify({ messages: history }),
        });

        const response =
          data.response || data.error || "I couldn't process that request right now.";

        setMessages((prev) => [...prev, { role: 'assistant', text: response }]);

        if (Array.isArray(data.quickReplies) && data.quickReplies.length) {
          setQuickReplies(data.quickReplies);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Connection failed';
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            text: msg.includes('Sign in') ? 'Sign in as admin to use Tay Ops.' : `Error: ${msg}`,
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [loading, messages]
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
          isOpen ? 'bg-red-600' : 'bg-slate-900 ring-2 ring-amber-500/40'
        }`}
        aria-label={isOpen ? 'Close Tay Ops' : 'Open Tay Ops'}
      >
        {isOpen ? <X className="text-white" /> : <MessageCircle className="text-amber-400" />}
      </button>

      {isOpen && (
        <div
          className="fixed z-50 flex flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl animate-fade-in-up
            inset-x-4 bottom-[5.5rem] max-h-[min(560px,calc(100dvh-6.5rem))]
            sm:inset-x-auto sm:right-6 sm:bottom-24 sm:w-[22rem] md:w-96"
        >
          <div className="flex shrink-0 items-center gap-3 border-b border-slate-700 bg-slate-950 p-4">
            <div className="rounded-full bg-amber-500/20 p-2">
              <Shield className="text-amber-400" size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="truncate font-bold text-white">Tay Ops</h3>
              <p className="text-xs text-amber-400/80">Admin operations · Fast Data Services</p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 sm:hidden"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto bg-slate-900 p-4">
            <div className="flex flex-col gap-3">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[90%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? 'rounded-br-md bg-amber-500 text-slate-950'
                        : 'rounded-bl-md border border-slate-700 bg-slate-800 text-slate-100'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="rounded-2xl border border-slate-700 bg-slate-800 px-4 py-3">
                    <Loader2 className="animate-spin text-amber-400" size={16} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {quickReplies.length > 0 && !loading && (
            <div className="flex shrink-0 gap-2 overflow-x-auto border-t border-slate-700 bg-slate-950 px-3 py-2">
              {quickReplies.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => sendMessage(q)}
                  className="shrink-0 rounded-full border border-slate-600 bg-slate-800 px-3 py-1 text-[11px] font-semibold text-amber-400 hover:border-amber-500/50"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={handleSend} className="flex shrink-0 gap-2 border-t border-slate-700 bg-slate-950 p-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Tay Ops — queue, fulfill, MoMo..."
              className="min-w-0 flex-1 rounded-full border border-slate-600 bg-slate-800 px-4 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="shrink-0 rounded-full bg-amber-500 p-2.5 text-slate-950 disabled:opacity-50"
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
