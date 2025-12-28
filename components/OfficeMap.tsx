
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Business, MatchResult } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { getRegionalMapInsights, searchOnlineBusinesses } from '../services/geminiService';
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
  const isHeatmap = mapMode === 'heatmap';
  const isDarkMode = mapMode !== 'standard';

  const baseDepth = 40;
  // Dynamic lift calculation for 3D depth
  const liftAmount = isSelected ? 35 : isHovered ? 15 : 0;
  
  // Heatmap Logic: Intensity based on active visitors (0-100 scale)
  const activityIntensity = Math.min((business.activeVisitors || 0) / 100, 1);
  
  const getHeatmapColor = () => {
    if (!business.isOccupied) return 'rgba(30, 41, 59, 0.4)';
    if (activityIntensity > 0.8) return '#F7C600'; // High activity: Yellow/Gold
    if (activityIntensity > 0.4) return '#2D89E5'; // Medium activity: Tech Blue
    return '#1E293B'; // Low activity: Industrial Graphite
  };

  const roofStyle = {
    backgroundColor: isHeatmap ? getHeatmapColor() : (business.isOccupied ? (isDarkMode ? '#1E293B' : '#0F172A') : '#FFFFFF'),
    border: isSelected ? '4px solid #2D89E5' : isHovered ? '2px solid #2D89E5' : isHeatmap ? `1px solid rgba(255,255,255,${activityIntensity * 0.5})` : '1px solid rgba(0,0,0,0.1)',
    boxShadow: isSelected 
      ? '0 25px 50px -12px rgba(0, 0, 0, 0.5)' 
      : isHeatmap && business.isOccupied
        ? `0 0 ${20 + (activityIntensity * 40)}px ${getHeatmapColor()}${Math.floor(activityIntensity * 99)}`
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
      className={`relative w-full h-full preserve-3d transition-all duration-500 ease-out transform
        ${isFilteredOut ? 'cursor-default grayscale pointer-events-none' : 'cursor-pointer'}
        ${isHovered ? 'scale-105 -translate-y-1' : 'scale-100 translate-y-0'}
        ${isSelected ? 'scale-110 -translate-y-2' : ''}
      `}
      style={{ transform: `translateZ(${baseDepth + liftAmount}px)` }}
    >
        {/* Floor Aura for Heatmap */}
        {isHeatmap && business.isOccupied && !isFilteredOut && (
          <div 
            className="absolute -inset-8 rounded-full blur-2xl opacity-20 pointer-events-none transition-all duration-1000"
            style={{ 
              backgroundColor: getHeatmapColor(),
              transform: 'translateZ(-20px)',
              animation: `pulse ${3 - (activityIntensity * 2)}s infinite alternate` 
            }}
          />
        )}

        {business.isOccupied ? (
            <div className="absolute inset-0 rounded flex flex-col items-center justify-center p-2 text-center backface-hidden z-20 transition-all duration-500" style={roofStyle}>
                {/* Logo and Name Priority Display */}
                {business.logoUrl && (isHighLod || isSelected) && !isHeatmap && (
                  <div className="flex flex-col items-center justify-center w-full h-full overflow-hidden animate-fade-in space-y-1.5">
                    <div className="bg-white p-1 rounded-lg shadow-md border border-slate-100 shrink-0">
                      <img src={business.logoUrl} alt="" className="w-10 h-10 object-contain rounded" />
                    </div>
                    <span className="text-[9px] font-black text-white truncate w-full px-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] uppercase tracking-tighter">
                      {business.name}
                    </span>
                  </div>
                )}
                {isHeatmap && (
                  <div className="flex flex-col items-center justify-center">
                    <span className={`text-sm font-black transition-colors ${activityIntensity > 0.5 ? 'text-white' : 'text-slate-400'}`}>
                      {business.activeVisitors || 0}
                    </span>
                    <span className="text-[7px] font-bold text-slate-500 uppercase tracking-tighter">Activity</span>
                  </div>
                )}
                {isSelected && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-primary text-white text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-tighter shadow-lg z-30 ring-2 ring-white/20">Active Unit</div>}
            </div>
        ) : (
            <div className={`absolute inset-0 rounded border-2 border-dashed border-slate-300 flex items-center justify-center bg-white/20 transition-opacity ${isFilteredOut ? 'opacity-20' : 'opacity-100'}`} style={roofStyle}>
                {!isHeatmap && <span className="text-xl text-slate-300 transition-transform duration-500 group-hover:scale-125">+</span>}
            </div>
        )}
    </div>
  );
});

