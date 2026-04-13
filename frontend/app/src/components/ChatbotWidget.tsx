import { useEffect, useRef, useState, type FormEvent } from 'react';
import { MessageCircle, Send, X, Bot } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { api } from '@/services/api';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  chart?: string | null;
};

const CHATBOT_COPY = {
  fr: {
    greeting:
      "Bonjour ! Je suis votre assistant IA. Posez-moi une question sur vos **ventes**, **produits** ou **clients**.",
    noAnswer: 'Pas de reponse disponible.',
    error: 'Une erreur est survenue.',
    title: 'Assistant IA',
    thinking: 'Reflexion en cours...',
    online: 'En ligne',
    close: 'Fermer le chat',
    chartAlt: 'Graphique',
    placeholder: 'Ecrire un message...',
    open: 'Ouvrir le chat',
  },
  en: {
    greeting:
      "Hello! I'm your AI assistant. Ask me a question about your **sales**, **products**, or **clients**.",
    noAnswer: 'No answer available.',
    error: 'An error occurred.',
    title: 'AI Assistant',
    thinking: 'Thinking...',
    online: 'Online',
    close: 'Close chat',
    chartAlt: 'Chart',
    placeholder: 'Write a message...',
    open: 'Open chat',
  },
} as const;

function sanitizeHistory(messages: ChatMessage[]) {
  return messages.map((m) => ({ role: m.role, content: m.content }));
}

function AssistantContent({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => (
          <p className="mb-1 last:mb-0 text-foreground">{children}</p>
        ),
        strong: ({ children }) => (
          <strong className="font-semibold text-foreground">{children}</strong>
        ),
        ul: ({ children }) => (
          <ul className="mt-1 mb-1 list-none space-y-0.5 pl-0">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="mt-1 mb-1 list-none space-y-0.5 pl-0">{children}</ol>
        ),
        li: ({ children }) => (
          <li className="flex items-start gap-1.5">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
            <span>{children}</span>
          </li>
        ),
        h1: ({ children }) => (
          <h1 className="mb-1 text-sm font-bold text-foreground">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="mb-1 text-sm font-semibold text-foreground">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="mb-0.5 text-sm font-semibold text-foreground">{children}</h3>
        ),
        code: ({ children }) => (
          <code className="rounded bg-muted px-1 text-xs font-mono text-foreground">
            {children}
          </code>
        ),
        hr: () => <hr className="my-2 border-border" />,
        table: ({ children }) => (
          <div className="my-2 w-full overflow-x-auto rounded-lg border border-border">
            <table className="w-full border-collapse text-xs">{children}</table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="bg-blue-50 text-slate-700 dark:bg-slate-800 dark:text-slate-100">
            {children}
          </thead>
        ),
        tbody: ({ children }) => (
          <tbody className="divide-y divide-border">{children}</tbody>
        ),
        tr: ({ children }) => (
          <tr className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/70">
            {children}
          </tr>
        ),
        th: ({ children }) => (
          <th className="border-b border-border px-2 py-2 text-left font-semibold text-slate-700 dark:text-slate-100">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="max-w-[120px] break-words px-2 py-1.5 text-slate-600 dark:text-slate-300">
            {children}
          </td>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

export function ChatbotWidget() {
  const { i18n } = useTranslation();
  const currentLanguage = i18n.resolvedLanguage === 'en' ? 'en' : 'fr';
  const copy = CHATBOT_COPY[currentLanguage];
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 'm0', role: 'assistant', content: copy.greeting },
  ]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMessages((prev) => {
      if (prev.length === 1 && prev[0]?.id === 'm0') {
        return [{ id: 'm0', role: 'assistant', content: copy.greeting }];
      }
      return prev;
    });
  }, [copy.greeting]);

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
      const data = await api.askAssistant(
        trimmed,
        sanitizeHistory(updatedMessages),
        currentLanguage
      );
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-assistant`,
          role: 'assistant',
          content: data.answer ?? copy.noAnswer,
          chart: data.chart ?? null,
        },
      ]);
    } catch (err: unknown) {
      console.error('Chat error:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-error`,
          role: 'assistant',
          content: `Error: ${err instanceof Error ? err.message : copy.error}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-[420px] max-w-[calc(100vw-3rem)]">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
            <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{copy.title}</p>
                    <div className="flex items-center gap-1">
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          loading ? 'animate-pulse bg-amber-300' : 'bg-emerald-300'
                        }`}
                      />
                      <p className="text-xs text-white/80">
                        {loading ? copy.thinking : copy.online}
                      </p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="rounded p-1 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                  aria-label={copy.close}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <ScrollArea className="h-[440px] bg-slate-50 dark:bg-slate-900">
              <div className="space-y-4 px-3 py-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex w-full gap-2 ${
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {message.role === 'assistant' && (
                      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100">
                        <Bot className="h-3.5 w-3.5 text-blue-600" />
                      </div>
                    )}

                    <div
                      className={`min-w-0 overflow-hidden rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm ${
                        message.role === 'user'
                          ? 'max-w-[75%] break-words rounded-br-sm bg-blue-600 text-white'
                          : 'w-full rounded-bl-sm border border-slate-100 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100'
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
                          alt={copy.chartAlt}
                          className="mt-2 w-full rounded-lg border border-slate-100 dark:border-slate-800"
                        />
                      )}
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="flex justify-start gap-2">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100">
                      <Bot className="h-3.5 w-3.5 text-blue-600" />
                    </div>
                    <div className="rounded-2xl rounded-bl-sm border border-slate-100 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                      <div className="flex items-center gap-1">
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:0ms]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:150ms]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:300ms]" />
                      </div>
                    </div>
                  </div>
                )}

                <div ref={bottomRef} />
              </div>
            </ScrollArea>

            <form
              onSubmit={handleSend}
              className="border-t border-slate-100 bg-white p-3 dark:border-slate-800 dark:bg-slate-950"
            >
              <div className="flex items-center gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={copy.placeholder}
                  disabled={loading}
                  className="flex-1 rounded-full border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 placeholder:text-slate-500 focus:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-400 dark:focus:bg-slate-950"
                />
                <Button
                  type="submit"
                  size="icon"
                  className="h-9 w-9 shrink-0 rounded-full bg-blue-600 hover:bg-blue-700"
                  disabled={loading || !input.trim()}
                >
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Button
        className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full bg-blue-600 shadow-lg transition-transform hover:scale-105 hover:bg-blue-700"
        size="icon"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={isOpen ? copy.close : copy.open}
      >
        {isOpen ? (
          <X className="h-6 w-6 text-white" />
        ) : (
          <MessageCircle className="h-6 w-6 text-white" />
        )}
      </Button>
    </>
  );
}
