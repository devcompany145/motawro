
import React, { useState, useMemo } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import AIMentorAssistant from './AIMentorAssistant';
import MentorBookingModal from './MentorBookingModal';

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

  const stats = [
    { icon: 'check', count: 0, label: t('myBookings'), color: 'text-orange-500', bg: 'bg-orange-50' },
    { icon: 'calendar', count: 0, label: t('upcomingSession'), color: 'text-pink-500', bg: 'bg-pink-50' },
    { icon: 'clock', count: 0, label: t('availableTime'), color: 'text-blue-500', bg: 'bg-blue-50' },
    { icon: 'users', count: 11, label: t('expertMentor'), color: 'text-green-500', bg: 'bg-green-50' },
  ];

  const mentorsData: Mentor[] = [
    { 
      id: '1', 
      name: language === 'ar' ? 'محمد سلامة' : 'Mohamed Salama', 
      image: '', 
      initials: 'MS', 
      color: 'bg-indigo-600', 
      available: true,
      expertise: ['Growth Strategy', 'Fundraising'],
      skills: ['Series A Pitching', 'Unit Economics', 'Product-Market Fit'],
      industries: ['Fintech', 'SaaS', 'E-commerce'],
      specialization: 'Strategic Growth & Series A Funding',
      mentorshipStyle: 'Direct & Results-Driven',
      languages: ['Arabic', 'English'],
      bio: language === 'ar' ? 'مهندس سابق في جوجل بخبرة تزيد عن 12 عاماً في بناء الأنظمة المالية ومساعدة المؤسسين على تجاوز مراحل النمو المبكرة.' : 'Ex-Google engineer with 12+ years experience building financial systems and helping founders navigate early-stage growth.',
      background: 'Former Engineering Lead at Google & CTO of Careem Pay',
      experience: '12 Years',
      nextAvailable: 'Today, 2:00 PM',
      weeklyOverview: 'Sun - Wed',
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
      expertise: ['Operations', 'Legal Compliance'],
      skills: ['Labor Law', 'Corporate Governance', 'Scaling Teams'],
      industries: ['Real Estate', 'Logistics', 'Professional Services'],
      specialization: 'Corporate Governance & Compliance',
      mentorshipStyle: 'Empathetic & Structured',
      languages: ['Arabic', 'English', 'French'],
      bio: language === 'ar' ? 'متخصص في قانون الشركات في الشرق الأوسط والتصميم التنظيمي. خبير في التوسع العابر للحدود وسياسات الموارد البشرية عن بعد.' : 'Specialist in Middle Eastern corporate law and organizational design. Expert in cross-border scaling and remote HR policies.',
      background: 'Senior Legal Advisor & HR Transformation Specialist',
      experience: '15 Years',
      nextAvailable: 'Tomorrow, 10:00 AM',
      weeklyOverview: 'Mon - Fri',
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
      expertise: ['Marketing', 'Brand Identity'],
      skills: ['Performance Marketing', 'SEO/SEM', 'Viral Marketing'],
      industries: ['Retail', 'Consumer Tech', 'Entertainment'],
      specialization: 'Digital Marketing & User Acquisition',
      mentorshipStyle: 'Creative & Analytical',
      languages: ['Arabic', 'English'],
      bio: language === 'ar' ? 'مسوق نمو يركز على مسارات التحويل عالية الأداء للشركات الناشئة B2B. سجل حافل في تقليل تكاليف الاستحواذ.' : 'Growth hacker focused on high-conversion funnels for B2B startups. Proven track record in reducing customer acquisition costs.',
      background: 'Ex-Marketing Director at HungerStation',
      experience: '8 Years',
      nextAvailable: 'Wed, 4:30 PM',
      weeklyOverview: 'Sat, Sun, Tue',
      availableSlots: ['Wed 4:30 PM', 'Thu 9:00 AM', 'Thu 2:00 PM'],
      rating: 5.0,
      studentsCount: 215,
      projectsCount: 42,
      socials: { twitter: '#', website: '#' }
    }
  ];

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
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-primary animate-pulse"></span>
                {t('availableTime')}
            </h4>
            <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar-thin">
                {nextDays.map((day, i) => {
                    const isToday = day.toDateString() === new Date().toDateString();
                    const isAvailable = (i + parseInt(mentor.id)) % 3 !== 0; // Mock availability logic
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
                    className="flex flex-col items-center justify-center min-w-[64px] py-4 rounded-2xl bg-brand-primary/5 border border-dashed border-brand-primary/30 text-brand-primary hover:bg-brand-primary hover:text-white transition-all group"
                >
                    <span className="text-lg">📅</span>
                    <span className="text-[8px] font-bold uppercase mt-1">Full View</span>
                </button>
            </div>
        </div>
    );
  };

  const getIcon = (type: string) => {
    switch(type) {
      case 'check': return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />;
      case 'calendar': return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />;
      case 'clock': return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />;
      case 'users': return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />;
      default: return null;
    }
  };

  return (
    <div className="animate-fade-in w-full bg-brand-bg min-h-screen">
      
      {/* Immersive Header */}
      <div className="bg-white border-b border-slate-100 pt-16 pb-12 text-center relative overflow-hidden">
         <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none"></div>
         <div className="relative z-10 max-w-5xl mx-auto px-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-primary/10 border border-brand-primary/20 text-brand-primary text-[10px] font-bold uppercase tracking-widest mb-6">
               ✨ Mentorship Ecosystem 2025
            </div>
            <h1 className="text-4xl md:text-5xl font-heading font-black text-brand-dark mb-6">{t('mentorsTitle')}</h1>
            <p className="text-slate-500 text-xl max-w-3xl mx-auto leading-relaxed font-medium">
              Scale your digital venture with one-on-one strategic sessions led by proven industry builders.
            </p>
         </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-12">
        
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {stats.map((stat, idx) => (
            <div key={idx} className="bg-white rounded-3xl p-8 shadow-card border border-slate-100 flex flex-col items-center justify-center text-center transition-all hover:-translate-y-1 hover:shadow-elevated">
               <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-5 text-2xl ${stat.bg} ${stat.color} shadow-inner`}>
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    {getIcon(stat.icon)}
                  </svg>
               </div>
               <div className="text-4xl font-black text-brand-dark mb-1 font-mono">{stat.count}</div>
               <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Controls */}
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
                className="w-full md:w-96 px-8 py-4 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-brand-primary/5 focus:border-brand-primary outline-none text-sm font-bold transition-all bg-slate-50/50 group-hover:bg-white"
              />
              <svg className={`absolute ${dir === 'rtl' ? 'left-6' : 'right-6'} top-4 w-6 h-6 text-slate-300 group-focus-within:text-brand-primary transition-colors`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
           </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
           
           <div className="lg:col-span-1 lg:sticky lg:top-24 h-[700px]">
              <AIMentorAssistant mentors={mentorsData} />
           </div>

           <div className="lg:col-span-2 grid grid-cols-1 gap-10">
              {filteredMentors.length > 0 ? (
                 filteredMentors.map(mentor => (
                    <div key={mentor.id} className="group bg-white rounded-[48px] overflow-hidden shadow-card hover:shadow-elevated border border-slate-100 transition-all duration-700 flex flex-col hover:-translate-y-1 relative">
                       
                       <div className="p-10">
                          <div className="flex flex-col md:flex-row gap-10">
                             {/* Identity Panel */}
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
                                <div className="mt-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{mentor.studentsCount}+ Mentored</div>
                             </div>

                             {/* Content Panel */}
                             <div className="flex-1">
                                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
                                   <div>
                                      <h3 className="text-3xl font-black text-brand-dark font-heading leading-tight">{mentor.name}</h3>
                                      <p className="text-sm font-bold text-brand-primary uppercase tracking-[0.25em] mt-3">{mentor.specialization}</p>
                                   </div>
                                   <div className="flex gap-2">
                                      {mentor.socials.linkedin && (
                                         <a href={mentor.socials.linkedin} className="w-11 h-11 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 hover:text-brand-primary hover:border-brand-primary transition-all">
                                            <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                                         </a>
                                      )}
                                   </div>
                                </div>
                                
                                <p className="text-xs text-slate-500 font-bold mb-8 flex items-center gap-3 bg-slate-50 w-fit px-4 py-2 rounded-full border border-slate-100">
                                   <span className="w-2 h-2 rounded-full bg-brand-primary"></span>
                                   {mentor.background} • {mentor.experience} Experience
                                </p>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-8 border-y border-slate-100 mb-8">
                                   <div>
                                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">{t('industrySector')}</h4>
                                      <div className="flex flex-wrap gap-2">
                                         {mentor.industries.map((ind, i) => (
                                            <span key={i} className="px-4 py-2 bg-brand-primary/5 text-brand-primary text-[10px] font-black rounded-xl border border-brand-primary/10">
                                               {ind}
                                            </span>
                                         ))}
                                      </div>
                                   </div>
                                   <div>
                                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Core Focus Skills</h4>
                                      <div className="flex flex-wrap gap-2">
                                         {mentor.skills.map((skill, i) => (
                                            <span key={i} className="px-4 py-2 bg-slate-50 text-slate-600 text-[10px] font-black rounded-xl border border-slate-200">
                                               {skill}
                                            </span>
                                         ))}
                                      </div>
                                   </div>
                                </div>

                                <p className="text-sm text-slate-600 leading-relaxed font-medium mb-10 italic border-l-4 border-brand-accent pl-6 py-2">
                                   "{mentor.bio}"
                                </p>

                                {/* Dynamic Availability Component */}
                                <AvailabilityStrip mentor={mentor} />

                                <div className="mt-10 flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
                                   <button 
                                      onClick={() => setSelectedMentor(mentor)}
                                      className="flex-1 py-5 bg-brand-dark text-white rounded-[24px] font-black text-sm hover:bg-brand-primary hover:shadow-2xl transition-all flex items-center justify-center gap-3 shadow-xl active:scale-95 group"
                                   >
                                      <svg className="w-6 h-6 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                      {t('bookSession')}
                                   </button>
                                   <div className="flex gap-4 bg-slate-50 rounded-[24px] p-2 border border-slate-100">
                                      <div className="flex flex-col justify-center px-6">
                                         <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Format</span>
                                         <span className="text-xs font-bold text-brand-dark">{mentor.mentorshipStyle}</span>
                                      </div>
                                      <div className="w-px h-8 bg-slate-200 self-center"></div>
                                      <div className="flex flex-col justify-center px-6">
                                         <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Languages</span>
                                         <span className="text-xs font-bold text-brand-dark">{mentor.languages.join(', ')}</span>
                                      </div>
                                   </div>
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
                    <button onClick={() => setSearchQuery('')} className="mt-8 text-brand-primary font-black hover:underline text-lg uppercase tracking-widest">Clear Search Filters</button>
                 </div>
              )}
           </div>
        </div>

        {/* Global CTA */}
        <div className="mt-32 p-20 bg-brand-dark rounded-[64px] text-white flex flex-col lg:flex-row items-center justify-between gap-16 overflow-hidden relative border border-white/5">
           <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-primary/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-[120px]"></div>
           <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-brand-accent/5 rounded-full translate-y-1/2 -translate-x-1/2 blur-[100px]"></div>
           
           <div className="relative z-10 max-w-3xl text-center lg:text-start">
              <h3 className="text-5xl font-heading font-black mb-8 leading-tight">Empower the District.<br/><span className="text-brand-primary">Apply as a Mentor.</span></h3>
              <p className="text-slate-400 text-xl font-medium leading-relaxed">
                 We are always looking for visionary leaders to join our premium mentorship network. Share your specialized expertise and help shape the next generation of digital industrial giants.
              </p>
           </div>
           <div className="relative z-10 shrink-0">
              <button className="px-16 py-7 bg-brand-accent text-brand-dark font-black text-xl rounded-[28px] hover:scale-105 transition-transform shadow-[0_25px_60px_rgba(247,198,0,0.35)] hover:brightness-110 active:scale-95 uppercase tracking-widest">
                 Apply to Mentor
              </button>
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
