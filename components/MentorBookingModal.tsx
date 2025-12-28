
import React, { useState, useMemo, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

interface MentorBookingModalProps {
  mentor: any;
  onClose: () => void;
  initialDate?: Date;
}

const MentorBookingModal: React.FC<MentorBookingModalProps> = ({ mentor, onClose, initialDate }) => {
  const { t, language, dir } = useLanguage();
  const [selectedDate, setSelectedDate] = useState<Date | null>(initialDate || null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [bookingStep, setBookingStep] = useState<'calendar' | 'slots' | 'confirm' | 'success'>(initialDate ? 'slots' : 'calendar');

  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  useEffect(() => {
    if (initialDate) {
      setSelectedDate(initialDate);
      setBookingStep('slots');
    }
  }, [initialDate]);

  const daysInMonth = useMemo(() => {
    const days = new Date(currentYear, currentMonth + 1, 0).getDate();
    return Array.from({ length: days }, (_, i) => new Date(currentYear, currentMonth, i + 1));
  }, [currentMonth, currentYear]);

  const startDay = new Date(currentYear, currentMonth, 1).getDay();
  const emptyDays = Array(startDay).fill(null);

  const timeSlots = {
    morning: ['09:00 AM', '10:30 AM', '11:45 AM'],
    afternoon: ['01:30 PM', '03:00 PM', '04:15 PM'],
    evening: ['06:00 PM', '07:30 PM']
  };

  const handleDateClick = (date: Date) => {
    if (date < new Date(today.setHours(0,0,0,0))) return;
    setSelectedDate(date);
    setBookingStep('slots');
  };

  const handleConfirm = () => {
    setBookingStep('confirm');
    setTimeout(() => {
        setBookingStep('success');
    }, 2200);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-brand-dark/95 backdrop-blur-2xl animate-fade-in overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-[48px] shadow-2xl overflow-hidden animate-scale-in border border-white/10 flex flex-col max-h-[90vh]">
        
        <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
           <div className="flex items-center gap-5">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black text-white shadow-xl ${mentor.color}`}>
                 {mentor.initials}
              </div>
              <div>
                 <h3 className="font-heading font-black text-2xl text-brand-dark leading-none">{mentor.name}</h3>
                 <p className="text-[10px] text-brand-primary font-black uppercase tracking-[0.2em] mt-2">{t('bookSession')}</p>
              </div>
           </div>
           <button onClick={onClose} className="p-4 hover:bg-slate-200 rounded-2xl transition-all text-slate-400">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
           </button>
        </div>

        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
           
           <div className="flex gap-4 mb-10 bg-slate-50 p-2 rounded-2xl border border-slate-100">
              {['calendar', 'slots', 'success'].map((s, i) => (
                 <div key={s} className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl transition-colors">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${
                       (s === 'calendar' && bookingStep === 'calendar') || (s === 'slots' && bookingStep === 'slots') || (s === 'success' && bookingStep === 'success')
                       ? 'bg-brand-primary text-white' : 'bg-slate-200 text-slate-400'
                    }`}>{i+1}</div>
                    <span className={`text-[10px] font-black uppercase tracking-widest ${
                       (s === 'calendar' && bookingStep === 'calendar') || (s === 'slots' && bookingStep === 'slots') || (s === 'success' && bookingStep === 'success')
                       ? 'text-brand-dark' : 'text-slate-400'
                    }`}>{t(s as any)}</span>
                 </div>
              ))}
           </div>

           {bookingStep === 'calendar' && (
             <div className="animate-fade-in">
                <div className="flex justify-between items-center mb-8">
                   <h4 className="text-lg font-black text-brand-dark flex items-center gap-3">
                      <span className="text-brand-primary">📅</span> {t('selectDate')}
                   </h4>
                   <div className="px-4 py-1.5 bg-brand-primary/10 text-brand-primary rounded-full text-xs font-black font-mono uppercase">
                      {today.toLocaleDateString(language, { month: 'long', year: 'numeric' })}
                   </div>
                </div>

                <div className="grid grid-cols-7 gap-2 text-center mb-6">
                   {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => (
                     <div key={d} className="text-[11px] font-black text-slate-300 uppercase tracking-widest">{d}</div>
                   ))}
                </div>

                <div className="grid grid-cols-7 gap-4">
                   {emptyDays.map((_, i) => <div key={`e-${i}`} />)}
                   {daysInMonth.map((date, i) => {
                     const isPast = date < new Date(today.setHours(0,0,0,0));
                     const isAvailable = !isPast && (i % 4 !== 0); 
                     
                     return (
                       <button
                         key={i}
                         disabled={!isAvailable}
                         onClick={() => handleDateClick(date)}
                         className={`aspect-square rounded-2xl flex flex-col items-center justify-center transition-all relative group
                           ${isAvailable 
                              ? 'bg-slate-50 border border-slate-100 hover:border-brand-primary hover:bg-brand-primary/5 hover:scale-110 cursor-pointer shadow-sm' 
                              : 'opacity-20 cursor-not-allowed bg-slate-100'
                           }
                         `}
                       >
                          <span className={`text-base font-black ${isAvailable ? 'text-brand-dark' : 'text-slate-400'}`}>{date.getDate()}</span>
                          {isAvailable && (
                             <div className="w-1.5 h-1.5 rounded-full bg-brand-primary absolute bottom-2.5 opacity-40 group-hover:opacity-100 shadow-[0_0_8px_rgba(45,137,229,0.5)]"></div>
                          )}
                       </button>
                     );
                   })}
                </div>
             </div>
           )}

           {bookingStep === 'slots' && (
             <div className="animate-slide-up space-y-10">
                <div className="flex items-center gap-6 p-6 bg-brand-primary/5 rounded-3xl border border-brand-primary/10 mb-10 shadow-inner">
                   <div className="w-12 h-12 rounded-2xl bg-brand-primary text-white flex items-center justify-center text-xl shadow-lg">📍</div>
                   <div>
                      <div className="text-[10px] font-black text-brand-primary uppercase tracking-[0.2em] mb-1">Target Date</div>
                      <div className="text-lg font-black text-brand-dark">
                         {selectedDate?.toLocaleDateString(language, { weekday: 'long', month: 'long', day: 'numeric' })}
                      </div>
                   </div>
                   <button onClick={() => setBookingStep('calendar')} className="ml-auto px-4 py-2 bg-white border border-brand-primary/20 text-[10px] font-black text-brand-primary rounded-xl hover:bg-brand-primary hover:text-white transition-all shadow-sm uppercase tracking-widest">Change Date</button>
                </div>

                <div className="space-y-10">
                   {Object.entries(timeSlots).map(([key, slots]) => (
                     <div key={key}>
                        <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-5 pl-2">{t(key as any)}</h5>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                           {slots.map(slot => (
                             <button
                               key={slot}
                               onClick={() => setSelectedSlot(slot)}
                               className={`py-4 px-6 rounded-2xl border-2 text-sm font-black transition-all shadow-sm
                                 ${selectedSlot === slot 
                                    ? 'bg-brand-dark text-white border-brand-dark scale-105 shadow-xl' 
                                    : 'bg-white text-slate-600 border-slate-100 hover:border-brand-primary hover:text-brand-primary hover:bg-brand-primary/5'
                                 }
                               `}
                             >
                                {slot}
                             </button>
                           ))}
                        </div>
                     </div>
                   ))}
                </div>
             </div>
           )}

           {bookingStep === 'confirm' && (
             <div className="py-20 flex flex-col items-center justify-center text-center">
                <div className="relative w-24 h-24 mb-10">
                   <div className="absolute inset-0 border-8 border-slate-100 rounded-full"></div>
                   <div className="absolute inset-0 border-8 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
                   <div className="absolute inset-0 flex items-center justify-center text-2xl">⏳</div>
                </div>
                <h3 className="text-2xl font-black mb-3 text-brand-dark uppercase tracking-tight">Securing Mentor...</h3>
                <p className="text-slate-500 font-medium text-lg">Synchronizing with District Scheduling protocols</p>
             </div>
           )}

           {bookingStep === 'success' && (
             <div className="animate-scale-in text-center py-12 px-4">
                <div className="w-24 h-24 bg-emerald-50 rounded-[32px] flex items-center justify-center mx-auto mb-10 text-emerald-500 shadow-inner relative">
                   <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                   <div className="absolute -top-2 -right-2 w-8 h-8 bg-brand-accent rounded-full border-4 border-white animate-bounce flex items-center justify-center text-xs">✨</div>
                </div>
                <h3 className="text-4xl font-heading font-black text-brand-dark mb-6 tracking-tight">{t('bookingSuccess')}</h3>
                
                <div className="bg-slate-50 p-8 rounded-[40px] border border-slate-100 mb-12 max-w-sm mx-auto shadow-inner">
                   <div className="space-y-5">
                      <div className="flex justify-between items-center border-b border-slate-200 pb-4">
                         <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Strategist</span>
                         <span className="text-sm font-black text-brand-dark">{mentor.name}</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-slate-200 pb-4">
                         <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Date</span>
                         <span className="text-sm font-black text-brand-dark">{selectedDate?.toLocaleDateString(language, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                      <div className="flex justify-between items-center">
                         <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Time Slot</span>
                         <span className="text-sm font-black text-brand-primary">{selectedSlot}</span>
                      </div>
                   </div>
                </div>
                
                <p className="text-slate-500 text-base leading-relaxed mb-12 max-w-md mx-auto">{t('bookingSuccessDesc')}</p>
                
                <button onClick={onClose} className="w-full py-5 bg-brand-dark text-white rounded-[24px] font-black text-lg shadow-2xl hover:bg-black transition-all uppercase tracking-widest active:scale-95">
                   Finalize Session
                </button>
             </div>
           )}
        </div>

        {bookingStep !== 'confirm' && bookingStep !== 'success' && (
          <div className="p-10 border-t border-slate-100 bg-slate-50/80 flex gap-5 shrink-0">
             {bookingStep === 'slots' && (
               <button onClick={() => setBookingStep('calendar')} className="flex-1 py-5 border-2 border-slate-200 bg-white rounded-[24px] font-black text-sm text-slate-400 hover:border-brand-primary hover:text-brand-primary transition-all uppercase tracking-widest shadow-sm">Back</button>
             )}
             <button
               disabled={(bookingStep === 'calendar' && !selectedDate) || (bookingStep === 'slots' && !selectedSlot)}
               onClick={() => {
                 if (bookingStep === 'calendar' && selectedDate) setBookingStep('slots');
                 else if (bookingStep === 'slots' && selectedSlot) handleConfirm();
               }}
               className={`flex-1 py-5 rounded-[24px] font-black text-sm transition-all shadow-xl uppercase tracking-widest
                 ${(bookingStep === 'calendar' && !selectedDate) || (bookingStep === 'slots' && !selectedSlot)
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                    : 'bg-brand-primary text-white hover:brightness-110 active:scale-95 shadow-brand-primary/30'
                 }
               `}
             >
                {bookingStep === 'calendar' ? t('selectDate') : t('confirmBooking')}
             </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MentorBookingModal;
