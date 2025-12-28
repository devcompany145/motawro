
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChatMessage } from '../types';
import { streamBusinessAdvice, generateStructuredStrategy } from '../services/geminiService';
import { useLanguage } from '../contexts/LanguageContext';

type ConsultantMode = 'chat' | 'blueprint' | 'history';

const AIConsultant: React.FC<{ onMessageSent?: () => void }> = ({ onMessageSent }) => {
  const { t, language, dir } = useLanguage();
  const [mode, setMode] = useState<ConsultantMode>('chat');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  
  // Search History State
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  
  // Abort Control for Streaming
  const abortControllerRef = useRef<boolean>(false);

  // Strategy Builder State
  const [blueprintForm, setBlueprintForm] = useState({
    industry: '',
    revenue: '0-1M',
    coreGoal: '',
    servicesOffered: [] as string[],
    distruptionLevel: 'Moderate'
  });
  const [serviceInput, setServiceInput] = useState('');
  const [generatedBlueprint, setGeneratedBlueprint] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const resetMessages = () => {
    setMessages([{
      id: '0',
      role: 'model',
      text: t('welcomeMessage'),
      timestamp: new Date()
    }]);
    setHistorySearchQuery('');
  };

  useEffect(() => {
    if (messages.length === 0) {
      resetMessages();
    }
  }, [t]);

  // Handle auto-scroll to bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      const container = scrollContainerRef.current;
      if (container) {
        // Only auto-scroll if the user is close to the bottom (within 100px)
        const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150;
        if ((isNearBottom || isStreaming) && !historySearchQuery) {
          messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
      }
    }
  }, [messages, streamingText, isStreaming, loading, historySearchQuery]);

  const filteredMessages = useMemo(() => {
    if (!historySearchQuery.trim()) return messages;
    return messages.filter(m => 
      m.text.toLowerCase().includes(historySearchQuery.toLowerCase())
    );
  }, [messages, historySearchQuery]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleStop = () => {
    abortControllerRef.current = true;
  };

  const handleClearChat = () => {
    resetMessages();
    setShowClearConfirm(false);
  };

  const addService = () => {
    if (serviceInput.trim() && !blueprintForm.servicesOffered.includes(serviceInput.trim())) {
      setBlueprintForm(prev => ({
        ...prev,
        servicesOffered: [...prev.servicesOffered, serviceInput.trim()]
      }));
      setServiceInput('');
    }
  };

  const removeService = (service: string) => {
    setBlueprintForm(prev => ({
      ...prev,
      servicesOffered: prev.servicesOffered.filter(s => s !== service)
    }));
  };

  const handleSend = async (overrideText?: string) => {
    const textToSend = overrideText || input;
    if (!textToSend.trim() || loading || isStreaming) return;

    // Clear search when sending a new message to show context
    setHistorySearchQuery('');
    setShowSearch(false);

    abortControllerRef.current = false;
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: textToSend, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setStreamingText('');
    
    if (onMessageSent) onMessageSent();

    try {
      const history = messages.map(m => `${m.role === 'user' ? 'User' : 'Consultant'}: ${m.text}`);
      const stream = streamBusinessAdvice(userMsg.text, history, language);
      
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
      console.error("Consultation Error:", error);
      const errorMsg: ChatMessage = { id: Date.now().toString(), role: 'model', text: "Error connecting to AI. Please try again.", timestamp: new Date() };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
      setIsStreaming(false);
      setStreamingText('');
    }
  };

  const constructBlueprint = async () => {
    setLoading(true);
    setGeneratedBlueprint(null);
    try {
      const plan = await generateStructuredStrategy(blueprintForm, language);
      setGeneratedBlueprint(plan);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-[32px] overflow-hidden shadow-elevated border border-slate-100 transition-all duration-500 relative">
      
      {/* Immersive Header */}
      <div className="p-6 bg-brand-dark text-white shrink-0">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            {!showSearch ? (
              <div className="flex items-center gap-4 animate-fade-in">
                <div className="relative">
                  <div className="w-14 h-14 rounded-2xl bg-brand-primary flex items-center justify-center shadow-[0_0_20px_rgba(45,137,229,0.3)] border border-white/20">
                    <svg className="w-8 h-8 text-white animate-pulse-slow" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-brand-dark transition-colors duration-500 ${isStreaming || loading ? 'bg-orange-500 animate-pulse' : 'bg-green-500'}`}></div>
                </div>
                <div>
                  <h3 className="font-heading font-bold text-xl leading-none">AI Business Architect</h3>
                  <p className="text-[10px] text-brand-primary font-mono mt-1 uppercase tracking-widest">
                    {isStreaming || loading ? 'Synthesizing Neural Path' : 'Neural Link Active'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center gap-3 animate-slide-up">
                <button 
                  onClick={() => { setShowSearch(false); setHistorySearchQuery(''); }}
                  className="p-2 text-slate-400 hover:text-white transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <input 
                  autoFocus
                  type="text"
                  value={historySearchQuery}
                  onChange={(e) => setHistorySearchQuery(e.target.value)}
                  placeholder="Search chat history..."
                  className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm w-full outline-none focus:border-brand-primary transition-all text-white font-medium"
                />
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {mode === 'chat' && !showSearch && (
              <>
                <button 
                  onClick={() => setShowSearch(true)}
                  className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                  title="Search history"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
                <button 
                  onClick={() => setShowClearConfirm(true)}
                  className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                  title={t('clear_chat')}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </>
            )}
            {!showSearch && (
              <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
                {(['chat', 'blueprint'] as ConsultantMode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${mode === m ? 'bg-brand-primary text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                  >
                    {t(m === 'chat' ? 'live' : 'strategy_mode')}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden flex flex-col bg-slate-50/40 relative">
        
        {mode === 'chat' ? (
          <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar scroll-smooth">
            {filteredMessages.length > 0 ? (
              filteredMessages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in group`}>
                  <div className={`relative max-w-[85%] p-5 rounded-2xl shadow-sm border transition-all ${
                    msg.role === 'user' 
                      ? 'bg-brand-primary text-white border-brand-primary rounded-br-none' 
                      : 'bg-white text-slate-700 border border-slate-200 rounded-bl-none'
                  }`}>
                    <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                    <div className={`flex items-center justify-between mt-3 ${msg.role === 'user' ? 'text-blue-100' : 'text-slate-400'}`}>
                      <span className="text-[9px] font-mono">
                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {msg.role === 'model' && (
                        <button 
                          onClick={() => handleCopy(msg.text)}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-100 rounded transition-all ml-4"
                          title="Copy text"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 text-center animate-fade-in">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-2xl">🔍</div>
                <h4 className="font-bold text-slate-600">No matches found</h4>
                <p className="text-xs">Try searching for a different keyword</p>
                <button 
                  onClick={() => setHistorySearchQuery('')}
                  className="mt-4 text-brand-primary text-xs font-bold hover:underline"
                >
                  Clear search
                </button>
              </div>
            )}
            
            {isStreaming && !historySearchQuery && (
              <div className="flex justify-start animate-fade-in">
                <div className="max-w-[85%] p-5 bg-white text-slate-800 border border-brand-primary/20 rounded-2xl rounded-bl-none shadow-md">
                  <p className="text-sm font-bold leading-relaxed whitespace-pre-wrap">
                    {streamingText}
                    <span className="inline-block w-1.5 h-4 bg-brand-primary ml-1 animate-pulse align-middle"></span>
                  </p>
                </div>
              </div>
            )}
            
            {loading && !historySearchQuery && (
              <div className="flex justify-start animate-fade-in">
                <div className="px-6 py-4 bg-white rounded-2xl rounded-bl-none border border-slate-100 shadow-sm flex gap-2 items-center">
                   <div className="flex gap-1.5">
                      <div className="w-2 h-2 bg-brand-primary rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-brand-primary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                      <div className="w-2 h-2 bg-brand-primary rounded-full animate-bounce [animation-delay:-0.5s]"></div>
                   </div>
                   <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-2">Calibrating Insights...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar relative">
            {loading && !generatedBlueprint && (
               <div className="absolute inset-0 z-10 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center animate-fade-in">
                  <div className="w-20 h-20 relative mb-6">
                    <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center text-3xl">🏗️</div>
                  </div>
                  <h3 className="text-xl font-bold text-brand-dark mb-2">Constructing Blueprint...</h3>
                  <p className="text-sm text-slate-500 max-w-xs text-center leading-relaxed">AI is synthesizing a data-driven strategy for your business sector.</p>
               </div>
            )}
            
            {!generatedBlueprint ? (
              <div className="max-w-xl mx-auto space-y-8 animate-slide-up">
                <div className="text-center mb-10">
                   <div className="w-16 h-16 bg-brand-primary/10 text-brand-primary rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl shadow-inner">🏗️</div>
                   <h2 className="text-2xl font-bold text-slate-800">Strategy Blueprint Builder</h2>
                   <p className="text-sm text-slate-500 mt-2">Construct a data-driven 12-month roadmap for your venture.</p>
                </div>
                
                <div className="grid grid-cols-1 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('industrySector')}</label>
                    <input 
                      type="text" 
                      value={blueprintForm.industry}
                      onChange={e => setBlueprintForm({...blueprintForm, industry: e.target.value})}
                      placeholder="e.g. Fintech, EdTech, Saudi Logistics"
                      className="w-full p-4 rounded-xl border border-slate-200 focus:ring-4 focus:ring-brand-primary/10 focus:border-brand-primary outline-none transition-all text-sm font-bold"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('servicesOffered_label')}</label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={serviceInput}
                        onChange={e => setServiceInput(e.target.value)}
                        onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addService())}
                        placeholder="Add a service you provide..."
                        className="flex-1 p-4 rounded-xl border border-slate-200 focus:ring-4 focus:ring-brand-primary/10 focus:border-brand-primary outline-none transition-all text-sm font-bold"
                      />
                      <button 
                        onClick={addService}
                        className="w-12 h-12 bg-brand-primary text-white rounded-xl flex items-center justify-center shadow-lg hover:brightness-110 active:scale-95 transition-all"
                      >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                      </button>
                    </div>
                    {blueprintForm.servicesOffered.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3 p-3 bg-slate-100/50 rounded-xl border border-slate-200/50">
                        {blueprintForm.servicesOffered.map((s, i) => (
                          <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-brand-primary/20 text-brand-primary rounded-lg text-xs font-bold shadow-sm animate-fade-in">
                            {s}
                            <button onClick={() => removeService(s)} className="text-slate-400 hover:text-red-500 transition-colors">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Primary Objective</label>
                    <textarea 
                      value={blueprintForm.coreGoal}
                      onChange={e => setBlueprintForm({...blueprintForm, coreGoal: e.target.value})}
                      placeholder="What is your #1 goal for 2025?"
                      className="w-full h-24 p-4 rounded-xl border border-slate-200 focus:ring-4 focus:ring-brand-primary/10 focus:border-brand-primary outline-none transition-all text-sm font-bold resize-none"
                    />
                  </div>
                  
                  <button 
                    onClick={constructBlueprint}
                    disabled={loading || !blueprintForm.industry}
                    className="w-full py-4 bg-brand-dark text-white rounded-2xl font-bold shadow-lg hover:brightness-110 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                  >
                    {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : "Construct Roadmap"}
                    {!loading && <span>🚀</span>}
                  </button>
                </div>
              </div>
            ) : (
              <div className="max-w-4xl mx-auto py-6 animate-fade-in">
                 <div className="flex justify-between items-center mb-8 bg-brand-primary/5 p-4 rounded-2xl border border-brand-primary/10">
                    <h4 className="font-bold text-brand-primary flex items-center gap-2">
                       <span className="text-xl">📊</span> 2025 Strategic Blueprint
                    </h4>
                    <button onClick={() => setGeneratedBlueprint(null)} className="text-xs font-bold text-slate-500 hover:text-brand-primary underline uppercase tracking-widest">New Build</button>
                 </div>
                 
                 <div className="bg-white p-8 md:p-12 rounded-[40px] shadow-card border border-slate-100 prose prose-slate max-w-none prose-headings:font-heading prose-headings:text-brand-dark prose-p:text-slate-600 prose-li:text-slate-600">
                    <div className="whitespace-pre-wrap leading-relaxed font-medium">
                       {generatedBlueprint}
                    </div>
                 </div>
                 
                 <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button className="py-4 bg-brand-primary text-white rounded-2xl font-bold shadow-lg hover:brightness-110">Download PDF Strategy</button>
                    <button onClick={() => setMode('chat')} className="py-4 bg-slate-100 text-slate-700 rounded-2xl font-bold hover:bg-slate-200">Ask Question about Plan</button>
                 </div>
              </div>
            )}
          </div>
        )}

        {/* Floating Stop Button during streaming */}
        {(isStreaming || (loading && mode === 'chat')) && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 animate-slide-up z-20">
            <button 
              onClick={handleStop}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-red-500 rounded-full shadow-lg text-xs font-bold hover:bg-red-50 transition-colors"
            >
              <div className="w-2 h-2 bg-red-500 rounded-sm"></div>
              {loading ? 'Cancel' : 'Stop Generation'}
            </button>
          </div>
        )}
      </div>

      {/* Futuristic Input Dock */}
      {mode === 'chat' && (
        <div className="p-6 bg-white border-t border-slate-100 shrink-0">
          <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar mask-fade-right">
             {['suggest_marketing', 'suggest_growth', 'suggest_funding'].map((key) => (
                <button 
                  key={key} 
                  onClick={() => handleSend(t(key))} 
                  disabled={loading || isStreaming}
                  className="whitespace-nowrap px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:border-brand-primary hover:text-brand-primary transition-all disabled:opacity-30"
                >
                  ⚡ {t(key)}
                </button>
             ))}
          </div>
          
          <div className="relative flex items-center gap-3">
             <div className="flex-1 relative">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder={isStreaming ? "AI is generating..." : t('writeConsultation')}
                  rows={1}
                  disabled={isStreaming}
                  className={`w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:ring-4 focus:ring-brand-primary/5 focus:border-brand-primary outline-none transition-all text-sm font-bold resize-none disabled:cursor-not-allowed ${dir === 'rtl' ? 'pl-16' : 'pr-16'}`}
                />
                <button
                  onClick={() => handleSend()}
                  disabled={loading || isStreaming || !input.trim()}
                  className={`absolute top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-brand-primary text-white shadow-lg transition-all flex items-center justify-center disabled:opacity-50 disabled:bg-slate-300 ${dir === 'rtl' ? 'left-3' : 'right-3'}`}
                >
                  {loading || isStreaming ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <svg className={`w-5 h-5 ${dir === 'rtl' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                  )}
                </button>
             </div>
          </div>
        </div>
      )}

      {/* Clear History Confirmation Modal */}
      {showClearConfirm && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-brand-dark/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-[24px] p-8 shadow-2xl border border-slate-100 w-full max-w-xs text-center animate-scale-in">
             <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl">
               🗑️
             </div>
             <h4 className="text-xl font-bold text-slate-800 mb-2">Clear History?</h4>
             <p className="text-sm text-slate-500 mb-8 leading-relaxed">Are you sure you want to delete all messages in this session? This action cannot be undone.</p>
             <div className="flex flex-col gap-3">
                <button 
                  onClick={handleClearChat}
                  className="w-full py-3.5 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl shadow-lg shadow-red-500/20 transition-all"
                >
                  Clear Conversation
                </button>
                <button 
                  onClick={() => setShowClearConfirm(false)}
                  className="w-full py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-all"
                >
                  Cancel
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIConsultant;
