import React, { useState, useRef, useEffect } from 'react';
import { api } from '../../services/api';
import { ClientAIAssistantService } from '../../services/aiAssistantService';
import { MarkdownMessage } from '../common/MarkdownMessage';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

const INITIAL_MESSAGES: Message[] = [
  {
    id: 'msg_welcome',
    role: 'assistant',
    text: "Hello! I'm your **SignBridge ISL Assistant** 🤟. I can help with ISL signs, learning concepts, camera recognition, practice, assessments, accessibility, and general questions about using SignBridge.\n\nAsk your question in your own words — you do not need to use a fixed template.",
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
];

const SUGGESTIONS = [
  "How do I sign WATER in ISL?",
  "How do I perform HELLO?",
  "Can the camera recognize POLICE?",
  "What is the passing score for Level 1?",
  "How many signs are in the dictionary?"
];

export const AIAssistantModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const handleSend = async (queryText?: string) => {
    const textToSend = queryText || inputText;
    if (!textToSend.trim() || isLoading) return;

    const userMsg: Message = {
      id: `usr_${Date.now()}`,
      role: 'user',
      text: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!queryText) setInputText('');
    setIsLoading(true);

    try {
      // Try backend assistant query first with conversation history
      let replyText = '';
      let timeoutHandle: number | undefined;
      try {
        const historyPayload = messages.slice(-6).map(m => ({
          role: m.role,
          text: m.text
        }));

        const timeoutPromise = new Promise<{ success: boolean }>((_, reject) =>
          timeoutHandle = window.setTimeout(() => reject(new Error('The assistant took too long to respond.')), 12000)
        );
        const res: any = await Promise.race([
          api.queryAIAssistant(userMsg.text, historyPayload),
          timeoutPromise
        ]);
        if (res && res.success && res.data?.reply) {
          replyText = res.data.reply;
        }
      } catch {
        // Fallback to grounded client knowledge engine when the API is unavailable.
      } finally {
        if (timeoutHandle !== undefined) window.clearTimeout(timeoutHandle);
      }

      // If backend was unreachable or returned empty, generate grounded client answer
      if (!replyText) {
        replyText = ClientAIAssistantService.answerQuery(userMsg.text);
      }

      const aiMsg: Message = {
        id: `ai_${Date.now()}`,
        role: 'assistant',
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch {
      // Guaranteed safe fallback
      const fallbackReply = ClientAIAssistantService.answerQuery(userMsg.text);
      const aiMsg: Message = {
        id: `ai_${Date.now()}`,
        role: 'assistant',
        text: fallbackReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, aiMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 dark:bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-2xl w-full max-w-xl h-[620px] flex flex-col shadow-2xl overflow-hidden transition-colors">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-cyan-500 flex items-center justify-center text-xl shadow-md shadow-cyan-500/20 text-white">
              🤖
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                <span>SignBridge AI Assistant</span>
                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-500/30">
                  Grounded
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">ISL Guidance, Sign Instructions & Practice Support</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white flex items-center justify-center transition"
          >
            ✕
          </button>
        </div>

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 dark:bg-slate-950/50">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-cyan-600 text-white rounded-br-none shadow-md'
                    : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700/60 rounded-bl-none shadow-sm whitespace-pre-line'
                }`}
              >
                <MarkdownMessage content={msg.text} />
              </div>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 px-1">{msg.timestamp}</span>
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center space-x-2 text-slate-500 dark:text-slate-400 text-xs py-2">
              <div className="w-2 h-2 rounded-full bg-cyan-600 dark:bg-cyan-400 animate-bounce" />
              <div className="w-2 h-2 rounded-full bg-cyan-600 dark:bg-cyan-400 animate-bounce [animation-delay:0.2s]" />
              <div className="w-2 h-2 rounded-full bg-cyan-600 dark:bg-cyan-400 animate-bounce [animation-delay:0.4s]" />
              <span>Checking SignBridge guidance and verified sign references...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="p-2.5 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800/80 overflow-x-auto flex gap-2 no-scrollbar">
          {SUGGESTIONS.map((s, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(s)}
              className="text-xs px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-cyan-300 border border-slate-200 dark:border-slate-700 whitespace-nowrap transition"
            >
              {s}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center space-x-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask about a sign, exam passing rules, or practice tips..."
            className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
          />
          <button
            onClick={() => handleSend()}
            disabled={!inputText.trim() || isLoading}
            className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-semibold text-sm transition shadow-md shadow-cyan-600/20"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};