const OfficeMap: React.FC<OfficeMapProps> = ({ businesses, favorites, onToggleFavorite, onRentClick, onAddBusiness, onUpdateBusiness }) => {
  const { t, language, dir } = useLanguage();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const [mapMode, setMapMode] = useState<MapMode>('standard');
  const [viewState, setViewState] = useState({ zoom: 0.8, rotateX: 55, rotateZ: 45, panX: 0, panY: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isWebSearch, setIsWebSearch] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [sortMode, setSortMode] = useState<SortMode>('name_asc');

  // Defined Categories
  const categories = ['TECHNOLOGY', 'ENGINEERING', 'TRANSPORT', 'EDUCATION', 'AVAILABLE'];
  
  const [regionalInsights, setRegionalInsights] = useState<{text: string, links: any[]} | null>(null);
  const [webResults, setWebResults] = useState<{text: string, links: any[]} | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);

  const filteredBusinesses = useMemo(() => {
    let result = businesses.filter(b => {
      const matchesSearch = b.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = filterCategory === 'all' || b.category === filterCategory;
      return matchesSearch && matchesCategory;
    });

    return result.sort((a, b) => {
      if (sortMode === 'name_asc') return a.name.localeCompare(b.name, language);
      if (sortMode === 'name_desc') return b.name.localeCompare(a.name, language);
      if (sortMode === 'visitors_desc') return (b.activeVisitors || 0) - (a.activeVisitors || 0);
      return 0;
    });
  }, [businesses, searchQuery, filterCategory, sortMode, language]);

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

  const performWebSearch = async () => {
    if (!searchQuery.trim()) return;
    setLoadingInsights(true);
    const res = await searchOnlineBusinesses(searchQuery, language);
    setWebResults(res);
    setLoadingInsights(false);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setFilterCategory('all');
    setSortMode('name_asc');
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

  const selectedBusiness = businesses.find(b => b.id === selectedBusinessId);

  return (
    <div 
      className={`w-full h-full relative overflow-hidden transition-colors duration-1000 cursor-grab active:cursor-grabbing select-none ${mapMode === 'standard' ? 'bg-slate-900' : 'bg-brand-dark'}`}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={() => setIsDragging(false)}
      onMouseLeave={() => setIsDragging(false)}
    >
      {/* HUD & Controls */}
      <div className="absolute top-6 left-6 z-40 flex flex-col gap-4 w-72">
        <div className="bg-white/10 backdrop-blur-md border border-white/10 p-4 rounded-2xl shadow-2xl">
           <div className="flex gap-2 mb-3">
              <button 
                 onClick={() => setIsWebSearch(false)}
                 className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${!isWebSearch ? 'bg-brand-primary text-white shadow-lg' : 'bg-white/5 text-white/50 hover:text-white'}`}
              >
                 District
              </button>
              <button 
                 onClick={() => setIsWebSearch(true)}
                 className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${isWebSearch ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white/5 text-white/50 hover:text-white'}`}
              >
                 Global
              </button>
           </div>

           <div className="relative">
              <input 
                 type="text" 
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 onKeyDown={(e) => e.key === 'Enter' && isWebSearch && performWebSearch()}
                 placeholder={isWebSearch ? t('searchPlaceholderWeb') : t('searchPlaceholder')}
                 className={`w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm outline-none focus:border-brand-primary ${isWebSearch ? 'pr-12' : ''}`}
              />
              {isWebSearch && (
                 <button 
                    onClick={performWebSearch}
                    disabled={loadingInsights}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-lg hover:brightness-110 disabled:opacity-50"
                 >
                    {loadingInsights ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : "🔍"}
                 </button>
              )}
           </div>

           {!isWebSearch && (
              <div className="grid grid-cols-1 gap-2 mt-3 animate-fade-in">
                 <div className="flex flex-col gap-1">
                    <div className="flex justify-between items-center px-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{t('categories')}</label>
                      {filterCategory !== 'all' && (
                        <button onClick={() => setFilterCategory('all')} className="text-[9px] font-black text-brand-primary uppercase hover:underline">Reset</button>
                      )}
                    </div>
                    <select 
                       value={filterCategory}
                       onChange={(e) => setFilterCategory(e.target.value)}
                       className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-xs text-white outline-none cursor-pointer hover:bg-white/10 appearance-none shadow-inner"
                       style={{ backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'white\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'%3e%3c/polyline%3e%3c/svg%3e")', backgroundRepeat: 'no-repeat', backgroundPosition: dir === 'rtl' ? 'left 0.5rem center' : 'right 0.5rem center', backgroundSize: '1em' }}
                    >
                       <option value="all" className="bg-slate-800 text-white">{t('allCategories')}</option>
                       {categories.map(c => <option key={c} value={c} className="bg-slate-800 text-white">{t(`cat_${c}`)}</option>)}
                    </select>
                 </div>

                 <div className="flex flex-col gap-1 mt-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">{t('sortBy')}</label>
                    <select 
                       value={sortMode}
                       onChange={(e) => setSortMode(e.target.value as SortMode)}
                       className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-xs text-white outline-none cursor-pointer hover:bg-white/10 appearance-none shadow-inner"
                       style={{ backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'white\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'%3e%3c/polyline%3e%3c/svg%3e")', backgroundRepeat: 'no-repeat', backgroundPosition: dir === 'rtl' ? 'left 0.5rem center' : 'right 0.5rem center', backgroundSize: '1em' }}
                    >
                       <option value="name_asc" className="bg-slate-800 text-white">{t('sortNameAsc')}</option>
                       <option value="name_desc" className="bg-slate-800 text-white">{t('sortNameDesc')}</option>
                       <option value="visitors_desc" className="bg-slate-800 text-white">{t('sortVisitors')}</option>
                    </select>
                 </div>

                 <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{filteredBusinesses.length} {t('results')}</span>
                    {(searchQuery || filterCategory !== 'all') && (
                       <button onClick={handleResetFilters} className="text-[10px] font-black text-slate-400 hover:text-white uppercase tracking-widest transition-colors">Clear All</button>
                    )}
                 </div>
              </div>
           )}
        </div>

        <div className="flex gap-2">
           <button onClick={() => setViewState({ zoom: 0.8, rotateX: 55, rotateZ: 45, panX: 0, panY: 0 })} className="flex-1 bg-white/10 backdrop-blur-md border border-white/10 py-2 rounded-xl text-white text-[10px] font-bold uppercase tracking-widest hover:bg-white/20">Reset View</button>
           <button onClick={() => setIsScannerOpen(true)} className="flex-1 bg-brand-primary py-2 rounded-xl text-white text-[10px] font-bold uppercase tracking-widest hover:brightness-110">Scan QR</button>
        </div>
      </div>

      {/* Mode Switcher */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 bg-white/10 backdrop-blur-md border border-white/10 p-1.5 rounded-2xl flex gap-1 shadow-2xl">
         {(['standard', 'heatmap', 'globe'] as MapMode[]).map(mode => (
           <button 
             key={mode} 
             onClick={() => mode === 'globe' ? fetchRegionalInsights() : setMapMode(mode)}
             className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${mapMode === mode ? 'bg-brand-primary text-white' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
           >
             {mode}
           </button>
         ))}
      </div>

      {/* 3D Map Viewport */}
      <div 
        className="absolute inset-0 preserve-3d transition-transform duration-700 ease-out pointer-events-none"
        style={{
          transform: `
            perspective(1200px) 
            translateX(${viewState.panX}px) 
            translateY(${viewState.panY}px) 
            rotateX(${viewState.rotateX}deg) 
            rotateZ(${viewState.rotateZ}deg) 
            scale(${viewState.zoom})
          `
        }}
      >
        <div 
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border-[10px] rounded-[40px] shadow-[0_0_100px_rgba(0,0,0,0.5)] transition-all duration-1000 ${mapMode === 'standard' ? 'bg-slate-800/50 border-slate-700/50' : 'bg-slate-900 border-indigo-900/50'}`}
          style={{ width: CONTAINER_SIZE, height: CONTAINER_SIZE }}
        >
          {/* Tech Grid for Dark Modes */}
          {mapMode !== 'standard' && (
            <div className="absolute inset-0 bg-grid-tech-dark opacity-10 rounded-[30px]" />
          )}

          {/* Blocks */}
          {businesses.map(business => {
            const center = getCellCenter(business.gridPosition);
            const isSelected = selectedBusinessId === business.id;
            const isHovered = hoveredId === business.id;
            const isFilteredOut = !filteredBusinesses.find(b => b.id === business.id);

            return (
              <div 
                key={business.id}
                className="absolute pointer-events-auto"
                style={{
                  width: CELL_SIZE,
                  height: CELL_SIZE,
                  left: center.x - CELL_SIZE/2,
                  top: center.y - CELL_SIZE/2,
                }}
              >
                <BuildingBlock 
                  business={business}
                  isHovered={isHovered}
                  isSelected={isSelected}
                  isFilteredOut={isFilteredOut}
                  lod={currentLOD}
                  onSelect={panToBusiness}
                  onHover={setHoveredId}
                  t={t}
                  mapMode={mapMode}
                />
              </div>
            );
          })}
        </div>
      </div>

      {isScannerOpen && <QRScanner onScan={handleQRScan} onClose={() => setIsScannerOpen(false)} />}

      {isSidebarOpen && selectedBusiness && (
         <div className="absolute top-0 right-0 h-full w-96 bg-white shadow-2xl z-50 animate-slide-left flex flex-col">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center">
               <h3 className="text-xl font-black text-brand-dark uppercase tracking-tight">{selectedBusiness.name}</h3>
               <button onClick={() => setIsSidebarOpen(false)} className="text-slate-400 hover:text-slate-900 transition-colors text-2xl">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
               <div className="flex flex-col items-center mb-8">
                  <div className="w-24 h-24 rounded-3xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-4 shadow-sm">
                     {selectedBusiness.logoUrl ? <img src={selectedBusiness.logoUrl} alt="" className="w-16 h-16 object-contain" /> : <span className="text-4xl">🏢</span>}
                  </div>
                  <span className="px-3 py-1 bg-brand-primary/10 text-brand-primary rounded-full text-[10px] font-black uppercase tracking-widest">{selectedBusiness.category}</span>
               </div>
               
               <div className="space-y-6">
                  <section>
                     <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">{t('aboutCompany')}</h4>
                     <p className="text-sm text-slate-600 leading-relaxed">{selectedBusiness.description}</p>
                  </section>
                  
                  {selectedBusiness.isOccupied ? (
                    <>
                      <section>
                         <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">{t('servicesOffered')}</h4>
                         <div className="flex flex-wrap gap-2">
                            {selectedBusiness.services?.map(s => <span key={s} className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold">{s}</span>)}
                         </div>
                      </section>
                      <button className="w-full py-4 bg-brand-primary text-white rounded-2xl font-bold shadow-lg hover:brightness-110 transition-all">{t('contact')}</button>
                    </>
                  ) : (
                    <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 text-center">
                       <p className="text-sm text-slate-500 mb-6">{t('spaceAvailable')}</p>
                       <button onClick={() => onRentClick(selectedBusiness)} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold shadow-lg hover:bg-emerald-700 transition-all">{t('rentThisOffice')}</button>
                    </div>
                  )}
               </div>
            </div>
         </div>
      )}

      {/* Regional Insights Modal */}
      {mapMode === 'globe' && regionalInsights && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-white/95 backdrop-blur-xl rounded-[40px] shadow-2xl p-10 z-[60] animate-scale-in border border-white/20">
           <div className="flex justify-between items-center mb-8">
              <h3 className="text-3xl font-black text-brand-dark uppercase tracking-tighter flex items-center gap-3">
                 <span className="w-2 h-8 bg-brand-primary rounded-full"></span>
                 Regional AI Insights
              </h3>
              <button onClick={() => setMapMode('standard')} className="text-slate-400 hover:text-slate-900 transition-colors">✕</button>
           </div>
           <p className="text-lg text-slate-600 leading-relaxed mb-8">{regionalInsights.text}</p>
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {regionalInsights.links.map((link, i) => (
                <a key={i} href={link.url} target="_blank" rel="noopener noreferrer" className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between group hover:border-brand-primary transition-all">
                   <span className="font-bold text-slate-800 truncate">{link.title}</span>
                   <span className="text-brand-primary group-hover:translate-x-1 transition-transform">→</span>
                </a>
              ))}
           </div>
        </div>
      )}

      {/* Web Search Results Modal */}
      {webResults && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl bg-brand-dark/95 backdrop-blur-xl rounded-[40px] shadow-2xl p-10 z-[70] animate-scale-in border border-white/10 text-white flex flex-col max-h-[85vh]">
           <div className="flex justify-between items-center mb-8 shrink-0">
              <div>
                 <h3 className="text-3xl font-black uppercase tracking-tighter flex items-center gap-3 text-indigo-400">
                    <span className="w-2 h-8 bg-indigo-500 rounded-full"></span>
                    {t('globalDiscovery')}
                 </h3>
                 <p className="text-[10px] text-slate-500 font-mono mt-1 uppercase tracking-widest">Grounding Query: {searchQuery}</p>
              </div>
              <button onClick={() => setWebResults(null)} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-white/10 text-slate-400 hover:text-white">✕</button>
           </div>
           
           <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
              <div className="bg-white/5 rounded-3xl p-8 border border-white/10 mb-8">
                 <p className="text-lg text-slate-300 leading-relaxed whitespace-pre-wrap">{webResults.text}</p>
              </div>

              {webResults.links.length > 0 && (
                 <section>
                    <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.25em] mb-6 flex items-center gap-2">
                       <span className="w-4 h-px bg-indigo-500/50"></span>
                       {t('searchSources')}
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                       {webResults.links.map((link, i) => (
                          <a key={i} href={link.url} target="_blank" rel="noopener noreferrer" className="p-5 bg-white/5 border border-white/10 rounded-[24px] flex flex-col gap-2 group hover:bg-indigo-600/20 hover:border-indigo-500 transition-all">
                             <div className="flex justify-between items-start">
                                <span className="text-xs font-black text-slate-400 group-hover:text-indigo-300">SOURCE {i + 1}</span>
                                <span className="text-indigo-500 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform">↗</span>
                             </div>
                             <span className="font-bold text-white leading-tight line-clamp-2">{link.title}</span>
                          </a>
                       ))}
                    </div>
                 </section>
              )}
           </div>

           <div className="mt-8 pt-8 border-t border-white/5 flex justify-center shrink-0">
              <button onClick={() => setWebResults(null)} className="px-12 py-4 bg-white/5 border border-white/10 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-white/10 transition-all">Close Intelligence Panel</button>
           </div>
        </div>
      )}
    </div>
  );
};

export default OfficeMap;
