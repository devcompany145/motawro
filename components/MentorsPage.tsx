
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
        mentorshipStyle: 'Direct & Results-Driven',
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
        mentorshipStyle: 'Empathetic & Structured',
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
        mentorshipStyle: 'Creative & Analytical',
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
        socials: { twitter: '#', website: '#' }
      }
    ];

    return raw.map(m => {
       const userSector = MY_BUSINESS_GENOME.genomeProfile.industrySector.toLowerCase();
       const mentorInd = m.industries.map(i => i.toLowerCase());
       let score = 70 + Math.floor(Math.random() * 20); 
       if (mentorInd.some(ind => ind.includes(userSector) || userSector.includes(ind))) {
          score += 10;
       }
       return { ...m, synergyScore: Math.min(score, 99) };
    }).sort((a,b) => (b.synergyScore || 0) - (a.synergyScore || 0));
  }, [language]);

  const filteredMentors = mentorsData.filter(m => 
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.expertise.some(e => e.toLowerCase().includes(searchQuery.toLowerCase())) ||
    m.skills.some(s => s.toLowerCase().includes(searchQuery.toLowerCase())) ||
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
            <div className="flex justify-between items-center mb-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-primary animate-pulse"></span>
                    {t('availableTime')}
                </h4>
                <span className="text-[10px] font-bold text-brand-primary bg-brand-primary/5 px-2 py-1 rounded-md">
                    {mentor.weeklyOverview}
                </span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar-thin">
                {nextDays.map((day, i) => {
                    const isToday = day.toDateString() === new Date().toDateString();
                    const isAvailable = (i + parseInt(mentor.id)) % 3 !== 0; 
                    return (
                        <button 
                            key={i}
                            disabled={!isAvailable}
                            onClick={() => handleDaySelect(mentor, day)}
                            className={`flex flex-col items-center min-w-[64px] py-4 rounded-2xl border transition-all duration-300 group
                                ${isAvailable 
                                    ? 'bg-white border-slate-200 hover:border-brand-primary hover:shadow-md cursor-pointer' 
                                    : 'bg-slate-100/50 border-transparent opacity-40 cursor-not-allowed'
                                }
                                ${isToday && isAvailable ? 'ring-2 ring-brand-primary/20 border-brand-primary' : ''}
                            `}
                        >
                            <span className={`text-[10px] font-bold uppercase mb-1 ${isAvailable ? 'text-slate-400 group-hover:text-brand-primary' : 'text-slate-300'}`}>
                                {day.toLocaleDateString(language, { weekday: 'short' })}
                            </span>
                            <span className={`text-base font-black ${isAvailable ? 'text-brand-dark group-hover:text-brand-primary' : 'text-slate-300'}`}>
                                {day.getDate()}
                            </span>
                            {isAvailable && (
                                <div className="mt-2 flex gap-0.5">
                                    <div className="w-1 h-1 rounded-full bg-emerald-400"></div>
                                    <div className="w-1 h-1 rounded-full bg-emerald-400"></div>
                                </div>
                            )}
                        </button>
                    );
                })}
                <button 
                   onClick={() => setSelectedMentor(mentor)}
                   className="flex flex-col items-center justify-center min-w-[64px] py-4 rounded-2xl border border-dashed border-slate-300 bg-white hover:border-brand-primary hover:bg-brand-primary/5 transition-all text-slate-400 hover:text-brand-primary"
                >
                   <span className="text-xl">📅</span>
                   <span className="text-[8px] font-black uppercase mt-1">Full</span>
                </button>
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
                          <div className="absolute top-8 right-8 z-10">
                             <div className="relative w-16 h-16 flex items-center justify-center">
                                <svg className="w-full h-full -rotate-90">
                                   <circle cx="32" cy="32" r="28" className="stroke-slate-100 fill-white" strokeWidth="4" />
                                   <circle cx="32" cy="32" r="28" className="stroke-brand-primary fill-none transition-all duration-1000" strokeWidth="4" strokeDasharray="175.9" strokeDashoffset={175.9 - (175.9 * (mentor.synergyScore || 0) / 100)} strokeLinecap="round" />
                                </svg>
                                <div className="absolute flex flex-col items-center">
                                   <span className="text-xs font-black text-brand-dark">{mentor.synergyScore}%</span>
                                   <span className="text-[6px] font-black text-brand-primary uppercase tracking-tighter">Synergy</span>
                                </div>
                             </div>
                          </div>

                          <div className="p-10">
                             <div className="flex flex-col md:flex-row gap-10">
                                <div className="shrink-0 flex flex-col items-center">
                                   <div className="relative mb-6">
                                      <div className={`w-32 h-32 rounded-[44px] flex items-center justify-center text-5xl font-black text-white shadow-2xl ${mentor.color}`}>
                                         {mentor.initials}
                                      </div>
                                      <div className={`absolute -bottom-2 -right-2 w-9 h-9 border-4 border-white rounded-full ${mentor.available ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]' : 'bg-slate-300'}`}></div>
                                   </div>
                                   <div className="flex items-center gap-2 text-brand-accent px-5 py-2 bg-brand-dark rounded-full shadow-lg">
                                      <svg className="w-5 h-5 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                                      <span className="text-base font-black text-white font-mono">{mentor.rating}</span>
                                   </div>
                                </div>

                                <div className="flex-1">
                                   <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8 pr-16">
                                      <div>
                                         <h3 className="text-3xl font-black text-brand-dark font-heading leading-tight">{mentor.name}</h3>
                                         <p className="text-sm font-bold text-brand-primary uppercase tracking-[0.25em] mt-3">{mentor.specialization}</p>
                                      </div>
                                   </div>
                                   
                                   <div className="mb-8">
                                      <div className="flex flex-wrap gap-2 mb-4">
                                         {mentor.expertise.map((exp, i) => (
                                            <span key={i} className="px-3 py-1 bg-brand-primary/5 text-brand-primary border border-brand-primary/10 rounded-lg text-[10px] font-black uppercase tracking-wider">
                                               {exp}
                                            </span>
                                         ))}
                                      </div>
                                      <p className="text-xs text-slate-500 font-bold flex items-center gap-3 bg-slate-50 w-fit px-4 py-2 rounded-full border border-slate-100">
                                         <span className="w-2 h-2 rounded-full bg-brand-primary"></span>
                                         {mentor.background} • {mentor.experience} {language === 'ar' ? 'خبرة' : 'Experience'}
                                      </p>
                                   </div>

                                   <p className="text-sm text-slate-600 leading-relaxed font-medium mb-10 italic border-l-4 border-brand-accent pl-6 py-2">
                                      "{mentor.bio}"
                                   </p>

                                   <div className="mb-8">
                                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">{language === 'ar' ? 'القطاعات المدعومة' : 'Target Industries'}</h4>
                                      <div className="flex flex-wrap gap-2">
                                         {mentor.industries.map((ind, i) => (
                                            <span key={i} className="px-2 py-1 bg-slate-100 text-slate-500 rounded-md text-[9px] font-bold">
                                               {ind}
                                            </span>
                                         ))}
                                      </div>
                                   </div>

                                   <AvailabilityStrip mentor={mentor} />

                                   <div className="mt-10">
                                      <button 
                                         onClick={() => setSelectedMentor(mentor)}
                                         className="w-full py-5 bg-brand-dark text-white rounded-[24px] font-black text-sm hover:bg-brand-primary hover:shadow-2xl transition-all flex items-center justify-center gap-3 shadow-xl active:scale-95 group"
                                      >
                                         <svg className="w-6 h-6 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
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
