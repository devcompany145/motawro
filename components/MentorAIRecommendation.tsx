
import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { generateMentorInsight } from '../services/geminiService';
import { BusinessGenome } from '../types';

interface MentorAIRecommendationProps {
  userGenome: BusinessGenome;
  mentors: any[];
}

const MentorAIRecommendation: React.FC<MentorAIRecommendationProps> = ({ userGenome, mentors }) => {
  const { t, language } = useLanguage();
  const [insight, setInsight] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInsight = async () => {
      setLoading(true);
      const text = await generateMentorInsight(userGenome, mentors, language);
      setInsight(text);
      setLoading(false);
    };
    fetchInsight();
  }, [language, userGenome, mentors]);

  return (
    <div className="mb-10 relative group">
      {/* Decorative Glow */}
      <div className="absolute -inset-1 bg-gradient-to-r from-brand-primary via-brand-accent to-brand-primary rounded-[32px] blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
      
      <div className="relative bg-white rounded-[32px] border border-slate-100 p-8 shadow-card flex flex-col md:flex-row items-center gap-8 overflow-hidden">
         {/* Background Pulse */}
         <div className="absolute top-0 right-0 w-64 h-64 bg-brand-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 animate-pulse-slow"></div>
         
         <div className="shrink-0 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-brand-dark rounded-[24px] flex items-center justify-center text-3xl shadow-xl border border-white/10 mb-4 relative">
               <span className="animate-bounce">🧠</span>
               {loading && (
                 <div className="absolute inset-0 border-4 border-brand-primary border-t-transparent rounded-[24px] animate-spin"></div>
               )}
            </div>
            <div className="px-3 py-1 bg-brand-primary/10 text-brand-primary rounded-full text-[10px] font-black uppercase tracking-widest">
               AI Strategy
            </div>
         </div>

         <div className="flex-1">
            <h3 className="text-xl font-black text-brand-dark mb-2 font-heading flex items-center gap-2">
               {language === 'ar' ? 'توصية الذكاء الاصطناعي لمسارك' : 'AI Strategic Recommendation'}
               <span className="text-brand-accent">✦</span>
            </h3>
            
            {loading ? (
              <div className="space-y-3">
                 <div className="h-4 bg-slate-100 rounded w-3/4 animate-pulse"></div>
                 <div className="h-4 bg-slate-100 rounded w-full animate-pulse"></div>
                 <div className="h-4 bg-slate-100 rounded w-1/2 animate-pulse"></div>
              </div>
            ) : (
              <p className="text-slate-600 text-lg leading-relaxed font-medium animate-fade-in">
                {insight}
              </p>
            )}
         </div>

         {!loading && (
           <div className="shrink-0">
              <button 
                onClick={() => window.scrollTo({ top: 1200, behavior: 'smooth' })}
                className="px-6 py-3 bg-brand-dark text-white rounded-xl font-bold text-sm hover:bg-black transition-all shadow-lg active:scale-95"
              >
                {language === 'ar' ? 'بدء التواصل' : 'Connect Now'}
              </button>
           </div>
         )}
      </div>
    </div>
  );
};

export default MentorAIRecommendation;
