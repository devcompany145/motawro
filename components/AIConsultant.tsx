
import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types';
import { generateBusinessAdvice, generateStructuredStrategy } from '../services/geminiService';
import { useLanguage } from '../contexts/LanguageContext';

type ConsultantMode = 'chat' | 'strategy';

const AIConsultant: React.FC<{ onMessageSent?: () => void }> = ({ onMessageSent }) => {
  const { t, language } = useLanguage();
  const [mode, setMode] = useState<ConsultantMode>('chat');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Strategy Wizard State
  const [strategyStep, setStrategyStep] = useState(1);
  const [strategyForm, setStrategyForm] = useState({
    industry: '',
    stage: 'Growth',
    goals: '',
    challenges: ''
  });
  const [generatedStrategy, setGeneratedStrategy] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages([{
      id: '0',
      role: 'model',
      text: t('welcomeMessage'),
      timestamp: new Date()
    }]);
  }, [language, t]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, generatedStrategy]);

  const handleSend = async (overrideText?: string) => {
    const textToSend = overrideText || input;
    if (!textToSend.trim()) return;

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: textToSend, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    
    if (onMessageSent) onMessageSent();

    try {
        const history = messages.map(m => `${m.role === 'user' ? 'User' : 'Consultant'}: ${m.text}`);
        const responseText = await generateBusinessAdvice(userMsg.text, history, language);
        const aiMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'model', text: responseText, timestamp: new Date() };
        setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
        console.error("Error fetching AI response", error);
    } finally {
        setLoading(false);
    }
  };

  const startStrategyGeneration = async () => {
    setLoading(true);
    setGeneratedStrategy(null);
    try {
      const plan = await generateStructuredStrategy(strategyForm, language);
      setGeneratedStrategy(plan);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-[32px] overflow-hidden shadow-card border border-slate-100 relative">
      
      {/* Dynamic Header */}
      <div className="p-6 bg-white border-b border-slate-100 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-primary to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-100">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full shadow-sm"></span>
          </div>
          <div>
            <h3 className="font-bold text-brand-primary text-xl leading-tight">{t('consultantTitle')}</h3>
            <div className="flex gap-2 mt-1">
               <button 
                  onClick={() => setMode('chat')}
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all ${mode === 'chat' ? 'bg-brand-primary text-white border-brand-primary' : 'bg-white text-slate-400 border-slate-200 hover:border-brand-primary'}`}
               >
                  Consultation
               </button>
               <button 
                  onClick={() => setMode('strategy')}
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all ${mode === 'strategy' ? 'bg-brand-primary text-white border-brand-primary' : 'bg-white text-slate-400 border-slate-200 hover:border-brand-primary'}`}
               >
                  Strategy Builder
               </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        {mode === 'chat' ? (
          <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-slate-50/50 custom-scrollbar scroll-smooth">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} gap-4 group items-end animate-fade-in`}>
                 {msg.role === 'model' && (
                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-sm text-brand-primary text-xs font-bold border border-slate-100">AI</div>
                 )}
                <div className={`relative max-w-[80%] p-5 text-[15px] leading-relaxed shadow-sm transition-all duration-300 ${msg.role === 'user' ? 'bg-brand-primary text-white rounded-2xl rounded-br-sm' : 'bg-white text-slate-700 rounded-2xl rounded-bl-sm border border-slate-100'}`}>
                  <p className="whitespace-pre-wrap font-medium">{msg.text}</p>
                </div>
                 {msg.role === 'user' && (
                    <div className="w-10 h-10 rounded-xl bg-slate-200 flex items-center justify-center shrink-0 overflow-hidden border border-white shadow-sm">
                       <img src="https://ui-avatars.com/api/?name=User&background=2D89E5&color=fff" alt="User" className="w-full h-full object-cover" />
                    </div>
                 )}
              </div>
            ))}
            {loading && (
              <div className="flex justify-start gap-4 items-end animate-fade-in">
                 <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-sm text-brand-primary text-xs font-bold border border-slate-100">AI</div>
                 <div className="bg-white p-5 rounded-2xl rounded-bl-sm border border-slate-100 flex gap-3 items-center shadow-sm">
                    <div className="flex gap-1.5"><div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" /><div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} /><div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} /></div>
                 </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50/50">
            {!generatedStrategy ? (
              <div className="max-w-xl mx-auto space-y-10 py-6 animate-slide-up">
                <div className="text-center">
                  <h4 className="text-2xl font-bold text-brand-dark mb-2">Strategy Architect</h4>
                  <p className="text-sm text-slate-500">Provide your vision, and Gemini will build your 12-month blueprint.</p>
                </div>

                <div className="space-y-6">
                   <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Industry & Sector</label>
                      <input 
                        type="text" 
                        value={strategyForm.industry}
                        onChange={e => setStrategyForm({...strategyForm, industry: e.target.value})}
                        placeholder="e.g. Fintech, E-commerce, Logistics" 
                        className="w-full p-4 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary transition-all font-medium"
                      />
                   </div>
                   <div className="grid grid-cols-3 gap-3">
                      {['Ideation', 'Growth', 'Scaling'].map(s => (
                        <button 
                          key={s} 
                          onClick={() => setStrategyForm({...strategyForm, stage: s})}
                          className={`py-3 rounded-xl border text-xs font-bold transition-all ${strategyForm.stage === s ? 'bg-brand-primary text-white border-brand-primary shadow-md' : 'bg-white text-slate-500 border-slate-200 hover:border-brand-primary'}`}
                        >
                          {s}
                        </button>
                      ))}
                   </div>
                   <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Primary Goals</label>
                      <textarea 
                        value={strategyForm.goals}
                        onChange={e => setStrategyForm({...strategyForm, goals: e.target.value})}
                        placeholder="What do you want to achieve in 12 months?" 
                        className="w-full h-24 p-4 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary transition-all font-medium resize-none"
                      />
                   </div>
                   <button 
                     onClick={startStrategyGeneration}
                     disabled={loading || !strategyForm.industry}
                     className="w-full py-4 bg-brand-primary text-white rounded-xl font-bold shadow-lg shadow-blue-900/10 hover:brightness-110 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                   >
                     {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Construct Strategy Blueprint'}
                     {!loading && <span>⚡</span>}
                   </button>
                </div>
              </div>
            ) : (
              <div className="max-w-3xl mx-auto py-10 animate-fade-in">
                 <div className="flex justify-between items-center mb-8">
                    <h4 className="text-2xl font-bold text-brand-dark">Business Strategy Roadmap</h4>
                    <button onClick={() => setGeneratedStrategy(null)} className="text-xs font-bold text-brand-primary hover:underline">New Strategy</button>
                 </div>
                 <div className="bg-white p-8 md:p-12 rounded-[40px] shadow-elevated border border-slate-100 prose prose-slate prose-sm max-w-none prose-headings:text-brand-primary prose-headings:font-heading prose-p:leading-relaxed prose-li:font-medium">
                    <div className="whitespace-pre-wrap leading-relaxed">
                       {generatedStrategy}
                    </div>
                 </div>
                 <div className="mt-8 flex gap-4">
                    <button className="flex-1 py-4 bg-brand-dark text-white rounded-2xl font-bold text-sm shadow-lg">Download PDF</button>
                    <button onClick={() => setMode('chat')} className="flex-1 py-4 bg-slate-100 text-brand-primary rounded-2xl font-bold text-sm">Ask Follow-up</button>
                 </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Input for Chat */}
      {mode === 'chat' && (
        <div className="bg-white border-t border-slate-100 p-6 shrink-0">
          <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar mask-fade-right">
             {['suggest_marketing', 'suggest_swot', 'suggest_funding'].map((key) => (
                <button key={key} onClick={() => handleSend(t(key))} disabled={loading} className="whitespace-nowrap px-5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-600 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition-all">✨ {t(key)}</button>
             ))}
          </div>
          <div className="relative flex items-end gap-3 bg-slate-50 p-2 rounded-[20px] border border-slate-200 focus-within:border-brand-primary transition-all">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder={t('writeConsultation')}
                rows={1}
                className="flex-1 bg-transparent border-none px-4 py-3 text-slate-800 placeholder-slate-400 focus:ring-0 outline-none font-medium resize-none max-h-32 min-h-[48px]"
              />
              <button
                onClick={() => handleSend()}
                disabled={loading || !input.trim()}
                className="h-12 w-12 rounded-2xl bg-brand-primary hover:bg-[#052c42] disabled:bg-slate-300 text-white shadow-lg transition-all flex items-center justify-center shrink-0"
              >
                {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 rtl:rotate-180" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>}
              </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIConsultant;
