
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Business, MatchResult } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { getRegionalMapInsights } from '../services/geminiService';
import QRScanner from './QRScanner';

// --- Constants for Spatial Layout ---
const CONTAINER_SIZE = 1200;
const GRID_COLS = 3;
const PADDING = 120;
const GAP = 120;
const CELL_SIZE = (CONTAINER_SIZE - (PADDING * 2) - (GAP * (GRID_COLS - 1))) / GRID_COLS;

const getCellCenter = (gridPos: {x: number, y: number}) => {
    const colIndex = gridPos.x - 1;
    const rowIndex = gridPos.y - 1;
    const x = PADDING + (colIndex * CELL_SIZE) + (colIndex * GAP) + (CELL_SIZE / 2);
    const y = PADDING + (rowIndex * CELL_SIZE) + (rowIndex * GAP) + (CELL_SIZE / 2);
    return { x, y };
};

type MapMode = 'standard' | 'heatmap' | 'networking' | 'traffic' | 'globe';
type SortMode = 'name_asc' | 'name_desc' | 'visitors_desc';

interface OfficeMapProps {
  businesses: Business[];
  favorites: string[];
  onToggleFavorite: (id: string) => void;
  onRentClick: (business: Business) => void;
  onAddBusiness: (business: Business) => void;
  onUpdateBusiness: (business: Business) => void;
}

