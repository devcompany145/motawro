
import React, { useState, useMemo } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import AIMentorAssistant from './AIMentorAssistant';
import MentorAIRecommendation from './MentorAIRecommendation';
import MentorBookingModal from './MentorBookingModal';
import { MY_BUSINESS_GENOME } from '../constants';

interface Mentor {
  id: string;
  name: string;
  image: string;
  initials: string;
  color: string;
  available: boolean;
  expertise: string[]; 
  skills: string[]; 
  industries: string[]; 
  specialization: string;
  mentorshipStyle: string;
  languages: string[];
  bio: string;
  experience: string;
  background: string; 
  nextAvailable: string;
  weeklyOverview: string; 
  availableSlots: string[];
  rating: number;
  studentsCount: number;
  projectsCount: number;
  synergyScore?: number; 
  responseTime?: string;
  socials: {
    linkedin?: string;
    twitter?: string;
    website?: string;
  };
}

const MentorsPage: React.FC = () => {
  const { t, language, dir } = useLanguage();
  const [activeTab, setActiveTab] = useState<'working_hours' | 'sessions' | 'my_bookings'>('working_hours');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMentor, setSelectedMentor] = useState<Mentor | null>(null);
  const [preselectedDate, setPreselectedDate] = useState<Date | null>(null);

  const mentorsData: Mentor[] = useMemo(() => {
    const raw = [
      { 
        id: '1', 
        name: language === 'ar' ? 'محمد سلامة' : 'Mohamed Salama', 
        image: '', 
        initials: 'MS', 
        color: 'bg-indigo-600', 
        available: true,
        expertise: ['Growth Strategy', 'Fundraising', 'SaaS Scaling'],
        skills: ['Series A Pitching', 'Unit Economics', 'Product-Market Fit'],
        industries: ['Fintech', 'SaaS', 'E-commerce'],
        specialization: language === 'ar' ? 'نمو الاستراتيجيات وتمويل الفئة أ' : 'Strategic Growth & Series A Funding',
        mentorshipStyle: language === 'ar' ? 'مباشر ونتائجي' : 'Direct & Results-Driven',
        languages: ['Arabic', 'English'],
        bio: language === 'ar' ? 'مهندس سابق في جوجل بخبرة تزيد عن 12 عاماً في بناء الأنظمة المالية ومساعدة المؤسسين على تجاوز مراحل النمو المبكرة.' : 'Ex-Google engineer with 12+ years experience building financial systems and helping founders navigate early-stage growth.',
        background: 'Former Engineering Lead at Google & CTO of Careem Pay',
        experience: '12 Years',
        nextAvailable: language === 'ar' ? 'اليوم، 2:00 مساءً' : 'Today, 2:00 PM',
        weeklyOverview: language === 'ar' ? 'الأحد - الأربعاء' : 'Sun - Wed',
        availableSlots: ['2:00 PM', '4:30 PM', 'Tomorrow 11:00 AM'],
        rating: 4.9,
        studentsCount: 142,
        projectsCount: 28,
        responseTime: '< 2 hrs',
        socials: { linkedin: '#', twitter: '#', website: '#' }
      },
      { 
        id: '2', 
        name: language === 'ar' ? 'محمد يوسف' : 'Mohamed O. Yousif', 
        image: '', 
        initials: 'MO', 
        color: 'bg-emerald-600', 
        available: true,
        expertise: ['Operations', 'Legal Compliance', 'HR Tech'],
        skills: ['Labor Law', 'Corporate Governance', 'Scaling Teams'],
        industries: ['Real Estate', 'Logistics', 'Professional Services'],
        specialization: language === 'ar' ? 'حوكمة الشركات والامتثال' : 'Corporate Governance & Compliance',
        mentorshipStyle: language === 'ar' ? 'متعاطف ومنظم' : 'Empathetic & Structured',
        languages: ['Arabic', 'English', 'French'],
        bio: language === 'ar' ? 'متخصص في قانون الشركات في الشرق الأوسط والتصميم التنظيمي. خبير في التوسع العابر للحدود وسياسات الموارد البشرية عن بعد.' : 'Specialist in Middle Eastern corporate law and organizational design. Expert in cross-border scaling and remote HR policies.',
        background: 'Senior Legal Advisor & HR Transformation Specialist',
        experience: '15 Years',
        nextAvailable: language === 'ar' ? 'غداً، 10:00 صباحاً' : 'Tomorrow, 10:00 AM',
        weeklyOverview: language === 'ar' ? 'الإثنين - الجمعة' : 'Mon - Fri',
        availableSlots: ['Tomorrow 10:00 AM', 'Tomorrow 1:00 PM'],
        rating: 4.8,
        studentsCount: 89,
        projectsCount: 15,
        responseTime: '< 4 hrs',
        socials: { linkedin: '#', website: '#' }
      },
      { 
        id: '3', 
        name: language === 'ar' ? 'خالد خميس' : 'Khalid Khamis', 
        image: '', 
        initials: 'KK', 
        color: 'bg-orange-600', 
        available: true,
        expertise: ['Marketing', 'Brand Identity', 'Growth Hacking'],
        skills: ['Performance Marketing', 'SEO/SEM', 'Viral Marketing'],
        industries: ['Retail', 'Consumer Tech', 'Entertainment'],
        specialization: language === 'ar' ? 'التسويق الرقمي واستحواذ المستخدمين' : 'Digital Marketing & User Acquisition',
        mentorshipStyle: language === 'ar' ? 'إبداعي وتحليلي' : 'Creative & Analytical',
        languages: ['Arabic', 'English'],
        bio: language === 'ar' ? 'مسوق نمو يركز على مسارات التحويل عالية الأداء للشركات الناشئة B2B. سجل حافل في تقليل تكاليف الاستحواذ.' : 'Growth hacker focused on high-conversion funnels for B2B startups. Proven track record in reducing customer acquisition costs.',
        background: 'Ex-Marketing Director at HungerStation',
        experience: '8 Years',
        nextAvailable: language === 'ar' ? 'الأربعاء، 4:30 مساءً' : 'Wed, 4:30 PM',
        weeklyOverview: language === 'ar' ? 'السبت، الأحد، الثلاثاء' : 'Sat, Sun, Tue',
        availableSlots: ['Wed 4:30 PM', 'Thu 9:00 AM', 'Thu 2:00 PM'],
        rating: 5.0,
        studentsCount: 215,
        projectsCount: 42,
        responseTime: '< 1 hr',
        socials: { twitter: '#', website: '#' }
      }
    ];

    return raw.map(m => {
       const userSector = MY_BUSINESS_GENOME.genomeProfile.industrySector.toLowerCase();
       let score = 70 + Math.floor(Math.random() * 20); 
       if (m.industries.some(ind => ind.toLowerCase().includes(userSector) || userSector.includes(ind.toLowerCase()))) {
          score += 10;
       }
       return { ...m, synergyScore: Math.min(score, 99) };
    }).sort((a,b) => (b.synergyScore || 0) - (a.synergyScore || 0));
  }, [language]);

  const filteredMentors = mentorsData.filter(m => 
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.expertise.some(e => e.toLowerCase().includes(searchQuery.toLowerCase())) ||
    m.specialization.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDaySelect = (mentor: Mentor, day: Date) => {
      setPreselectedDate(day);
      setSelectedMentor(mentor);
  };

  const AvailabilityStrip = ({ mentor }: { mentor: Mentor }) => {
    const nextDays = useMemo(() => {
        const days = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date();
            d.setDate(d.getDate() + i);
            days.push(d);
        }
        return days;
    }, []);

    return (
        <div className="mt-8 bg-slate-50/50 p-6 rounded-3xl border border-slate-100">
            <div className="flex justify-between items-center mb-6">
                <div className="flex flex-col">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-primary animate-pulse"></span>
                      {t('availableTime')}
                  </h4>
                  <p className="text-[11px] font-bold text-brand-dark">{language === 'ar' ? 'اختر يوماً للمعاينة' : 'Select a day for preview'}</p>
                </div>
                <div className="flex flex-col items-end">
                   <span className="text-[10px] font-bold text-brand-primary bg-brand-primary/10 px-3 py-1.5 rounded-xl border border-brand-primary/20">
                       {mentor.weeklyOverview}
                   </span>
                   <span className="text-[9px] font-bold text-slate-400 mt-2">Response: {mentor.responseTime}</span>
                </div>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-4 custom-scrollbar-thin">
                {nextDays.map((day, i) => {
                    const isToday = day.toDateString() === new Date().toDateString();
                    const isAvailable = (i + parseInt(mentor.id)) % 3 !== 0; 
                    return (
                        <button 
                            key={i}
                            disabled={!isAvailable}
                            onClick={() => handleDaySelect(mentor, day)}
                            className={`flex flex-col items-center min-w-[70px] py-5 rounded-2xl border transition-all duration-300 group
                                ${isAvailable 
                                    ? 'bg-white border-slate-200 hover:border-brand-primary hover:shadow-md cursor-pointer' 
                                    : 'bg-slate-100/50 border-transparent opacity-40 cursor-not-allowed'
                                }
                                ${isToday && isAvailable ? 'ring-2 ring-brand-primary/20 border-brand-primary shadow-lg shadow-brand-primary/5' : ''}
                            `}
                        >
                            <span className={`text-[10px] font-bold uppercase mb-1.5 ${isAvailable ? 'text-slate-400 group-hover:text-brand-primary' : 'text-slate-300'}`}>
                                {day.toLocaleDateString(language, { weekday: 'short' })}
                            </span>
                            <span className={`text-lg font-black ${isAvailable ? 'text-brand-dark group-hover:text-brand-primary' : 'text-slate-300'}`}>
                                {day.getDate()}
                            </span>
                            {isAvailable && (
                                <div className="mt-3 flex gap-1">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_5px_#34d399]"></div>
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_5px_#34d399]"></div>
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>
            
            <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3">
               {mentor.availableSlots.slice(0, 3).map((slot, i) => (
                  <div key={i} className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-slate-100 shadow-sm">
                     <span className="text-lg">🕒</span>
                     <span className="text-[11px] font-black text-slate-600">{slot}</span>
                  </div>
               ))}
            </div>
        </div>
    );
  };

  return (
    <div className="animate-fade-in w-full bg-brand-bg min-h-screen">
      <div className="bg-white border-b border-slate-100 pt-16 pb-12 text-center relative overflow-hidden">
         <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none"></div>
         <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
            <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-brand-primary/10 border border-brand-primary/20 text-brand-primary text-[10px] font-black uppercase tracking-[0.25em] mb-8">
               <span className="w-1.5 h-1.5 rounded-full bg-brand-primary animate-pulse"></span>
               AI-POWERED MENTORSHIP HUB
            </div>
            <h1 className="text-4xl md:text-6xl font-heading font-black text-brand-dark mb-8 leading-tight">{t('mentorsTitle')}</h1>
            <p className="text-slate-500 text-xl max-w-3xl mx-auto leading-relaxed font-medium">
              Connect your specific business DNA with industry leaders via our proprietary neural matching engine.
            </p>
         </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
           <div className="lg:col-span-1 lg:sticky lg:top-24 h-[750px]">
              <AIMentorAssistant mentors={mentorsData} />
           </div>

           <div className="lg:col-span-2 flex flex-col">
              <MentorAIRecommendation 
                userGenome={MY_BUSINESS_GENOME.genomeProfile as any} 
                mentors={mentorsData} 
              />

              <div className="bg-white rounded-[32px] p-5 shadow-card border border-slate-100 mb-10 flex flex-col md:flex-row justify-between items-center gap-6">
                 <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 no-scrollbar">
                    {['working_hours', 'sessions', 'my_bookings'].map((tab) => (
                      <button 
                        key={tab}
                        onClick={() => setActiveTab(tab as any)}
                        className={`flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-sm transition-all whitespace-nowrap ${activeTab === tab ? 'bg-brand-dark text-white shadow-xl' : 'text-slate-500 hover:bg-slate-50'}`}
                      >
                         {t(tab === 'working_hours' ? 'workingHours' : tab === 'sessions' ? 'sessions' : 'myBookings')}
                      </button>
                    ))}
                 </div>
                 <div className="w-full md:w-auto relative group">
                    <input 
                      type="text" 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={t('searchMentor')}
                      className="w-full md:w-80 px-8 py-4 rounded-[20px] border border-slate-200 focus:ring-4 focus:ring-brand-primary/5 focus:border-brand-primary outline-none text-sm font-bold transition-all bg-slate-50/50 shadow-inner"
                    />
                 </div>
              </div>

              <div className="grid grid-cols-1 gap-10">
                 {filteredMentors.length > 0 ? (
                    filteredMentors.map((mentor, idx) => (
                       <div key={mentor.id} className="group bg-white rounded-[48px] overflow-hidden shadow-card hover:shadow-elevated border border-slate-100 transition-all duration-700 flex flex-col hover:-translate-y-1 relative animate-slide-up" style={{ animationDelay: `${idx * 0.1}s` }}>
                          
                          {/* Synergy HUD */}
                          <div className="absolute top-8 right-8 z-10">
                             <div className="relative w-16 h-16 flex items-center justify-center">
                                <svg className="w-full h-full -rotate-90">
                                   <circle cx="32" cy="32" r="28" className="stroke-slate-100 fill-white" strokeWidth="4" />
                                   <circle cx="32" cy="32" r="28" className="stroke-brand-primary fill-none transition-all duration-1000" strokeWidth="4" strokeDasharray="175.9" strokeDashoffset={175.9 - (175.9 * (mentor.synergyScore || 0) / 100)} strokeLinecap="round" />
                                </svg>
                                <div className="absolute flex flex-col items-center">
                                   <span className="text-xs font-black text-brand-dark">{mentor.synergyScore}%</span>
                                   <span className="text-[6px] font-black text-brand-primary uppercase tracking-tighter">Match</span>
                                </div>
                             </div>
                          </div>

                          <div className="p-10">
                             <div className="flex flex-col md:flex-row gap-12">
                                <div className="shrink-0 flex flex-col items-center">
                                   <div className="relative mb-6">
                                      <div className={`w-36 h-36 rounded-[44px] flex items-center justify-center text-5xl font-black text-white shadow-2xl ${mentor.color} ring-8 ring-slate-50 group-hover:scale-105 transition-transform duration-500`}>
                                         {mentor.initials}
                                      </div>
                                      <div className={`absolute -bottom-1 -right-1 w-10 h-10 border-4 border-white rounded-full ${mentor.available ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]' : 'bg-slate-300'}`}></div>
                                   </div>
                                   
                                   <div className="grid grid-cols-2 gap-3 w-full mb-6">
                                      <div className="bg-slate-50 p-3 rounded-2xl text-center border border-slate-100">
                                         <div className="text-xs font-black text-brand-dark leading-tight">{mentor.studentsCount}</div>
                                         <div className="text-[7px] font-bold text-slate-400 uppercase tracking-tighter">Mentored</div>
                                      </div>
                                      <div className="bg-slate-50 p-3 rounded-2xl text-center border border-slate-100">
                                         <div className="text-xs font-black text-brand-dark leading-tight font-mono">{mentor.rating}⭐</div>
                                         <div className="text-[7px] font-bold text-slate-400 uppercase tracking-tighter">Rating</div>
                                      </div>
                                   </div>

                                   <div className="w-full space-y-3">
                                      <h4 className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">{t('languages')}</h4>
                                      <div className="flex flex-wrap justify-center gap-1.5">
                                         {mentor.languages.map(lang => (
                                            <span key={lang} className="px-3 py-1 bg-slate-100 rounded-lg text-[9px] font-black text-slate-600 uppercase tracking-tighter">{lang}</span>
                                         ))}
                                      </div>
                                   </div>
                                </div>

                                <div className="flex-1">
                                   <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8 pr-16">
                                      <div>
                                         <h3 className="text-4xl font-black text-brand-dark font-heading leading-tight mb-2">{mentor.name}</h3>
                                         <div className="inline-block px-4 py-2 bg-brand-primary text-white rounded-xl text-[10px] font-black uppercase tracking-[0.25em] shadow-lg shadow-brand-primary/20">
                                            {mentor.specialization}
                                         </div>
                                      </div>
                                   </div>
                                   
                                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                                      <div>
                                         <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                            <span className="w-4 h-px bg-slate-200"></span>
                                            {language === 'ar' ? 'ركائز المعرفة' : 'Expertise Pillars'}
                                         </h4>
                                         <div className="flex flex-wrap gap-2">
                                            {mentor.expertise.map((exp, i) => (
                                               <div key={i} className="px-3 py-2 bg-brand-primary/5 text-brand-primary border border-brand-primary/10 rounded-xl text-[10px] font-black uppercase tracking-tight hover:bg-brand-primary hover:text-white transition-all duration-300">
                                                  {exp}
                                               </div>
                                            ))}
                                         </div>
                                      </div>
                                      <div>
                                         <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                            <span className="w-4 h-px bg-slate-200"></span>
                                            {language === 'ar' ? 'أسلوب الإرشاد' : 'Mentorship Style'}
                                         </h4>
                                         <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 flex items-center gap-3">
                                            <span className="text-xl">✨</span>
                                            <span className="text-xs font-black text-indigo-900 leading-tight uppercase tracking-tight">{mentor.mentorshipStyle}</span>
                                         </div>
                                      </div>
                                   </div>

                                   <p className="text-base text-slate-600 leading-relaxed font-medium mb-10 italic border-l-4 border-brand-accent pl-8 py-3 bg-slate-50/30 rounded-r-3xl">
                                      "{mentor.bio}"
                                   </p>

                                   <div className="mb-10">
                                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                         <span className="w-4 h-px bg-slate-200"></span>
                                         {language === 'ar' ? 'التركيز الصناعي' : 'Industry Focus'}
                                      </h4>
                                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                         {mentor.industries.map((ind, i) => (
                                            <div key={i} className="px-4 py-3 bg-slate-100/80 text-slate-700 rounded-2xl text-[11px] font-black flex items-center gap-3 border border-slate-200 group-hover:bg-white transition-colors">
                                               <span className="w-2 h-2 rounded-full bg-slate-300 group-hover:bg-brand-accent transition-colors"></span>
                                               {ind}
                                            </div>
                                         ))}
                                      </div>
                                   </div>

                                   <AvailabilityStrip mentor={mentor} />

                                   <div className="mt-12">
                                      <button 
                                         onClick={() => setSelectedMentor(mentor)}
                                         className="w-full py-6 bg-brand-dark text-white rounded-[32px] font-black text-lg hover:bg-brand-primary hover:shadow-2xl transition-all flex items-center justify-center gap-4 shadow-xl active:scale-95 group/btn"
                                      >
                                         <div className="relative">
                                            <svg className="w-8 h-8 group-hover/btn:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-brand-accent rounded-full border-2 border-brand-dark animate-bounce"></div>
                                         </div>
                                         {t('bookSession')}
                                      </button>
                                   </div>
                                </div>
                             </div>
                          </div>
                       </div>
                    ))
                 ) : (
                    <div className="col-span-full py-48 text-center text-slate-300 bg-white rounded-[60px] border border-dashed border-slate-200">
                       <div className="text-8xl mb-10 grayscale opacity-20">🔭</div>
                       <p className="text-2xl font-black text-slate-400">{t('noMentorsFound')}</p>
                    </div>
                 )}
              </div>
           </div>
        </div>
      </div>

      {selectedMentor && (
         <MentorBookingModal 
            mentor={selectedMentor} 
            onClose={() => { setSelectedMentor(null); setPreselectedDate(null); }} 
            initialDate={preselectedDate || undefined}
         />
      )}
    </div>
  );
};

export default MentorsPage;
