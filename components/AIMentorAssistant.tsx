
import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types';
import { streamBusinessAdvice } from '../services/geminiService';
import { useLanguage } from '../contexts/LanguageContext';
import { MY_BUSINESS_GENOME } from '../constants';

interface AIMentorAssistantProps {
  mentors?: any[];
}

const AIMentorAssistant: React.FC<AIMentorAssistantProps> = ({ mentors = [] }) => {
  const { t, language, dir } = useLanguage();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  
  const abortControllerRef = useRef<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const resetMessages = () => {
    setMessages([{
      id: '0',
      role: 'model',
      text: t('aiMentorIntro'),
      timestamp: new Date()
    }]);
  };

  useEffect(() => {
    if (messages.length === 0) {
      resetMessages();
    }
  }, [t]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, streamingText]);

  const handleSend = async (overrideText?: string) => {
    const textToSend = overrideText || input;
    if (!textToSend.trim() || loading || isStreaming) return;

    abortControllerRef.current = false;
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: textToSend, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setStreamingText('');

    try {
      const history = messages.map(m => `${m.role === 'user' ? 'User' : 'Mentor'}: ${m.text}`);
      
      // Inject District Context: Mentors + User Profile
      const mentorContext = mentors.map(m => `- ${m.name}: Specialist in ${m.specialization}. Skills: ${m.skills.join(', ')}`).join('\n');
      const userContext = JSON.stringify(MY_BUSINESS_GENOME.genomeProfile);
      
      const customInstruction = `
        You are the "Business Developers Digital District Concierge & Senior Strategist".
        USER PROFILE: ${userContext}
        AVAILABLE MENTORS IN DISTRICT:
        ${mentorContext}

        GOALS:
        1. Provide personalized guidance based on the User Profile.
        2. RECOMMEND specific mentors from the list if they match user needs.
        3. Discuss current industry trends in Riyadh/KSA/GCC.
        4. Be elite, encouraging, and highly specific. 
        If the user asks "Who should I talk to?", analyze their genome profile vs mentor skills.
      `;
      
      const stream = streamBusinessAdvice(userMsg.text, [...history, `System Context: ${customInstruction}`], language);
      
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
        const aiMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'model', text: fullText, timestamp: new Date() };
        setMessages(prev => [...prev, aiMsg]);
      }
    } catch (error) {
      console.error("AI Mentor Error:", error);
    } finally {
      setLoading(false);
      setIsStreaming(false);
      setStreamingText('');
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-[32px] overflow-hidden border border-slate-100 shadow-elevated">
      {/* Header with Persona and Profile Sync Status */}
      <div className="p-6 bg-brand-dark text-white shrink-0 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary opacity-10 rounded-bl-full"></div>
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-brand-primary flex items-center justify-center shadow-lg shadow-brand-primary/20">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-lg leading-none">{t('aiMentorTitle')}</h3>
              <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest">District Intelligence Hub</p>
            </div>
          </div>
          <div className="flex flex-col items-end">
             <div className="flex items-center gap-2 px-2 py-1 bg-white/5 rounded-full border border-white/10">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-[8px] font-bold text-slate-300 uppercase">Profile Synced</span>
             </div>
          </div>
        </div>
      </div>

      {/* Strategic Actions Viewport */}
      <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex gap-2 overflow-x-auto no-scrollbar">
         {[
           { icon: '🎯', text: language === 'ar' ? 'من هو المرشد المناسب لي؟' : 'Find my mentor match' },
           { icon: '📈', text: language === 'ar' ? 'حلل توجهات السوق' : 'Market Trends Analysis' },
           { icon: '🚀', text: language === 'ar' ? 'كيف أطور مشروعي؟' : 'Growth Roadmap' }
         ].map((action, i) => (
           <button 
              key={i} 
              onClick={() => handleSend(action.text)}
              className="flex items-center gap-2 whitespace-nowrap px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-bold text-slate-600 hover:border-brand-primary hover:text-brand-primary transition-all shadow-sm"
           >
              <span>{action.icon}</span>
              {action.text}
           </button>
         ))}
      </div>

      {/* Messages */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-white/50">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
            <div className={`max-w-[85%] p-4 rounded-2xl shadow-sm text-sm ${
              msg.role === 'user' 
                ? 'bg-brand-primary text-white rounded-br-none' 
                : 'bg-white text-slate-700 border border-slate-100 rounded-bl-none'
            }`}>
              <p className="leading-relaxed whitespace-pre-wrap font-medium">{msg.text}</p>
              <div className={`mt-2 text-[8px] font-mono ${msg.role === 'user' ? 'text-blue-200' : 'text-slate-400'}`}>
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}
        {isStreaming && (
          <div className="flex justify-start animate-fade-in">
            <div className="max-w-[85%] p-4 bg-white text-slate-700 border border-brand-primary/20 rounded-2xl rounded-bl-none shadow-md text-sm">
              <p className="leading-relaxed whitespace-pre-wrap font-bold">
                {streamingText}
                <span className="inline-block w-1.5 h-4 bg-brand-primary ml-1 animate-pulse align-middle"></span>
              </p>
            </div>
          </div>
        )}
        {loading && (
          <div className="flex justify-start">
             <div className="px-4 py-2 bg-slate-100 rounded-full flex gap-1 items-center">
                <div className="w-1 h-1 bg-slate-400 rounded-full animate-bounce"></div>
                <div className="w-1 h-1 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-1 h-1 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.5s]"></div>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Dock */}
      <div className="p-4 bg-white border-t border-slate-100 relative">
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={isStreaming ? "Synthesizing intelligence..." : t('aiMentorPlaceholder')}
            className={`w-full py-4 px-6 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-medium focus:ring-4 focus:ring-brand-primary/5 focus:border-brand-primary outline-none transition-all ${dir === 'rtl' ? 'pl-14' : 'pr-14'}`}
          />
          <button 
            onClick={() => handleSend()}
            disabled={!input.trim() || isStreaming || loading}
            className={`absolute top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-brand-primary text-white flex items-center justify-center shadow-lg hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 disabled:bg-slate-300 ${dir === 'rtl' ? 'left-2.5' : 'right-2.5'}`}
          >
            {loading ? (
               <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
            ) : (
              <svg className={`w-5 h-5 ${dir === 'rtl' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            )}
          </button>
        </div>
        <p className="text-[8px] text-slate-400 text-center mt-3 uppercase tracking-widest font-bold">
           Encrypted Strategic Link Active
        </p>
      </div>
    </div>
  );
};

export default AIMentorAssistant;
