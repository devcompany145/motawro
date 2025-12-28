
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { Business, MatchResult, BusinessGenome } from '../types';
import { generateBusinessMatches } from '../services/geminiService';

interface NetworkIntelligenceProps {
  businesses: Business[];
  userGenome: BusinessGenome;
}

const ScoreRing = ({ score }: { score: number }) => {
    const color = score > 85 ? 'text-brand-accent' : score > 70 ? 'text-brand-primary' : 'text-slate-400';
    const strokeDash = 251.2; // 2 * PI * 40
    const offset = strokeDash - (score / 100) * strokeDash;

    return (
        <div className="relative w-20 h-20 flex items-center justify-center group">
            <svg className="w-full h-full -rotate-90 transform overflow-visible">
                <circle cx="40" cy="40" r="36" className="stroke-slate-100 fill-none" strokeWidth="4" />
                <circle 
                    cx="40" cy="40" r="36" 
                    className={`${color} fill-none transition-all duration-1000 ease-out`} 
                    strokeWidth="4" 
                    strokeLinecap="round"
                    strokeDasharray={strokeDash}
                    strokeDashoffset={offset}
                    style={{ filter: score > 85 ? 'drop-shadow(0 0 6px currentColor)' : 'none' }}
                />
            </svg>
            <div className="absolute flex flex-col items-center">
                <span className={`text-xl font-bold font-mono ${color}`}>{score}</span>
                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">%</span>
            </div>
        </div>
    );
};

const MatchSkeleton = () => (
  <div className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100 flex flex-col h-full animate-pulse">
    <div className="flex justify-between items-start mb-8">
      <div className="flex gap-5 w-full">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 shrink-0"></div>
        <div className="space-y-3 w-full pt-1">
           <div className="h-5 bg-slate-100 rounded-lg w-3/4"></div>
           <div className="h-3 bg-slate-100 rounded-lg w-1/3"></div>
        </div>
      </div>
      <div className="w-16 h-16 rounded-full bg-slate-50 shrink-0"></div>
    </div>
    <div className="space-y-4 flex-1">
       <div className="h-28 bg-slate-50 rounded-2xl"></div>
    </div>
    <div className="mt-8 h-12 bg-slate-100 rounded-xl w-full"></div>
  </div>
);