const BuildingBlock = React.memo(({ business, isHovered, isSelected, isFilteredOut, lod, onSelect, onHover, t, mapMode }: any) => {
  const isHighLod = lod === 'high';
  const isDarkMode = mapMode !== 'standard';

  const baseDepth = 40;
  // Calculate dynamic lift and scale for a premium feel
  const liftAmount = isSelected ? 35 : isHovered ? 15 : 0;
  
  const roofStyle = {
    backgroundColor: business.isOccupied ? (isDarkMode ? '#1E293B' : '#0F172A') : '#FFFFFF',
    border: isSelected ? '4px solid #2D89E5' : isHovered ? '2px solid #2D89E5' : '1px solid rgba(0,0,0,0.1)',
    boxShadow: isSelected 
      ? '0 25px 50px -12px rgba(0, 0, 0, 0.5)' 
      : isHovered 
        ? '0 15px 30px -10px rgba(0, 0, 0, 0.3)' 
        : 'none',
    opacity: isFilteredOut ? 0.2 : 1,
    transition: 'all 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)'
  };

  return (
    <div
      onClick={(e) => { if (!isFilteredOut) { e.stopPropagation(); onSelect(business); } }}
      onMouseEnter={() => !isFilteredOut && onHover(business.id)}
      onMouseLeave={() => onHover(null)}
      className={`relative w-full h-full preserve-3d transition-all duration-500 ease-out 
        ${isFilteredOut ? 'cursor-default grayscale pointer-events-none' : 'cursor-pointer'}
        ${isHovered ? 'scale-105' : 'scale-100'}
        ${isSelected ? 'scale-110' : ''}
      `}
      style={{ transform: `translateZ(${baseDepth + liftAmount}px)` }}
    >
        {business.isOccupied ? (
            <div className="absolute inset-0 rounded flex flex-col items-center justify-center p-2 text-center backface-hidden z-20 transition-all duration-500" style={roofStyle}>
                {/* Logo and Name Priority Display */}
                {business.logoUrl && (isHighLod || isSelected) && (
                  <div className="flex flex-col items-center justify-center w-full h-full overflow-hidden animate-fade-in space-y-1.5">
                    <div className="bg-white p-1 rounded-lg shadow-md border border-slate-100 shrink-0">
                      <img src={business.logoUrl} alt="" className="w-10 h-10 object-contain rounded" />
                    </div>
                    <span className="text-[9px] font-black text-white truncate w-full px-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] uppercase tracking-tighter">
                      {business.name}
                    </span>
                  </div>
                )}
                {isSelected && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-primary text-white text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-tighter shadow-lg z-30 ring-2 ring-white/20">Active Unit</div>}
            </div>
        ) : (
            <div className={`absolute inset-0 rounded border-2 border-dashed border-slate-300 flex items-center justify-center bg-white/20 transition-opacity ${isFilteredOut ? 'opacity-20' : 'opacity-100'}`} style={roofStyle}>
                <span className="text-xl text-slate-300 transition-transform duration-500 group-hover:scale-125">+</span>
            </div>
        )}
    </div>
  );
});

const OfficeMap: React.FC<OfficeMapProps> = ({ businesses, favorites, onToggleFavorite, onRentClick, onAddBusiness, onUpdateBusiness }) => {
  const { t, language } = useLanguage();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const [mapMode, setMapMode] = useState<MapMode>('standard');
  const [viewState, setViewState] = useState({ zoom: 0.8, rotateX: 55, rotateZ: 45, panX: 0, panY: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [showQRModal, setShowQRModal] = useState<string | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'occupied' | 'available'>('all');
  const [sortMode, setSortMode] = useState<SortMode>('name_asc');

  // The specific categories requested for filtering
  const categories = ['TECHNOLOGY', 'ENGINEERING', 'TRANSPORT', 'EDUCATION', 'AVAILABLE'];
  
  const [regionalInsights, setRegionalInsights] = useState<{text: string, links: any[]} | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);

  const filteredBusinesses = useMemo(() => {
    let result = businesses.filter(b => {
      const matchesSearch = b.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = filterCategory === 'all' || b.category === filterCategory;
      const matchesStatus = filterStatus === 'all' || 
          (filterStatus === 'occupied' ? b.isOccupied : !b.isOccupied);
      return matchesSearch && matchesCategory && matchesStatus;
    });

    // Apply Sorting
    return result.sort((a, b) => {
      if (sortMode === 'name_asc') return a.name.localeCompare(b.name, language);
      if (sortMode === 'name_desc') return b.name.localeCompare(a.name, language);
      if (sortMode === 'visitors_desc') return (b.activeVisitors || 0) - (a.activeVisitors || 0);
      return 0;
    });
  }, [businesses, searchQuery, filterCategory, filterStatus, sortMode, language]);

  const currentLOD = useMemo(() => viewState.zoom < 0.5 ? 'low' : viewState.zoom < 1.2 ? 'medium' : 'high', [viewState.zoom]);

  const handleWheel = (e: React.WheelEvent) => {
    setViewState(prev => ({
      ...prev,
      zoom: Math.min(2.5, Math.max(0.2, prev.zoom - e.deltaY * 0.001))
    }));
  };

  const handleMouseDown = (e: React.MouseEvent) => { 
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('input') || (e.target as HTMLElement).closest('select')) return;
    setIsDragging(true);
  };
  
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setViewState(prev => ({ ...prev, panX: prev.panX + e.movementX, panY: prev.panY + e.movementY }));
  };

  const fetchRegionalInsights = async () => {
    setLoadingInsights(true);
    setMapMode('globe');
    const res = await getRegionalMapInsights(language);
    setRegionalInsights(res);
    setLoadingInsights(false);
  };

  const panToBusiness = (business: Business) => {
    const center = getCellCenter(business.gridPosition);
    setSelectedBusinessId(business.id);
    setIsSidebarOpen(true);
    setViewState(prev => ({
      ...prev,
      panX: -(center.x - CONTAINER_SIZE/2) * 1.5,
      panY: -(center.y - CONTAINER_SIZE/2) * 1.5,
      zoom: 1.5,
      rotateX: 45,
      rotateZ: 45
    }));
  };

  const handleQRScan = (scannedId: string) => {
    const found = businesses.find(b => b.id === scannedId);
    if (found) {
      panToBusiness(found);
      setIsScannerOpen(false);
    }
  };

  const selectedBusiness = businesses.find(b => b.id === selectedBusinessId) || null;

  const resetAllFilters = () => {
    setSearchQuery('');
    setFilterCategory('all');
    setFilterStatus('all');
    setSortMode('name_asc');
  };

  return (
    <div className="flex flex-col lg:flex-row h-full gap-6 w-full relative">
       <div 
          className={`relative flex-1 h-[600px] lg:h-full overflow-hidden rounded-[32px] border shadow-inner transition-colors duration-700 ${
              mapMode === 'standard' ? 'bg-[#F1F5F9]' : 'bg-[#0B1121]'
          }`}
          onMouseDown={handleMouseDown} 
          onMouseMove={handleMouseMove} 
          onMouseUp={() => setIsDragging(false)} 
          onMouseLeave={() => setIsDragging(false)}
          onWheel={handleWheel}
       >
           {/* Enhanced Search & Control Panel */}
           <div className="absolute top-6 left-6 z-20 flex flex-col gap-4 w-80 pointer-events-none">
               <div className="bg-white/95 backdrop-blur shadow-elevated border border-slate-200 rounded-3xl p-6 pointer-events-auto flex flex-col max-h-[500px]">
                   <div className="flex items-center justify-between mb-4 shrink-0">
                      <div>
                        <h2 className="text-xl font-black text-brand-dark font-heading leading-tight">{t('businessMap')}</h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{filteredBusinesses.length} {t('results')}</p>
                      </div>
                      {(searchQuery || filterCategory !== 'all' || filterStatus !== 'all') && (
                        <button 
                          onClick={resetAllFilters}
                          className="text-[10px] font-black text-brand-primary hover:underline uppercase"
                        >
                          {t('resetFilters')}
                        </button>
                      )}
                   </div>
                   
                   <div className="relative mb-4 group shrink-0">
                      <input 
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={t('searchPlaceholder')}
                        className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-brand-dark outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all shadow-inner"
                      />
                      <svg className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400 group-focus-within:text-brand-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                   </div>

                   <div className="grid grid-cols-2 gap-3 mb-4 shrink-0">
                      <div>
                         <label className="block text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5 ml-1">{t('categories')}</label>
                         <div className="relative">
                            <select 
                                value={filterCategory}
                                onChange={(e) => setFilterCategory(e.target.value)}
                                className="w-full px-3 py-2 bg-slate-100 border-none rounded-lg text-[10px] font-bold text-slate-600 outline-none cursor-pointer focus:ring-2 focus:ring-brand-primary/10 transition-all appearance-none pr-8"
                            >
                                <option value="all">{t('allCategories')}</option>
                                {categories.map(cat => (
                                   <option key={cat} value={cat}>{t(`cat_${cat}`)}</option>
                                ))}
                            </select>
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                               <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
                            </div>
                         </div>
                      </div>
                      
                      <div>
                         <label className="block text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5 ml-1">{t('status')}</label>
                         <div className="relative">
                            <select 
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value as any)}
                                className="w-full px-3 py-2 bg-slate-100 border-none rounded-lg text-[10px] font-bold text-slate-600 outline-none cursor-pointer focus:ring-2 focus:ring-brand-primary/10 transition-all appearance-none pr-8"
                            >
                                <option value="all">{t('allStatuses')}</option>
                                <option value="occupied">{t('occupied')}</option>
                                <option value="available">{t('available')}</option>
                            </select>
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                               <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
                            </div>
                         </div>
                      </div>
                   </div>

                   {/* --- SORT BY DROPDOWN --- */}
                   <div className="mb-4 shrink-0">
                      <label className="block text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5 ml-1">{t('sortBy')}</label>
                      <div className="relative">
                        <select 
                            value={sortMode}
                            onChange={(e) => setSortMode(e.target.value as SortMode)}
                            className="w-full px-3 py-2 bg-slate-100 border-none rounded-lg text-[10px] font-bold text-slate-600 outline-none cursor-pointer focus:ring-2 focus:ring-brand-primary/10 transition-all appearance-none pr-8"
                        >
                            <option value="name_asc">{t('sortByName')} (A-Z)</option>
                            <option value="name_desc">{t('sortByName')} (Z-A)</option>
                            <option value="visitors_desc">{t('visitorNow')} (High to Low)</option>
                        </select>
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                           <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
                        </div>
                      </div>
                   </div>

                   {/* --- QUICK DIRECTORY LIST --- */}
                   <div className="flex-1 overflow-y-auto custom-scrollbar-thin border-t border-slate-100 pt-4 space-y-2">
                      <h4 className="text-[7px] font-black text-slate-300 uppercase tracking-[0.3em] mb-2 px-1">Quick Directory</h4>
                      {filteredBusinesses.map(biz => (
                         <button 
                            key={biz.id}
                            onClick={() => panToBusiness(biz)}
                            className={`w-full flex items-center gap-3 p-2 rounded-xl transition-all text-start group ${selectedBusinessId === biz.id ? 'bg-brand-primary/10 border border-brand-primary/20' : 'hover:bg-slate-50 border border-transparent'}`}
                         >
                            <div className="w-8 h-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center shrink-0 overflow-hidden">
                               {biz.logoUrl ? <img src={biz.logoUrl} className="w-full h-full object-contain" alt="" /> : <span className="text-[10px] font-bold text-slate-300">🏢</span>}
                            </div>
                            <div className="flex-1 min-w-0">
                               <div className="text-[10px] font-bold text-brand-dark truncate">{biz.name}</div>
                               <div className="flex items-center justify-between">
                                  <span className="text-[7px] font-bold text-slate-400 uppercase">{t(`cat_${biz.category}`)}</span>
                                  {biz.isOccupied && <span className="text-[7px] font-black text-brand-primary">👥 {biz.activeVisitors || 0}</span>}
                                </div>
                            </div>
                         </button>
                      ))}
                      {filteredBusinesses.length === 0 && (
                         <div className="text-center py-4 text-[10px] font-bold text-slate-400 italic">No matches found</div>
                      )}
                   </div>
               </div>
               
               <div className="flex gap-2 pointer-events-auto shrink-0">
                  <button 
                      onClick={fetchRegionalInsights}
                      className="flex-1 flex items-center gap-3 px-4 py-3 bg-brand-accent text-brand-dark font-bold rounded-xl shadow-lg hover:scale-105 transition-all group"
                  >
                      <span className="text-lg">🌍</span>
                      <div className="text-start">
                        <div className="text-[10px] leading-none">Insights</div>
                        <div className="text-[7px] opacity-60 uppercase">Grounding</div>
                      </div>
                  </button>

                  <button 
                      onClick={() => setIsScannerOpen(true)}
                      className="px-5 py-3 bg-brand-primary text-white font-bold rounded-xl shadow-lg hover:scale-105 transition-all group border border-white/10 flex items-center gap-2"
                      title={t('scanQR')}
                  >
                      <span className="text-lg">📷</span>
                      <span className="text-[10px] uppercase font-black hidden sm:inline tracking-tighter">Lens</span>
                  </button>
               </div>
           </div>

           {/* Mode Selectors */}
           <div className="absolute top-6 right-6 z-20 flex flex-col gap-2 p-2 bg-white/90 backdrop-blur rounded-2xl shadow-card">
              {['standard', 'heatmap', 'networking', 'traffic'].map(mode => (
                  <button
                      key={mode}
                      onClick={() => {setMapMode(mode as MapMode); setRegionalInsights(null);}}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${mapMode === mode ? 'bg-brand-primary text-white' : 'text-slate-400 hover:bg-slate-100'}`}
                  >
                      {mode === 'standard' ? '🏙️' : mode === 'heatmap' ? '🔥' : mode === 'networking' ? '🕸️' : '🚗'}
                  </button>
              ))}
           </div>

           {/* Map Canvas */}
           <div 
                className="absolute inset-0 preserve-3d origin-center transition-transform duration-500 ease-out"
                style={{
                    transform: `translate3d(${viewState.panX}px, ${viewState.panY}px, 0) scale(${viewState.zoom}) rotateX(${viewState.rotateX}deg) rotateZ(${viewState.rotateZ}deg)`,
                }}
           >
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 preserve-3d" style={{ width: CONTAINER_SIZE, height: CONTAINER_SIZE }}>
                    <div className={`absolute inset-0 rounded-3xl border-4 border-white/50 transition-all duration-500 bg-white ${mapMode !== 'standard' ? 'opacity-10' : 'opacity-100'}`}></div>
                    
                    {businesses.map((business) => {
                        const colIndex = business.gridPosition.x - 1;
                        const rowIndex = business.gridPosition.y - 1;
                        const isFilteredOut = !filteredBusinesses.some(f => f.id === business.id);

                        return (
                            <div key={business.id} className="absolute preserve-3d" style={{ 
                                width: CELL_SIZE, height: CELL_SIZE, 
                                left: PADDING + colIndex * (CELL_SIZE + GAP), 
                                top: PADDING + rowIndex * (CELL_SIZE + GAP) 
                            }} >
                                <BuildingBlock 
                                    business={business} 
                                    isHovered={hoveredId === business.id} 
                                    isSelected={selectedBusinessId === business.id} 
                                    isFilteredOut={isFilteredOut}
                                    lod={currentLOD} 
                                    onSelect={(b: any) => { setSelectedBusinessId(b.id); setIsSidebarOpen(true); }} 
                                    onHover={setHoveredId} 
                                    t={t} 
                                    mapMode={mapMode}
                                />
                            </div>
                        );
                    })}
               </div>
           </div>

           {/* Regional Insights Panel */}
           {regionalInsights && (
               <div className="absolute bottom-6 left-6 right-6 lg:left-auto lg:right-6 lg:w-[450px] bg-white rounded-3xl shadow-elevated border border-slate-200 z-30 animate-slide-up flex flex-col max-h-[60%] overflow-hidden">
                  <div className="p-6 bg-brand-dark text-white flex justify-between items-center shrink-0">
                     <div className="flex items-center gap-3">
                        <span className="text-2xl">📍</span>
                        <div>
                           <h3 className="font-bold">Real-world Proximity</h3>
                           <p className="text-[10px] text-slate-400 font-mono">Google Maps Grounding Engine</p>
                        </div>
                     </div>
                     <button onClick={() => setRegionalInsights(null)} className="p-2 hover:bg-white/10 rounded-full">✕</button>
                  </div>
                  <div className="p-6 overflow-y-auto custom-scrollbar bg-slate-50 space-y-6">
                     <p className="text-sm text-slate-700 leading-relaxed font-medium whitespace-pre-wrap">{regionalInsights.text}</p>
                     <div className="space-y-3">
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Places Mentioned:</h4>
                        <div className="grid grid-cols-1 gap-2">
                           {regionalInsights.links.map((link, i) => (
                              <a 
                                key={i} 
                                href={link.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200 hover:border-brand-primary group transition-all"
                              >
                                 <span className="text-xs font-bold text-slate-700 group-hover:text-brand-primary">{link.title}</span>
                                 <span className="text-brand-primary">↗</span>
                              </a>
                           ))}
                        </div>
                     </div>
                  </div>
               </div>
           )}

           {loadingInsights && (
               <div className="absolute inset-0 bg-brand-dark/40 backdrop-blur-sm z-40 flex items-center justify-center">
                  <div className="bg-white p-8 rounded-3xl shadow-2xl text-center space-y-4">
                     <div className="w-12 h-12 border-4 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                     <p className="font-bold text-slate-700">Syncing with Google Maps Satellite...</p>
                  </div>
               </div>
           )}
       </div>

       {isSidebarOpen && selectedBusiness && !regionalInsights && (
           <div className="w-full lg:w-[400px] bg-white rounded-[32px] shadow-elevated border border-slate-100 flex flex-col z-30 animate-fade-in h-fit shrink-0 overflow-hidden">
               <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-start rounded-t-[32px]">
                   <div className="flex gap-4 items-center">
                       <div className="w-12 h-12 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-1">
                          {selectedBusiness.logoUrl ? (
                            <img src={selectedBusiness.logoUrl} className="w-full h-full object-contain" alt="" />
                          ) : (
                            <div className="w-full h-full bg-brand-primary text-white flex items-center justify-center font-bold">م</div>
                          )}
                       </div>
                       <div>
                          <h2 className="text-xl font-bold text-brand-primary font-heading leading-tight">{selectedBusiness.name}</h2>
                          <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">{selectedBusiness.category}</span>
                       </div>
                   </div>
                   <button onClick={() => setIsSidebarOpen(false)} className="p-2 hover:bg-slate-200 rounded-full">✕</button>
               </div>
               <div className="p-8">
                   <p className="text-slate-600 mb-8 text-sm leading-relaxed font-medium">{selectedBusiness.description}</p>
                   
                   <div className="space-y-4">
                       {selectedBusiness.isOccupied ? (
                          <div className="flex flex-col gap-3">
                             <div className="grid grid-cols-2 gap-3">
                                <button className="w-full py-3 bg-brand-primary text-white rounded-xl font-bold text-xs shadow-lg hover:brightness-110 flex items-center justify-center gap-2">
                                   ✉️ {t('email')}
                                </button>
                                <button className="w-full py-3 bg-brand-dark text-white rounded-xl font-bold text-xs shadow-lg hover:bg-black flex items-center justify-center gap-2">
                                   🔗 {t('visitSite')}
                                </button>
                             </div>
                             <button 
                                onClick={() => setShowQRModal(selectedBusiness.id)}
                                className="w-full py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
                             >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1l-3 3h2v5h2V8h2l-3-3V4zM4 12v7a2 2 0 002 2h12a2 2 0 002-2v-7" /></svg>
                                {t('showQRCode')}
                             </button>
                          </div>
                       ) : (
                          <button onClick={() => onRentClick(selectedBusiness)} className="w-full py-4 bg-green-600 text-white rounded-xl font-bold text-sm shadow-lg hover:bg-green-500">{t('rentFree')}</button>
                       )}
                   </div>
               </div>
           </div>
       )}

       {/* Business QR Identity Modal */}
       {showQRModal && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-brand-dark/40 backdrop-blur-sm animate-fade-in">
             <div className="bg-white w-full max-w-sm rounded-[40px] shadow-2xl p-10 border border-slate-100 animate-scale-in text-center relative">
                <button onClick={() => setShowQRModal(null)} className="absolute top-6 right-6 p-2 text-slate-300 hover:text-slate-600 transition-colors">✕</button>
                <div className="mb-6">
                   <h3 className="text-xl font-bold text-brand-dark font-heading mb-1">{t('businessQRCode')}</h3>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{businesses.find(b => b.id === showQRModal)?.name}</p>
                </div>
                <div className="bg-slate-50 p-6 rounded-[32px] border-2 border-slate-100 mb-8 inline-block shadow-inner">
                   <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${showQRModal}`} 
                      alt="QR Code" 
                      className="w-48 h-48 mix-blend-multiply"
                   />
                </div>
             </div>
          </div>
       )}

       {/* QR Scanner HUD Overlay */}
       {isScannerOpen && (
          <QRScanner onScan={handleQRScan} onClose={() => setIsScannerOpen(false)} />
       )}
    </div>
  );
};

export default OfficeMap;
