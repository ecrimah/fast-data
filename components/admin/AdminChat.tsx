'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, Send, X, Shield, Loader2 } from 'lucide-react';
import { adminFetch } from '@/lib/api/admin-client';
import { cn } from '@/lib/utils';

type ChatMessage = {
  role: 'user' | 'assistant';
  text: string;
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

export const AdminChat: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      text: 'Tay Ops online. I can check the queue, fulfill orders, match MoMo payments, ping suppliers, manage customers/packages, and review analytics. Try "Check queue" or "Show pending orders".',
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
            text: msg.includes('Sign in') ? 'Sign in as admin to use Tay Ops.' : msg,
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
          isOpen ? 'max-sm:hidden bg-red-600' : 'bg-slate-900 ring-2 ring-amber-500/40 animate-pop-in'
        )}
        aria-label={isOpen ? 'Close Tay Ops' : 'Open Tay Ops'}
      >
        {isOpen ? <X className="text-white" /> : <MessageCircle className="text-amber-400" />}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-[69] bg-slate-950 max-sm:block sm:hidden"
            aria-hidden
            onClick={closeChat}
          />

          <div
            className={cn(
              'fixed z-[70] flex flex-col overflow-hidden bg-slate-900 touch-manipulation',
              !mobileFrame && 'max-sm:inset-0 max-sm:animate-chat-slide-up',
              'sm:inset-auto sm:right-6 sm:bottom-24 sm:left-auto sm:top-auto sm:h-[min(560px,calc(100dvh-8rem))] sm:w-[22rem] sm:max-h-none sm:rounded-2xl sm:border sm:border-slate-700 sm:shadow-2xl sm:animate-pop-in md:w-96'
            )}
            style={mobilePanelStyle}
            role="dialog"
            aria-modal="true"
            aria-label="Tay Ops admin chat"
          >
            <div className="flex shrink-0 items-center gap-3 border-b border-slate-700 bg-slate-950 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:p-4">
              <div className="rounded-full bg-amber-500/20 p-2">
                <Shield className="text-amber-400" size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-bold text-white">Tay Ops</h3>
                <p className="text-xs text-amber-400/80">Admin operations · Fast Data Services</p>
              </div>
              <button
                type="button"
                onClick={closeChat}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-800"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-slate-900 p-4">
              <div className="flex flex-col gap-3 pb-2">
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

            {quickReplies.length > 0 && !loading && !inputFocused && (
              <div className="flex shrink-0 gap-2 overflow-x-auto border-t border-slate-700 bg-slate-950 px-3 py-2">
                {quickReplies.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => sendMessage(q)}
                    className="shrink-0 rounded-full border border-slate-600 bg-slate-800 px-3 py-1.5 text-[11px] font-semibold text-amber-400 hover:border-amber-500/50 active:scale-95"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            <form
              onSubmit={handleSend}
              className="shrink-0 border-t border-slate-700 bg-slate-950 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
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
                  placeholder="Ask Tay Ops — queue, fulfill, MoMo..."
                  className="min-w-0 flex-1 rounded-full border border-slate-600 bg-slate-800 px-4 py-3 text-base text-white outline-none placeholder:text-slate-500 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30 sm:py-2.5 sm:text-sm"
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="shrink-0 rounded-full bg-amber-500 p-3 text-slate-950 disabled:opacity-50 active:scale-95 sm:p-2.5"
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