const NetworkIntelligence: React.FC<NetworkIntelligenceProps> = ({ businesses, userGenome }) => {
  const { t, language } = useLanguage();
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState<{result: MatchResult, business: Business} | null>(null);
  const [introMessage, setIntroMessage] = useState('');

  const fetchMatches = useCallback(async () => {
    setLoading(true);
    try {
        const candidates = businesses.filter(b => b.isOccupied && b.id !== 'ME');
        if (candidates.length > 0) {
            const results = await generateBusinessMatches(userGenome, candidates, language);
            setMatches(results);
        } else {
            setMatches([]);
        }
    } catch (error) {
        console.error(error);
    } finally {
        setLoading(false);
    }
  }, [businesses, language, userGenome]);

  useEffect(() => { fetchMatches(); }, [fetchMatches]); 

  const handleOpenMatch = (match: MatchResult, business: Business) => {
      setSelectedMatch({ result: match, business });
      setIntroMessage(t('smartIntroMsg', { 
          field: match.sharedInterests[0] || 'Business Expansion', 
          topic: match.collaborationOpportunity 
      }));
  };

  return (
    <div className="animate-fade-in h-full flex flex-col bg-slate-50/30 overflow-hidden">
      
      {/* Dynamic Sub-Header */}
      <div className="p-8 md:p-10 border-b border-slate-200/60 bg-white flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-6">
           <div className="w-16 h-16 rounded-[20px] bg-brand-primary/5 flex items-center justify-center text-brand-primary text-3xl shadow-inner">
              🎯
           </div>
           <div>
              <h2 className="text-3xl font-heading font-bold text-brand-dark mb-1">{t('smartLounge')}</h2>
              <div className="flex items-center gap-3">
                 <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase tracking-wider border border-emerald-100">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    AI Optimized
                 </span>
                 <p className="text-sm text-slate-400 font-medium">{t('network_intelligenceDesc')}</p>
              </div>
           </div>
        </div>
        <button 
           onClick={fetchMatches} 
           disabled={loading}
           className="px-6 py-3 bg-brand-dark text-white rounded-xl text-sm font-bold hover:bg-black transition-all shadow-lg active:scale-95 disabled:opacity-50"
        >
           {loading ? 'Analyzing...' : t('refreshMatches')}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-8 md:p-10 custom-scrollbar">
         {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
               {[1, 2, 3, 4, 5, 6].map(i => <MatchSkeleton key={i} />)}
            </div>
         ) : matches.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-32 bg-white rounded-[40px] border border-dashed border-slate-200">
                <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-8 text-slate-300 text-5xl">🔭</div>
                <h3 className="text-2xl font-bold text-slate-700 mb-2">{t('noResults')}</h3>
                <p className="text-slate-400 max-w-sm mx-auto leading-relaxed">{t('tryRefreshing')}</p>
            </div>
         ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                {matches.map((match, idx) => {
                    const business = businesses.find(b => b.id === match.companyId);
                    if (!business) return null;

                    return (
                        <div 
                          key={idx} 
                          className="group bg-white rounded-[32px] p-8 shadow-card hover:shadow-elevated border border-slate-100 transition-all duration-500 hover:-translate-y-2 relative overflow-hidden flex flex-col animate-slide-up"
                          style={{ animationDelay: `${idx * 0.1}s` }}
                        >
                            {/* Gradient Background Decoration */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-brand-primary/5 to-transparent rounded-bl-[100px] -z-0 pointer-events-none group-hover:scale-110 transition-transform duration-700"></div>

                            <div className="flex justify-between items-start mb-8 relative z-10">
                                <div className="flex gap-5">
                                    <div className="w-14 h-14 rounded-2xl bg-brand-surface border border-slate-100 overflow-hidden flex items-center justify-center shrink-0 shadow-soft group-hover:border-brand-primary/30 transition-colors">
                                        {business.logoUrl ? <img src={business.logoUrl} className="w-full h-full object-cover" alt="" /> : "🏢"}
                                    </div>
                                    <div className="pt-1">
                                        <h4 className="font-bold text-brand-dark text-lg leading-tight group-hover:text-brand-primary transition-colors">{business.name}</h4>
                                        <span className="text-[10px] font-bold text-brand-primary/60 uppercase tracking-widest mt-1 block">{business.category}</span>
                                    </div>
                                </div>
                                <ScoreRing score={match.score} />
                            </div>

                            <div className="bg-slate-50/80 backdrop-blur-sm rounded-2xl p-6 mb-8 flex-1 border border-slate-100 group-hover:bg-slate-50 transition-colors relative z-10">
                                <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">{t('matchReason')}</h5>
                                <p className="text-sm text-slate-600 leading-relaxed font-medium mb-6 italic">"{match.matchReason}"</p>
                                
                                {match.analysisPoints && (
                                    <div className="space-y-3 pt-4 border-t border-slate-200/50">
                                        {match.analysisPoints.slice(0, 2).map((pt, i) => (
                                            <div key={i} className="flex items-center gap-3">
                                                <div className="w-6 h-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-[10px] shadow-sm">
                                                   {pt.factor.toLowerCase().includes('industry') ? '🏢' : pt.factor.toLowerCase().includes('service') ? '⚙️' : '🎯'}
                                                </div>
                                                <span className="text-[11px] font-bold text-slate-500 truncate group-hover:text-slate-700 transition-colors">{pt.factor}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <button 
                                onClick={() => handleOpenMatch(match, business)} 
                                className="w-full py-4 bg-brand-primary text-white rounded-2xl font-bold text-sm shadow-lg shadow-brand-primary/20 hover:brightness-110 transition-all active:scale-95 relative z-10 overflow-hidden"
                            >
                                <span className="relative z-10">{t('requestIntro')}</span>
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                            </button>
                        </div>
                    );
                })}
            </div>
         )}
      </div>

      {/* Intro Modal - Futuristic Theme */}
      {selectedMatch && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-brand-dark/80 backdrop-blur-xl">
            <div className="bg-white w-full max-w-3xl rounded-[40px] shadow-2xl overflow-hidden animate-scale-in flex flex-col max-h-[90vh] border border-white/20">
               
               <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-slate-50 to-white">
                  <div className="flex items-center gap-5">
                      <div className="w-14 h-14 rounded-2xl bg-brand-primary text-white flex items-center justify-center shadow-lg shadow-brand-primary/30">
                         <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.013 8.013 0 01-5.626-2.32l-5.118 1.134 1.956-5.441A8.013 8.013 0 013 12c0-4.418 3.582-8 8-8s8 3.582 8 8z" /></svg>
                      </div>
                      <div>
                         <h3 className="text-2xl font-bold text-brand-dark font-heading">{t('introRoom')}</h3>
                         <p className="text-sm text-slate-400 font-medium">Strategizing partnership with {selectedMatch.business.name}</p>
                      </div>
                  </div>
                  <button onClick={() => setSelectedMatch(null)} className="p-3 hover:bg-slate-100 rounded-2xl transition-all text-slate-400">
                     <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
               </div>
               
               <div className="p-10 flex-1 overflow-y-auto custom-scrollbar bg-white">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-10">
                      <div className="space-y-5">
                          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">{t('sharedInterests')}</h4>
                          <div className="flex flex-wrap gap-2.5">
                              {selectedMatch.result.sharedInterests.map((interest, i) => (
                                  <span key={i} className="px-4 py-2 bg-brand-primary/5 text-brand-primary rounded-xl text-xs font-bold border border-brand-primary/10 shadow-sm transition-all hover:scale-105">
                                      #{interest}
                                  </span>
                              ))}
                          </div>
                      </div>
                      <div className="space-y-5">
                          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">{t('collaborationOpp')}</h4>
                          <div className="p-5 bg-emerald-50 rounded-2xl border border-emerald-100 shadow-sm relative overflow-hidden group">
                              <div className="absolute top-0 right-0 w-2 h-full bg-emerald-500/20 group-hover:bg-emerald-500/40 transition-colors"></div>
                              <p className="text-sm font-bold text-emerald-800 leading-relaxed">{selectedMatch.result.collaborationOpportunity}</p>
                          </div>
                      </div>
                  </div>

                  <div className="space-y-5">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('message')}</h4>
                        <span className="text-[10px] font-bold text-brand-primary/50 italic">AI Drafted Introduction</span>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 mb-4">
                         {["Bundle our API", "Cross-marketing campaign", "Equity Swap Discussion"].map((ice, i) => (
                             <button 
                                key={i} 
                                onClick={() => setIntroMessage(prev => prev + `\n\nAdditionally, I'd like to explore: ${ice}.`)} 
                                className="px-3 py-1.5 bg-slate-50 hover:bg-brand-primary hover:text-white rounded-lg text-[10px] font-bold text-slate-600 transition-all border border-slate-200"
                             >
                                💡 {ice}
                             </button>
                         ))}
                      </div>
                      <div className="relative group">
                        <textarea 
                            value={introMessage} 
                            onChange={(e) => setIntroMessage(e.target.value)}
                            className="w-full h-48 p-6 rounded-[24px] bg-slate-50 border-2 border-slate-100 focus:ring-4 focus:ring-brand-primary/5 focus:border-brand-primary outline-none text-sm font-medium resize-none shadow-inner transition-all" 
                        />
                        <div className="absolute bottom-4 right-4 text-[10px] text-slate-300 font-mono">Press Shift+Enter to send</div>
                      </div>
                  </div>
               </div>

               <div className="p-10 border-t border-slate-100 bg-slate-50/50">
                  <button className="w-full py-5 bg-brand-primary text-white font-bold rounded-2xl hover:brightness-110 shadow-xl shadow-brand-primary/30 transition-all active:scale-95 flex items-center justify-center gap-3">
                     <span className="text-lg">{t('sendMessage')}</span>
                     <svg className="w-6 h-6 rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
                  </button>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};

export default NetworkIntelligence;
