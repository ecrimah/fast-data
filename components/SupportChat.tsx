'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, Send, X, Bot, Loader2, CreditCard, Package } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import { cn } from '@/lib/utils';

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

type ViewportFrame = {
  top: number;
  left: number;
  width: number;
  height: number;
};

function isMobileViewport() {
  return typeof window !== 'undefined' && window.matchMedia('(max-width: 639px)').matches;
}

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
  const [inputFocused, setInputFocused] = useState(false);
  const [mobileFrame, setMobileFrame] = useState<ViewportFrame | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollLockY = useRef(0);

  const scrollToBottom = useCallback((smooth = true) => {
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({
        behavior: smooth ? 'smooth' : 'auto',
        block: 'end',
      });
    });
  }, []);

  useEffect(() => {
    if (isOpen) scrollToBottom(false);
  }, [messages, isOpen, loading, scrollToBottom]);

  useEffect(() => {
    if (!isOpen) {
      setMobileFrame(null);
      setInputFocused(false);
      return;
    }

    const mobile = isMobileViewport();
    scrollLockY.current = window.scrollY;

    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';

    if (mobile) {
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollLockY.current}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.width = '100%';
    }

    const vv = window.visualViewport;
    const syncViewport = () => {
      if (!mobile || !vv) return;
      setMobileFrame({
        top: vv.offsetTop,
        left: vv.offsetLeft,
        width: vv.width,
        height: vv.height,
      });
    };

    syncViewport();
    vv?.addEventListener('resize', syncViewport);
    vv?.addEventListener('scroll', syncViewport);

    return () => {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.width = '';
      window.scrollTo(0, scrollLockY.current);
      vv?.removeEventListener('resize', syncViewport);
      vv?.removeEventListener('scroll', syncViewport);
    };
  }, [isOpen]);

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

  const closeChat = () => setIsOpen(false);

  const mobilePanelStyle: React.CSSProperties | undefined = mobileFrame
    ? {
        top: mobileFrame.top,
        left: mobileFrame.left,
        width: mobileFrame.width,
        height: mobileFrame.height,
      }
    : undefined;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'fixed bottom-4 right-4 z-50 rounded-full p-4 shadow-lg transition-all duration-300 sm:bottom-6 sm:right-6',
          isOpen ? 'max-sm:hidden bg-red-600' : 'gradient-accent shadow-gold/30 animate-pop-in'
        )}
        aria-label={isOpen ? 'Close chat' : 'Open chat'}
      >
        {isOpen ? <X className="text-white" /> : <MessageCircle className="text-white" />}
      </button>

      {isOpen && (
        <>
          {/* Opaque backdrop — blocks shop/page bleeding through on mobile */}
          <div
            className="fixed inset-0 z-[69] bg-[#081F3F] max-sm:block sm:hidden"
            aria-hidden
            onClick={closeChat}
          />

          <div
            className={cn(
              'fixed z-[70] flex flex-col overflow-hidden bg-white touch-manipulation',
              !mobileFrame && 'max-sm:inset-0 max-sm:animate-chat-slide-up',
              'sm:inset-auto sm:right-6 sm:bottom-24 sm:left-auto sm:top-auto sm:h-[min(560px,calc(100dvh-8rem))] sm:w-[22rem] sm:max-h-none sm:rounded-2xl sm:border sm:border-border sm:shadow-2xl sm:animate-pop-in md:w-96'
            )}
            style={mobilePanelStyle}
            role="dialog"
            aria-modal="true"
            aria-label="Chat with Tay"
          >
            <div className="flex shrink-0 items-center gap-3 bg-royal px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:p-4">
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
                onClick={closeChat}
                className="rounded-lg p-2 text-white/80 hover:bg-white/10"
                aria-label="Close chat"
              >
                <X size={20} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-slate-50 p-4">
              <div className="flex flex-col gap-3 pb-2">
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

            {quickReplies.length > 0 && !loading && !inputFocused && (
              <div className="flex shrink-0 gap-2 overflow-x-auto border-t border-border bg-white px-3 py-2">
                {quickReplies.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => sendMessage(q)}
                    className="shrink-0 rounded-full border border-border bg-slate-50 px-3 py-1.5 text-[11px] font-semibold text-royal transition hover:border-gold/40 hover:bg-gold/5 active:scale-95"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            <form
              onSubmit={handleSend}
              className="shrink-0 border-t border-border bg-white p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
            >
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  enterKeyHint="send"
                  autoComplete="off"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onFocus={() => {
                    setInputFocused(true);
                    setTimeout(() => scrollToBottom(false), 150);
                    setTimeout(() => scrollToBottom(false), 400);
                  }}
                  onBlur={() => setInputFocused(false)}
                  placeholder="Ask Tay — buy data, track order..."
                  className="min-w-0 flex-1 rounded-full border border-border bg-slate-50 px-4 py-3 text-base outline-none focus:border-gold focus:ring-2 focus:ring-gold/30 sm:py-2.5 sm:text-sm"
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="shrink-0 rounded-full gradient-accent p-3 text-white disabled:opacity-50 active:scale-95 sm:p-2.5"
                  aria-label="Send"
                >
                  <Send size={18} />
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </>
  );
};
