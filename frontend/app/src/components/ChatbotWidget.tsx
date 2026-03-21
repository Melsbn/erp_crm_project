import { useEffect, useRef, useState, type FormEvent } from 'react';
import { MessageCircle, Send, X, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { api } from '@/services/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  chart?: string | null;
};

const GREETING = "Bonjour ! Je suis votre assistant IA. Posez-moi une question sur vos **ventes**, **produits** ou **clients**.";

const starterMessages: ChatMessage[] = [
  { id: 'm0', role: 'assistant', content: GREETING },
];

function sanitizeHistory(messages: ChatMessage[]) {
  return messages.map((m) => ({ role: m.role, content: m.content }));
}

function AssistantContent({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => (
          <p className="mb-1 last:mb-0">{children}</p>
        ),
        strong: ({ children }) => (
          <strong className="font-semibold text-slate-900">{children}</strong>
        ),
        ul: ({ children }) => (
          <ul className="mt-1 mb-1 space-y-0.5 list-none pl-0">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="mt-1 mb-1 space-y-0.5 list-none pl-0">{children}</ol>
        ),
        li: ({ children }) => (
          <li className="flex gap-1.5 items-start">
            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-blue-400 shrink-0" />
            <span>{children}</span>
          </li>
        ),
        h1: ({ children }) => (
          <h1 className="font-bold text-slate-800 text-sm mb-1">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="font-semibold text-slate-800 text-sm mb-1">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="font-semibold text-slate-700 text-sm mb-0.5">{children}</h3>
        ),
        code: ({ children }) => (
          <code className="bg-slate-200 rounded px-1 text-xs font-mono">{children}</code>
        ),
        hr: () => <hr className="border-slate-200 my-2" />,
        // ── Tables ────────────────────────────────────────────────
        table: ({ children }) => (
          <div className="overflow-x-auto my-2 rounded-lg border border-slate-200 w-full">
            <table className="w-full text-xs border-collapse">{children}</table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="bg-blue-50 text-slate-700">{children}</thead>
        ),
        tbody: ({ children }) => (
          <tbody className="divide-y divide-slate-100">{children}</tbody>
        ),
        tr: ({ children }) => (
          <tr className="hover:bg-slate-50 transition-colors">{children}</tr>
        ),
        th: ({ children }) => (
          <th className="text-left px-2 py-2 font-semibold text-slate-700 border-b border-slate-200">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="px-2 py-1.5 text-slate-600 break-words max-w-[120px]">{children}</td>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

export function ChatbotWidget() {
  const [isOpen, setIsOpen]     = useState(false);
  const [input, setInput]       = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>(starterMessages);
  const [loading, setLoading]   = useState(false);
  const bottomRef               = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMessage: ChatMessage = {
      id: `${Date.now()}-user`,
      role: 'user',
      content: trimmed,
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);

    try {
      const data = await api.askAssistant(trimmed, sanitizeHistory(updatedMessages));
      setMessages((prev) => [
        ...prev,
        {
          id:      `${Date.now()}-assistant`,
          role:    'assistant',
          content: data.answer ?? "Pas de réponse disponible.",
          chart:   data.chart ?? null,
        },
      ]);
    } catch (err: unknown) {
      console.error("Chat error:", err);
      setMessages((prev) => [
        ...prev,
        {
          id:      `${Date.now()}-error`,
          role:    'assistant',
          content: `❌ ${err instanceof Error ? err.message : 'Une erreur est survenue.'}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => setMessages(starterMessages);

  return (
    <>
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-[420px] max-w-[calc(100vw-3rem)]">
          <div className="rounded-2xl shadow-2xl overflow-hidden border border-slate-200 bg-white">

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-500">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Assistant IA</p>
                  <div className="flex items-center gap-1">
                    <span className={`h-1.5 w-1.5 rounded-full ${loading ? 'bg-amber-300 animate-pulse' : 'bg-emerald-300'}`} />
                    <p className="text-xs text-white/80">
                      {loading ? 'Réflexion en cours…' : 'En ligne'}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleClear}
                  className="text-xs text-white/70 hover:text-white px-2 py-1 rounded hover:bg-white/10 transition-colors"
                >
                  Effacer
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-white/70 hover:text-white p-1 rounded hover:bg-white/10 transition-colors"
                  aria-label="Fermer le chat"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="h-[440px] bg-slate-50">
              <div className="px-3 py-4 space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-2 w-full ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {message.role === 'assistant' && (
                      <div className="h-7 w-7 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                        <Bot className="h-3.5 w-3.5 text-blue-600" />
                      </div>
                    )}

                    <div
                      className={`min-w-0 rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm overflow-hidden ${
                        message.role === 'user'
                          ? 'max-w-[75%] bg-blue-600 text-white rounded-br-sm break-words'
                          : 'w-full bg-white text-slate-700 rounded-bl-sm border border-slate-100'
                      }`}
                    >
                      {message.role === 'assistant' ? (
                        <AssistantContent content={message.content} />
                      ) : (
                        message.content
                      )}

                      {message.chart && (
                        <img
                          src={message.chart}
                          alt="Graphique"
                          className="mt-2 rounded-lg w-full border border-slate-100"
                        />
                      )}
                    </div>
                  </div>
                ))}

                {/* Typing indicator */}
                {loading && (
                  <div className="flex gap-2 justify-start">
                    <div className="h-7 w-7 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                      <Bot className="h-3.5 w-3.5 text-blue-600" />
                    </div>
                    <div className="bg-white border border-slate-100 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                      <div className="flex gap-1 items-center">
                        <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0ms]" />
                        <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:150ms]" />
                        <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:300ms]" />
                      </div>
                    </div>
                  </div>
                )}

                <div ref={bottomRef} />
              </div>
            </ScrollArea>

            {/* Input */}
            <form onSubmit={handleSend} className="border-t border-slate-100 p-3 bg-white">
              <div className="flex items-center gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Écrire un message..."
                  disabled={loading}
                  className="flex-1 rounded-full border-slate-200 bg-slate-50 focus:bg-white text-sm px-4"
                />
                <Button
                  type="submit"
                  size="icon"
                  className="bg-blue-600 hover:bg-blue-700 rounded-full shrink-0 h-9 w-9"
                  disabled={loading || !input.trim()}
                >
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating button */}
      <Button
        className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full bg-blue-600 shadow-lg hover:bg-blue-700 transition-transform hover:scale-105"
        size="icon"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={isOpen ? 'Fermer le chat' : 'Ouvrir le chat'}
      >
        {isOpen
          ? <X className="h-6 w-6 text-white" />
          : <MessageCircle className="h-6 w-6 text-white" />
        }
      </Button>
    </>
  );
}