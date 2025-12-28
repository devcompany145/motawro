
import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { ChatMessage } from '../types';
import { streamBusinessAdvice } from '../services/geminiService';

const GlobalAIAssistant: React.FC = () => {
  const { t, language, dir } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<boolean>(false);

  const welcomeMsg = language === 'ar' 
    ? 'مرحباً! أنا "ليلى"، مساعدتك الرقمية في حي مطورو الأعمال. كيف يمكنني مساعدتك اليوم؟' 
    : 'Hello! I am "Laila", your Digital District assistant. How can I help you navigate the community today?';

  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        id: '0',
        role: 'model',
        text: welcomeMsg,
        timestamp: new Date()
      }]);
    }
  }, [language]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, streamingText, isOpen]);

  const handleSend = async (overrideText?: string) => {
    const textToSend = overrideText || input;
    if (!textToSend.trim() || loading || isStreaming) return;

    abortControllerRef.current = false;
    const userMsg: ChatMessage = { 
      id: Date.now().toString(), 
      role: 'user', 
      text: textToSend, 
      timestamp: new Date() 
    };
    
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setStreamingText('');

    try {
      const history = messages.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.text}`);
      const systemContext = `You are "Laila", the Digital Concierge for the "Business Developers Digital District". 
      Current District Context:
      - We offer virtual offices, AI consulting, and professional mentorship.
      - Users can explore a 3D business map.
      - We provide certified business addresses in Riyadh, KSA.
      Your tone is helpful, professional, and tech-forward.`;

      const stream = streamBusinessAdvice(userMsg.text, [...history, `System context: ${systemContext}`], language);
      
      let fullText = '';
      let isFirstChunk = true;

      for await (const chunk of stream) {
        if (abortControllerRef.current) break;
        if (isFirstChunk) {
          setLoading(false);
          setIsStreaming(true);
          isFirstChunk = false;
        }
        fullText += chunk;
        setStreamingText(fullText);
      }

      if (!abortControllerRef.current) {
        const aiMsg: ChatMessage = { 
          id: (Date.now() + 1).toString(), 
          role: 'model', 
          text: fullText, 
          timestamp: new Date() 
        };
        setMessages(prev => [...prev, aiMsg]);
      }
    } catch (error) {
      console.error("Global Assistant Error:", error);
    } finally {
      setLoading(false);
      setIsStreaming(false);
      setStreamingText('');
    }
  };

  const quickActions = [
    { ar: 'ما هو المكتب الافتراضي؟', en: 'What is a virtual office?' },
    { ar: 'كيف استأجر مكتب؟', en: 'How to rent an office?' },
    { ar: 'تحدث مع مرشد', en: 'Talk to a mentor' }
  ];

  return (
    <div className={`fixed z-[100] transition-all duration-500 ${dir === 'rtl' ? 'left-6' : 'right-6'} bottom-6`}>
      {/* Chat Window */}
      {isOpen && (
        <div className={`absolute bottom-20 ${dir === 'rtl' ? 'left-0' : 'right-0'} w-[350px] md:w-[400px] h-[550px] bg-white rounded-[32px] shadow-elevated border border-slate-100 flex flex-col overflow-hidden animate-slide-up`}>
          {/* Header */}
          <div className="p-6 bg-brand-dark text-white flex justify-between items-center shrink-0">
             <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-brand-primary flex items-center justify-center shadow-lg">
                   <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                   </svg>
                </div>
                <div>
                   <h3 className="font-bold text-sm leading-none">Laila</h3>
                   <span className="text-[10px] text-brand-primary font-mono uppercase tracking-widest">Concierge AI</span>
                </div>
             </div>
             <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
             </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-slate-50/30">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                <div className={`max-w-[85%] p-4 rounded-2xl text-sm font-medium leading-relaxed ${
                  msg.role === 'user' 
                    ? 'bg-brand-primary text-white rounded-br-none' 
                    : 'bg-white text-slate-700 border border-slate-100 shadow-sm rounded-bl-none'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {isStreaming && (
              <div className="flex justify-start animate-fade-in">
                <div className="max-w-[85%] p-4 bg-white text-slate-700 border border-brand-primary/20 rounded-2xl rounded-bl-none shadow-md text-sm font-bold">
                  {streamingText}
                  <span className="inline-block w-1 h-4 bg-brand-primary ml-1 animate-pulse"></span>
                </div>
              </div>
            )}
            {loading && (
              <div className="flex justify-start">
                 <div className="px-4 py-2 bg-white rounded-full border border-slate-100 shadow-sm flex gap-1">
                    <div className="w-1 h-1 bg-brand-primary rounded-full animate-bounce"></div>
                    <div className="w-1 h-1 bg-brand-primary rounded-full animate-bounce [animation-delay:0.2s]"></div>
                    <div className="w-1 h-1 bg-brand-primary rounded-full animate-bounce [animation-delay:0.4s]"></div>
                 </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Actions Footer */}
          {!isStreaming && !loading && (
             <div className="px-6 py-3 border-t border-slate-100 flex gap-2 overflow-x-auto no-scrollbar">
                {quickActions.map((action, i) => (
                   <button 
                      key={i}
                      onClick={() => handleSend(language === 'ar' ? action.ar : action.en)}
                      className="whitespace-nowrap px-3 py-1.5 bg-slate-100 text-[10px] font-bold text-slate-500 rounded-lg hover:bg-brand-primary hover:text-white transition-all"
                   >
                      {language === 'ar' ? action.ar : action.en}
                   </button>
                ))}
             </div>
          )}

          {/* Input Dock */}
          <div className="p-4 border-t border-slate-100 bg-white">
            <div className="relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder={language === 'ar' ? 'اكتب رسالتك هنا...' : 'Type a message...'}
                className={`w-full py-3 px-5 pr-12 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all text-sm font-medium ${dir === 'rtl' ? 'pl-12 pr-5' : 'pr-12 pl-5'}`}
              />
              <button 
                onClick={() => handleSend()}
                disabled={!input.trim() || loading || isStreaming}
                className={`absolute top-1/2 -translate-y-1/2 ${dir === 'rtl' ? 'left-3' : 'right-3'} w-8 h-8 rounded-lg bg-brand-primary text-white flex items-center justify-center shadow-lg disabled:opacity-50 transition-all`}
              >
                <svg className={`w-4 h-4 ${dir === 'rtl' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toggle Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-16 h-16 rounded-full bg-brand-primary text-white flex items-center justify-center shadow-[0_10px_30px_rgba(45,137,229,0.4)] hover:scale-110 hover:shadow-[0_15px_40px_rgba(45,137,229,0.5)] transition-all active:scale-95 group relative`}
      >
        {isOpen ? (
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
        ) : (
          <>
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full animate-pulse"></div>
          </>
        )}
      </button>
    </div>
  );
};

export default GlobalAIAssistant;
