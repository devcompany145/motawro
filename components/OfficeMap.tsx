
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Business, MatchResult } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { searchBusinessesWithAI, generateBusinessMatches, getRegionalMapInsights } from '../services/geminiService';
import { MY_BUSINESS_GENOME } from '../constants';

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

interface OfficeMapProps {
  businesses: Business[];
  favorites: string[];
  onToggleFavorite: (id: string) => void;
  onRentClick: (business: Business) => void;
  onAddBusiness: (business: Business) => void;
  onUpdateBusiness: (business: Business) => void;
}

const BuildingBlock = React.memo(({ business, isHovered, isSelected, lod, onSelect, onHover, t, mapMode, matchScore }: any) => {
  const isLowLod = lod === 'low';
  const isHighLod = lod === 'high';
  const isDarkMode = mapMode !== 'standard';

  const baseDepth = 40;
  const hoverLift = isHovered ? (isLowLod ? 5 : 30) : 0; 
  
  let statusText = t('available');
  if (business.isOccupied) {
    statusText = mapMode === 'traffic' ? `${business.activeVisitors} ${t('visitorNow')}` : t('occupied');
  }

  const roofStyle = {
    backgroundColor: business.isOccupied ? (isDarkMode ? '#1E293B' : '#0F172A') : '#FFFFFF',
    border: isSelected ? '2px solid #F7C600' : isHovered ? '2px solid #2D89E5' : '1px solid rgba(0,0,0,0.1)'
  };

  return (
    <div
      onClick={(e) => { e.stopPropagation(); onSelect(business); }}
      onMouseEnter={() => onHover(business.id)}
      onMouseLeave={() => onHover(null)}
      className="relative w-full h-full cursor-pointer preserve-3d transition-all duration-300"
      style={{ transform: `translateZ(${baseDepth + hoverLift}px)` }}
    >
        {business.isOccupied ? (
            <div className="absolute inset-0 rounded shadow-lg flex flex-col items-center justify-center p-2 text-center backface-hidden z-20" style={roofStyle}>
                {business.logoUrl && (isHighLod || isHovered) && (
                    <img src={business.logoUrl} alt="" className="w-10 h-10 rounded mb-1 object-cover" />
                )}
                {(isHighLod || isHovered) && <span className="text-[10px] font-bold text-white truncate w-full">{business.name}</span>}
            </div>
        ) : (
            <div className="absolute inset-0 rounded border-2 border-dashed border-slate-300 flex items-center justify-center bg-white/20">
                <span className="text-xl text-slate-300">+</span>
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

  // Maps Grounding State
  const [regionalInsights, setRegionalInsights] = useState<{text: string, links: any[]} | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);

  const currentLOD = useMemo(() => viewState.zoom < 0.5 ? 'low' : viewState.zoom < 1.2 ? 'medium' : 'high', [viewState.zoom]);

  const handleWheel = (e: React.WheelEvent) => {
    setViewState(prev => ({
      ...prev,
      zoom: Math.min(2.5, Math.max(0.2, prev.zoom - e.deltaY * 0.001))
    }));
  };

  const handleMouseDown = (e: React.MouseEvent) => { 
    if ((e.target as HTMLElement).closest('button')) return;
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

  const selectedBusiness = businesses.find(b => b.id === selectedBusinessId) || null;

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
           {/* Control Panel */}
           <div className="absolute top-6 left-6 z-20 flex flex-col gap-4">
               <div className="bg-white/90 backdrop-blur shadow-card border border-white/50 rounded-2xl p-5 w-64 pointer-events-auto">
                   <h2 className="text-xl font-bold text-brand-primary mb-1 font-heading">{t('businessMap')}</h2>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t(mapMode + 'Mode')}</p>
               </div>
               
               {/* Google Maps Grounding Trigger */}
               <button 
                  onClick={fetchRegionalInsights}
                  className="flex items-center gap-3 px-5 py-3 bg-brand-accent text-brand-dark font-bold rounded-xl shadow-lg hover:scale-105 transition-all pointer-events-auto group"
               >
                  <span className="text-lg">🌍</span>
                  <div className="text-start">
                    <div className="text-xs leading-none">Regional Insights</div>
                    <div className="text-[8px] opacity-60 uppercase">Google Maps Grounding</div>
                  </div>
               </button>
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
                className="absolute inset-0 preserve-3d origin-center transition-transform duration-75"
                style={{
                    transform: `translate3d(${viewState.panX}px, ${viewState.panY}px, 0) scale(${viewState.zoom}) rotateX(${viewState.rotateX}deg) rotateZ(${viewState.rotateZ}deg)`,
                }}
           >
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 preserve-3d" style={{ width: CONTAINER_SIZE, height: CONTAINER_SIZE }}>
                    <div className={`absolute inset-0 rounded-3xl border-4 border-white/50 transition-all duration-500 bg-white ${mapMode !== 'standard' ? 'opacity-10' : 'opacity-100'}`}></div>
                    
                    {businesses.map((business) => {
                        const colIndex = business.gridPosition.x - 1;
                        const rowIndex = business.gridPosition.y - 1;
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

           {/* Regional Insights Panel (Google Maps Integration) */}
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
           <div className="w-full lg:w-[400px] bg-white rounded-[32px] shadow-elevated border border-slate-100 flex flex-col z-30 animate-fade-in h-fit shrink-0">
               <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-start rounded-t-[32px]">
                   <div>
                       <h2 className="text-2xl font-bold text-brand-primary font-heading mb-1">{selectedBusiness.name}</h2>
                       <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{selectedBusiness.category}</span>
                   </div>
                   <button onClick={() => setIsSidebarOpen(false)} className="p-2 hover:bg-slate-200 rounded-full">✕</button>
               </div>
               <div className="p-8">
                   <p className="text-slate-600 mb-8 leading-relaxed font-medium">{selectedBusiness.description}</p>
                   <div className="space-y-4">
                       {selectedBusiness.isOccupied ? (
                          <button className="w-full py-4 bg-brand-primary text-white rounded-xl font-bold text-sm shadow-lg hover:brightness-110">{t('contact')}</button>
                       ) : (
                          <button onClick={() => onRentClick(selectedBusiness)} className="w-full py-4 bg-green-600 text-white rounded-xl font-bold text-sm shadow-lg hover:bg-green-500">{t('rentFree')}</button>
                       )}
                   </div>
               </div>
           </div>
       )}
    </div>
  );
};

export default OfficeMap;
