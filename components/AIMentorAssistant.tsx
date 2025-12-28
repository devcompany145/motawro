
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

  const genome = MY_BUSINESS_GENOME.genomeProfile;

  const resetMessages = () => {
    const welcome = language === 'ar' 
      ? `مرحباً بك! بصفتي المساعد الاستراتيجي للحي، قمت بتحليل ملفك في قطاع (${genome.industrySector}). لقد وجدت ${mentors.length} مرشدين خبراء يمكنهم مساعدتك في أهدافك الحالية. كيف يمكنني توجيهك اليوم؟`
      : `Hello! As the District Strategy Assistant, I've analyzed your ${genome.industrySector} profile. I've identified ${mentors.length} expert mentors that align with your current goals. How can I guide your journey today?`;

    setMessages([{
      id: '0',
      role: 'model',
      text: welcome,
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
      
      const mentorContext = mentors.map(m => `- ${m.name}: Specialist in ${m.specialization}. Skills: ${m.skills.join(', ')}. Industries: ${m.industries.join(', ')}`).join('\n');
      const userContext = JSON.stringify(genome);
      
      const customInstruction = `
        You are the "Elite District Mentor Agent". 
        YOUR CONTEXT:
        - USER BUSINESS DNA: ${userContext}
        - AVAILABLE MENTOR NETWORK:
        ${mentorContext}

        YOUR TASK:
        1. Act as a high-level strategist.
        2. When a user asks for a recommendation, EXPLAIN the specific synergy between their needs and the chosen mentor's background.
        3. Reference specific mentors by name.
        4. Discuss GCC market trends, fundraising, and scale-up strategies relevant to ${genome.industrySector}.
        5. Tone: Professional, authoritative, yet encouraging.
      `;
      
      const stream = streamBusinessAdvice(userMsg.text, [...history, `[Internal Persona: ${customInstruction}]`], language);
      
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
    <div className="flex flex-col h-full bg-white rounded-[40px] overflow-hidden border border-slate-100 shadow-elevated group/ai">
      {/* Premium Header */}
      <div className="p-8 bg-brand-dark text-white shrink-0 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-brand-primary/20 rounded-bl-full blur-2xl"></div>
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-brand-primary flex items-center justify-center shadow-[0_0_20px_rgba(45,137,229,0.4)] border border-white/10 group-hover/ai:scale-110 transition-transform">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h3 className="font-heading font-black text-xl leading-none">Strategic AI Agent</h3>
              <p className="text-[10px] text-brand-primary mt-2 font-mono uppercase tracking-[0.2em]">Neural Match Engine Active</p>
            </div>
          </div>
          <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981] animate-pulse"></div>
        </div>
      </div>

      {/* Suggestion Chips */}
      <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100 flex gap-2 overflow-x-auto no-scrollbar mask-fade-right">
         {[
           { icon: '💎', text: language === 'ar' ? 'من هو أفضل مرشد لي؟' : 'Who is my best match?' },
           { icon: '📊', text: language === 'ar' ? 'تحليل نمو مشروعي' : 'Analyze my growth path' },
           { icon: '🌍', text: language === 'ar' ? 'فرص السوق السعودي' : 'KSA Market Insights' }
         ].map((action, i) => (
           <button 
              key={i} 
              onClick={() => handleSend(action.text)}
              className="flex items-center gap-2 whitespace-nowrap px-5 py-2.5 bg-white border border-slate-200 rounded-2xl text-[10px] font-black text-slate-600 hover:border-brand-primary hover:text-brand-primary transition-all shadow-sm active:scale-95"
           >
              <span>{action.icon}</span>
              {action.text}
           </button>
         ))}
      </div>

      {/* Chat History */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar bg-white/40">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
            <div className={`max-w-[85%] p-6 rounded-[28px] shadow-sm text-sm leading-relaxed ${
              msg.role === 'user' 
                ? 'bg-brand-primary text-white rounded-br-none shadow-blue-500/10' 
                : 'bg-white text-slate-700 border border-slate-100 rounded-bl-none'
            }`}>
              <p className="font-medium whitespace-pre-wrap">{msg.text}</p>
              <div className={`mt-3 text-[9px] font-mono opacity-50 ${msg.role === 'user' ? 'text-right' : ''}`}>
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}
        {isStreaming && (
          <div className="flex justify-start animate-fade-in">
            <div className="max-w-[85%] p-6 bg-white text-slate-800 border-2 border-brand-primary/10 rounded-[28px] rounded-bl-none shadow-xl text-sm leading-relaxed">
              <p className="font-black whitespace-pre-wrap">
                {streamingText}
                <span className="inline-block w-1.5 h-4 bg-brand-primary ml-1 animate-pulse align-middle"></span>
              </p>
            </div>
          </div>
        )}
        {loading && (
          <div className="flex justify-start">
             <div className="px-6 py-3 bg-slate-100 rounded-full flex gap-2 items-center">
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></div>
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.5s]"></div>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Dock */}
      <div className="p-6 bg-white border-t border-slate-100 relative">
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={isStreaming ? "Calibrating..." : t('aiMentorPlaceholder')}
            className={`w-full py-5 px-8 rounded-[28px] bg-slate-50 border-2 border-slate-100 text-sm font-bold focus:ring-4 focus:ring-brand-primary/5 focus:border-brand-primary outline-none transition-all ${dir === 'rtl' ? 'pl-16' : 'pr-16'}`}
          />
          <button 
            onClick={() => handleSend()}
            disabled={!input.trim() || isStreaming || loading}
            className={`absolute top-1/2 -translate-y-1/2 w-12 h-12 rounded-2xl bg-brand-primary text-white flex items-center justify-center shadow-lg hover:shadow-blue-500/40 hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 disabled:bg-slate-300 ${dir === 'rtl' ? 'left-3' : 'right-3'}`}
          >
            {loading ? (
               <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
            ) : (
              <svg className={`w-6 h-6 ${dir === 'rtl' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIMentorAssistant;
