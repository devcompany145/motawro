
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

  // Helper to resolve glow color from Tailwind background class
  const getGlowColor = (colorClass: string) => {
    if (!colorClass) return 'rgba(45, 137, 229, 0.4)';
    if (colorClass.includes('cyan')) return 'rgba(6, 182, 212, 0.6)';
    if (colorClass.includes('purple')) return 'rgba(168, 85, 247, 0.6)';
    if (colorClass.includes('orange')) return 'rgba(249, 115, 22, 0.6)';
    if (colorClass.includes('emerald')) return 'rgba(16, 185, 129, 0.6)';
    if (colorClass.includes('blue')) return 'rgba(59, 130, 246, 0.6)';
    if (colorClass.includes('indigo')) return 'rgba(79, 70, 229, 0.6)';
    return 'rgba(45, 137, 229, 0.4)';
  };

  const glowColor = getGlowColor(business.color);
  
  const roofStyle = {
    backgroundColor: business.isOccupied ? (isDarkMode ? '#1E293B' : '#0F172A') : '#FFFFFF',
    border: isSelected ? '4px solid #2D89E5' : isHovered ? '2px solid #2D89E5' : '1px solid rgba(0,0,0,0.1)',
    boxShadow: isSelected 
      ? '0 0 30px rgba(45, 137, 229, 0.6)' 
      : isHovered 
        ? `0 0 25px ${glowColor}` 
        : 'none',
    transform: isSelected ? 'scale(1.05) translateZ(10px)' : 'scale(1)',
    transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
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
                {business.logoUrl && (isHighLod || isSelected) && (
                  <div className="flex flex-col items-center justify-center w-full h-full overflow-hidden animate-fade-in">
                    <img src={business.logoUrl} alt="" className="w-12 h-12 rounded mb-1 object-cover shadow-sm bg-white" />
                    <span className="text-[10px] font-black text-white truncate w-full px-1 drop-shadow-md">{business.name}</span>
                  </div>
                )}
                {isSelected && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-primary text-white text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-tighter shadow-lg z-30">Active Unit</div>}
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
  const { t, language, dir } = useLanguage();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const [mapMode, setMapMode] = useState<MapMode>('standard');
  const [viewState, setViewState] = useState({ zoom: 0.8, rotateX: 55, rotateZ: 45, panX: 0, panY: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [showQRModal, setShowQRModal] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Maps Grounding State
  const [regionalInsights, setRegionalInsights] = useState<{text: string, links: any[]} | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);

  const currentLOD = useMemo(() => viewState.zoom < 0.5 ? 'low' : viewState.zoom < 1.2 ? 'medium' : 'high', [viewState.zoom]);

  const filteredSearchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return businesses.filter(b => 
      b.isOccupied && b.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [businesses, searchQuery]);

  const handleWheel = (e: React.WheelEvent) => {
    setViewState(prev => ({
      ...prev,
      zoom: Math.min(2.5, Math.max(0.2, prev.zoom - e.deltaY * 0.001))
    }));
  };

  const handleMouseDown = (e: React.MouseEvent) => { 
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('input')) return;
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
    setSearchQuery('');

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
           <div className="absolute top-6 left-6 z-20 flex flex-col gap-4 w-72 pointer-events-none">
               <div className="bg-white/90 backdrop-blur shadow-card border border-white/50 rounded-2xl p-5 pointer-events-auto">
                   <h2 className="text-xl font-bold text-brand-primary mb-1 font-heading">{t('businessMap')}</h2>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">{t(mapMode + 'Mode')}</p>
                   
                   {/* Search Bar */}
                   <div className="relative">
                      <input 
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={t('searchPlaceholder')}
                        className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-brand-dark outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all"
                      />
                      <svg className="absolute left-3 top-3 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      
                      {/* Search Results Dropdown */}
                      {filteredSearchResults.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-elevated border border-slate-100 max-h-48 overflow-y-auto custom-scrollbar overflow-x-hidden animate-slide-up">
                           {filteredSearchResults.map(res => (
                              <button 
                                key={res.id}
                                onClick={() => panToBusiness(res)}
                                className="w-full text-start px-4 py-3 hover:bg-slate-50 flex items-center gap-3 border-b border-slate-50 last:border-0"
                              >
                                 <div className="w-6 h-6 rounded bg-brand-primary/10 flex items-center justify-center shrink-0">
                                    <span className="text-[10px] font-bold text-brand-primary">{res.name.charAt(0)}</span>
                                 </div>
                                 <div className="overflow-hidden">
                                    <p className="text-xs font-bold text-brand-dark truncate">{res.name}</p>
                                    <p className="text-[9px] text-slate-400 truncate uppercase">{res.category}</p>
                                 </div>
                              </button>
                           ))}
                        </div>
                      )}
                   </div>
               </div>
               
               {/* Actions Row */}
               <div className="flex gap-2 pointer-events-auto">
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
                   
                   {selectedBusiness.services && selectedBusiness.services.length > 0 && (
                      <div className="mb-8">
                         <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">{t('servicesOffered')}</h4>
                         <div className="flex flex-wrap gap-2">
                            {selectedBusiness.services.map((s, i) => (
                               <span key={i} className="px-3 py-1 bg-blue-50 text-brand-primary rounded-lg text-[10px] font-bold border border-blue-100">{s}</span>
                            ))}
                         </div>
                      </div>
                   )}

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
                <p className="text-xs text-slate-500 font-medium leading-relaxed px-4">
                   This unique digital ID allows instant mapping and interaction within the Digital District environment.
                </p>
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
