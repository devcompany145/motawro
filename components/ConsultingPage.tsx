
import React, { useState, useMemo } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import AIConsultant from './AIConsultant';

const ConsultingPage: React.FC = () => {
  const { t, language } = useLanguage();
  const [showForm, setShowForm] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = [
    { id: 'cons_tech', icon: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4', color: 'text-blue-500' },
    { id: 'cons_marketing', icon: 'M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z', color: 'text-purple-500' },
    { id: 'cons_training', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253', color: 'text-green-500' },
    { id: 'cons_recruitment', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z', color: 'text-orange-500' },
    { id: 'cons_gov', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4', color: 'text-slate-500' },
  ];

  return (
    <div className="min-h-screen bg-brand-bg animate-fade-in pb-20">
      
      {/* Header */}
      <div className="bg-brand-surface border-b border-white/5 pt-16 pb-24 text-center">
         <div className="max-w-4xl mx-auto px-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-primary/10 border border-brand-primary/20 text-brand-primary text-xs font-bold uppercase tracking-widest mb-6">
                Premium AI Advisory
             </div>
            <h1 className="text-4xl md:text-6xl font-heading font-bold mb-6 text-white">{t('consultingTitle')}</h1>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
               {t('consultingSubtitle')}
            </p>
         </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 -mt-16 relative z-10">
         <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left: AI Assistant (The Hero) */}
            <div className="lg:col-span-8">
               <div className="h-[800px]">
                  <AIConsultant />
               </div>
            </div>

            {/* Right: Expert Categories & Info */}
            <div className="lg:col-span-4 space-y-6">
               <div className="bg-brand-surface rounded-[32px] p-8 shadow-elevated border border-white/10">
                  <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                     <span className="w-2 h-6 bg-brand-primary rounded-full"></span>
                     Specialized Domains
                  </h3>
                  <div className="space-y-4">
                     {categories.map((cat) => (
                        <div key={cat.id} className="p-4 rounded-2xl bg-brand-bg border border-white/5 hover:border-brand-primary/30 transition-all group cursor-pointer">
                           <div className="flex items-center gap-4">
                              <div className={`w-10 h-10 rounded-xl bg-brand-surface flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform ${cat.color}`}>
                                 <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={cat.icon} />
                                 </svg>
                              </div>
                              <div>
                                 <h4 className="font-bold text-white text-sm">{t(cat.id)}</h4>
                                 <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">{t(cat.id + '_desc')}</p>
                              </div>
                           </div>
                        </div>
                     ))}
                  </div>
                  
                  <div className="mt-8 pt-8 border-t border-white/5">
                     <div className="bg-brand-primary/10 rounded-2xl p-6 border border-brand-primary/20">
                        <h4 className="font-bold text-brand-primary text-sm mb-2">Human-In-The-Loop</h4>
                        <p className="text-xs text-blue-200 leading-relaxed">
                           Our AI Architects are supervised by senior human consultants to ensure every strategy is perfectly calibrated for the local market.
                        </p>
                        <button className="mt-4 w-full py-3 bg-brand-primary text-white rounded-xl text-xs font-bold shadow-lg shadow-brand-primary/20">Request Human Expert</button>
                     </div>
                  </div>
               </div>

               {/* Value Proposition Widget */}
               <div className="bg-brand-dark rounded-[32px] p-8 text-white relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/10 rounded-bl-full -z-0"></div>
                  <h3 className="text-lg font-bold mb-4 relative z-10">Why AI Strategy?</h3>
                  <ul className="space-y-4 relative z-10">
                     {[
                        { icon: '⚡', t: 'Real-time calibration' },
                        { icon: '📊', t: 'Deep data reasoning' },
                        { icon: '🌍', t: 'District-wide synergy' }
                     ].map((item, i) => (
                        <li key={i} className="flex gap-3 text-xs font-medium text-slate-400">
                           <span>{item.icon}</span>
                           <span>{item.t}</span>
                        </li>
                     ))}
                  </ul>
               </div>
            </div>

         </div>
      </div>
    </div>
  );
};

export default ConsultingPage;
