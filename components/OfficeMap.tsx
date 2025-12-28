
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Business, MatchResult } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { searchBusinessesWithAI, analyzeMapTrends, generateBusinessMatches } from '../services/geminiService';
import { MY_BUSINESS_GENOME } from '../constants';

declare const ResizeObserver: any;

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

interface BuildingBlockProps {
  business: Business;
  isHovered: boolean;
  isSelected: boolean;
  isFeatured: boolean;
  lod: 'high' | 'medium' | 'low';
  onSelect: (business: Business) => void;
  onHover: (id: string | null) => void;
  t: (key: string) => string;
  mapMode: MapMode;
  matchScore?: number;
}

const BuildingBlock = React.memo(({ business, isHovered, isSelected, isFeatured, lod, onSelect, onHover, t, mapMode, matchScore }: BuildingBlockProps) => {
  const isLowLod = lod === 'low';
  const isHighLod = lod === 'high';
  const isDarkMode = mapMode === 'heatmap' || mapMode === 'globe' || mapMode === 'networking' || mapMode === 'traffic';

  const baseDepth = 40;
  const hoverLift = isHovered ? (isLowLod ? 5 : 30) : 0; 
  
  let statusColor = 'bg-slate-100'; 
  let dotColor = 'bg-slate-400'; 
  let statusText = t('available');

  let heatmapIntensity = 0;
  if (mapMode === 'heatmap' && business.isOccupied) {
     const visitors = business.activeVisitors || 0;
     heatmapIntensity = Math.min(visitors / 50, 1); 
  }

  const adjustedIntensity = Math.pow(heatmapIntensity, 0.85);
  const heatmapHue = 220 - (adjustedIntensity * 220);
  const heatmapSat = 65 + (adjustedIntensity * 30); 
  const heatmapLight = 35 + (adjustedIntensity * 20); 
  const heatmapColorString = `hsl(${heatmapHue}, ${heatmapSat}%, ${heatmapLight}%)`;

  const showPulse = !isLowLod && (
    (mapMode === 'heatmap' && heatmapIntensity > 0.7) || 
    (mapMode === 'traffic' && (business.activeVisitors || 0) > 40)
  );
  const pulseClass = showPulse ? 'animate-pulse-slow' : '';

  if (business.isOccupied) {
      if (mapMode === 'heatmap') {
         statusColor = 'shadow-glow text-white'; 
         dotColor = 'bg-white';
         statusText = `${business.activeVisitors} ${t('visitorNow')}`;
      } else if (mapMode === 'traffic') {
         const visitors = business.activeVisitors || 0;
         statusColor = visitors > 40 ? 'bg-rose-600 shadow-glow' : visitors > 20 ? 'bg-amber-500 shadow-glow' : 'bg-emerald-500 shadow-glow';
         dotColor = 'bg-white';
         statusText = `${visitors} ${t('visitorNow')}`;
      } else if (mapMode === 'networking') {
         statusColor = 'bg-brand-primary shadow-glow';
         dotColor = 'bg-brand-accent';
         statusText = matchScore ? `${matchScore}% Match` : t('occupied');
      } else {
          statusColor = 'bg-brand-primary'; 
          dotColor = 'bg-emerald-400';
          statusText = t('occupied');
      }
  }

  const borderColor = isSelected 
    ? 'border-brand-accent ring-2 ring-brand-accent ring-opacity-50' 
    : isHovered
      ? 'border-brand-primary shadow-2xl'
      : (isDarkMode ? 'border-white/10' : 'border-white/20');

  const showContent = isHighLod || isHovered;
  const showBanner = !isLowLod && (showContent || isSelected) && business.isOccupied && mapMode !== 'globe'; 
  
  const faceClass = `absolute inset-0 backface-hidden ${!isLowLod ? 'transition-all duration-300' : ''}`;

  const { frontFacade, sideFacade, roofStyle } = useMemo(() => {
    const isOcc = business.isOccupied;
    let wallBase = isOcc ? '#1E293B' : '#F1F5F9';
    let wallGradient = '';

    if (isOcc) {
        if (mapMode === 'heatmap') {
             wallBase = heatmapColorString;
             if (!isLowLod) {
                const topColor = `hsl(${heatmapHue}, ${heatmapSat}%, ${Math.min(100, heatmapLight + 15)}%)`;
                const bottomColor = `hsl(${heatmapHue}, ${heatmapSat}%, ${Math.max(0, heatmapLight - 15)}%)`;
                wallGradient = `
                  radial-gradient(circle at 50% 30%, hsla(${heatmapHue}, ${heatmapSat}%, 100%, 0.15) 0%, transparent 60%),
                  linear-gradient(to bottom, ${topColor} 0%, ${heatmapColorString} 50%, ${bottomColor} 100%)
                `;
             }
        } else if (mapMode === 'networking' || mapMode === 'traffic') {
             wallBase = '#1E293B'; 
        } else if (mapMode === 'globe') {
             wallBase = '#3b82f6';
        }
    }

    if (isLowLod) {
        return {
            frontFacade: { backgroundColor: wallBase },
            sideFacade: { backgroundColor: wallBase, filter: 'brightness(0.7)' },
            roofStyle: { backgroundColor: isOcc ? (mapMode === 'heatmap' ? wallBase : '#0F172A') : '#FFFFFF', border: isOcc ? 'none' : '1px solid #e2e8f0' }
        };
    }

    const transitionStyle = 'background-color 0.6s cubic-bezier(0.4, 0, 0.2, 1), background-image 0.6s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.6s ease';
    const windowPattern = `linear-gradient(to bottom, transparent 5%, rgba(255,255,255,0.4) 5%, rgba(255,255,255,0.4) 20%, transparent 20%, transparent 40%, rgba(255,255,255,0.4) 40%, rgba(255,255,255,0.4) 55%, transparent 55%), linear-gradient(to right, transparent 10%, rgba(0,0,0,0.1) 10%, rgba(0,0,0,0.1) 15%, transparent 15%, transparent 85%, rgba(0,0,0,0.1) 85%, rgba(0,0,0,0.1) 90%, transparent 90%)`;

    const finalBgImage = (mapMode === 'heatmap' && wallGradient) ? `${windowPattern}, ${wallGradient}` : windowPattern;
    
    let glowStyle = 'none';
    if (isOcc) {
        const glowColor = mapMode === 'heatmap' ? heatmapColorString : '#3b82f6';
        const coreAlpha = mapMode === 'heatmap' ? (0.3 + (heatmapIntensity * 0.4)) : 0.4;
        const haloAlpha = coreAlpha * 0.4;
        const coreRadius = mapMode === 'heatmap' ? (10 + (heatmapIntensity * 20)) : 15;
        const haloRadius = coreRadius * 2.5;

        const coreColor = mapMode === 'heatmap' ? `hsla(${heatmapHue}, ${heatmapSat}%, ${heatmapLight}%, ${coreAlpha})` : `rgba(59, 130, 246, ${coreAlpha})`;
        const haloColor = mapMode === 'heatmap' ? `hsla(${heatmapHue}, ${heatmapSat}%, ${heatmapLight}%, ${haloAlpha})` : `rgba(59, 130, 246, ${haloAlpha})`;
        
        glowStyle = `0 0 ${coreRadius}px ${coreColor}, 0 0 ${haloRadius}px ${haloColor}`;
    }

    return {
        frontFacade: { 
          backgroundColor: wallBase, 
          backgroundImage: finalBgImage, 
          backgroundSize: '100% 40px', 
          boxShadow: `inset 0 0 40px rgba(0,0,0,0.3), ${glowStyle}`, 
          transition: transitionStyle 
        },
        sideFacade: { 
          backgroundColor: wallBase, 
          backgroundImage: finalBgImage, 
          backgroundSize: '100% 40px', 
          filter: 'brightness(0.75)', 
          transition: transitionStyle 
        },
        roofStyle: { 
            backgroundColor: isOcc ? (mapMode === 'heatmap' ? heatmapColorString : '#0F172A') : '#FFFFFF', 
            backgroundImage: (mapMode === 'heatmap' && !isLowLod) ? `
              radial-gradient(circle at center, hsla(${heatmapHue}, ${heatmapSat}%, ${Math.min(100, heatmapLight + 25)}%, 0.4) 0%, transparent 80%),
              radial-gradient(circle at 0% 0%, rgba(255,255,255,0.1) 0%, transparent 50%)
            ` : 'none',
            boxShadow: mapMode === 'heatmap' ? `inset 0 0 15px rgba(255,255,255,0.2)` : 'none',
            transition: transitionStyle 
        }
    };
  }, [business.isOccupied, lod, mapMode, heatmapIntensity, heatmapHue, heatmapSat, heatmapLight, heatmapColorString, isLowLod]);

  return (
    <div
      onClick={(e) => { e.stopPropagation(); onSelect(business); }}
      onMouseEnter={() => onHover(business.id)}
      onMouseLeave={() => onHover(null)}
      className={`relative w-full h-full group pointer-events-auto cursor-pointer preserve-3d transition-opacity duration-500 ${pulseClass}`}
    >
        <div 
          className={`w-full h-full preserve-3d transition-transform duration-700 ease-out will-change-transform`}
          style={{ transform: `translateZ(${baseDepth + hoverLift}px)` }}
        >
            {business.isOccupied ? (
                <>
                  <div className={`absolute inset-0 border-2 ${borderColor} rounded-sm overflow-hidden flex flex-col items-center justify-center p-2 text-center backface-hidden z-20 transition-all`} style={roofStyle}>
                      {mapMode === 'networking' && matchScore && (
                        <div className="absolute top-2 left-2 bg-brand-accent text-brand-dark text-[8px] font-bold px-1.5 py-0.5 rounded shadow-sm animate-bounce">
                           Match
                        </div>
                      )}
                      {showContent && (
                        <div className="animate-fade-in flex flex-col items-center relative z-10">
                          <div className="w-12 h-12 rounded-lg bg-white p-0.5 border border-slate-700/50 shadow-lg mb-2">
                              {business.logoUrl ? (
                                  <img src={business.logoUrl} alt="" className="w-full h-full object-cover rounded" />
                              ) : (
                                  <div className="w-full h-full bg-slate-900 flex items-center justify-center text-[8px] text-white">LOGO</div>
                              )}
                          </div>
                          {isHighLod && (
                             <h3 className="font-sans font-bold text-white text-[9px] truncate w-full bg-black/40 rounded px-1 backdrop-blur-sm transition-all">{business.name}</h3>
                          )}
                        </div>
                      )}
                  </div>
                  <div className={`${faceClass} origin-bottom rotate-x-90 h-[40px] bottom-0 border-b border-white/5`} style={frontFacade}></div>
                  <div className={`${faceClass} origin-top rotate-x-[-90deg] h-[40px] top-0 brightness-75`} style={frontFacade} />
                  <div className={`${faceClass} origin-right rotate-y-90 w-[40px] right-0 top-0 bottom-0`} style={sideFacade} />
                  <div className={`${faceClass} origin-left rotate-y-[-90deg] w-[40px] left-0 top-0 bottom-0`} style={sideFacade} />
                </>
            ) : (
                <div className="w-full h-full relative preserve-3d">
                  <div className={`absolute inset-0 border-2 ${isDarkMode ? 'border-white/10 bg-slate-800/40' : 'border-slate-300 bg-white/60'} rounded-sm flex flex-col items-center justify-center ${borderColor} transition-colors`}>
                      {!isLowLod && (isHovered ? <span className="text-brand-accent font-bold text-[10px]">RENT</span> : <span className="text-2xl opacity-20">+</span>)}
                  </div>
                </div>
            )}

            {showBanner && business.isOccupied && (
              <div className="absolute top-1/2 left-1/2 w-0 h-0 preserve-3d pointer-events-none z-50" style={{ transform: 'translateZ(80px)' }} >
                 <div className="absolute top-0 left-0 flex flex-col items-center gap-1 origin-bottom" style={{ transform: `translate(-50%, -100%) rotateX(var(--map-inv-rotate-x)) rotateZ(var(--map-inv-rotate-z))` }} >
                    <div className={`px-2 py-1 rounded-lg shadow-xl border border-white/20 flex items-center gap-2 ${statusColor} backdrop-blur-md transition-all duration-500`} style={mapMode === 'heatmap' ? { backgroundColor: heatmapColorString, boxShadow: `0 10px 25px -5px ${heatmapColorString}` } : {}}>
                      <span className="text-[9px] font-bold uppercase tracking-widest text-white">{statusText}</span>
                    </div>
                    <div className={`w-0.5 h-4 opacity-60 ${statusColor} transition-colors duration-500`} style={mapMode === 'heatmap' ? { backgroundColor: heatmapColorString } : {}}></div>
                 </div>
              </div>
            )}
        </div>
    </div>
  );
});

const NetworkingLayer: React.FC<{ connections: any[], activeId: string | null }> = ({ connections, activeId }) => {
    return (
        <svg className="absolute inset-0 w-full h-full pointer-events-none preserve-3d" style={{ transform: 'translateZ(2px)' }}>
            <defs>
                <filter id="net-glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
            </defs>
            {connections.map((conn, idx) => {
                const isRelevant = !activeId || conn.participants.includes(activeId);
                const color = conn.type === 'synergy' ? '#F7C600' : '#2D89E5';
                const opacity = isRelevant ? 0.7 : 0.05;
                const strokeWidth = conn.type === 'synergy' ? 3 : 1.5;

                return (
                    <g key={idx} className="transition-opacity duration-500" style={{ opacity }}>
                        <line 
                            x1={conn.start.x} y1={conn.start.y} 
                            x2={conn.end.x} y2={conn.end.y} 
                            stroke={color} 
                            strokeWidth={strokeWidth} 
                            strokeDasharray={conn.type === 'synergy' ? "8,4" : "none"}
                            filter="url(#net-glow)"
                            className={conn.type === 'synergy' ? 'animate-net-flow' : ''}
                        />
                        {isRelevant && conn.type === 'synergy' && (
                             <circle r="4" fill="#fff">
                                <animateMotion 
                                    dur="3s" 
                                    repeatCount="indefinite" 
                                    path={`M${conn.start.x},${conn.start.y} L${conn.end.x},${conn.end.y}`} 
                                />
                             </circle>
                        )}
                    </g>
                );
            })}
            <style>{`
                @keyframes net-flow {
                    from { stroke-dashoffset: 24; }
                    to { stroke-dashoffset: 0; }
                }
                .animate-net-flow {
                    animation: net-flow 1s linear infinite;
                }
            `}</style>
        </svg>
    );
};

const HeatmapLayer: React.FC<{ businesses: Business[] }> = ({ businesses }) => {
    return (
        <svg className="absolute inset-0 w-full h-full pointer-events-none preserve-3d" style={{ transform: 'translateZ(1px)' }}>
            <defs>
                {/* Dynamic radial gradient definitions based on building positions and visitor intensity */}
                {businesses.filter(b => b.isOccupied).map(b => {
                    const visitors = b.activeVisitors || 0;
                    const intensity = Math.min(visitors / 50, 1);
                    const adjustedIntensity = Math.pow(intensity, 0.85);
                    const hue = 220 - (adjustedIntensity * 220);
                    const sat = 65 + (adjustedIntensity * 30);
                    const light = 35 + (adjustedIntensity * 20);
                    const color = `hsl(${hue}, ${sat}%, ${light}%)`;
                    
                    return (
                        <radialGradient key={`grad-${b.id}`} id={`heat-grad-${b.id}`} cx="50%" cy="50%" r="50%">
                            <stop offset="0%" stopColor={color} stopOpacity={0.6 + (intensity * 0.4)} />
                            <stop offset="100%" stopColor={color} stopOpacity="0" />
                        </radialGradient>
                    );
                })}
            </defs>
            {businesses.filter(b => b.isOccupied).map(b => {
                const center = getCellCenter(b.gridPosition);
                const visitors = b.activeVisitors || 0;
                const radius = 60 + (Math.min(visitors, 100) * 1.5);
                
                return (
                    <circle 
                        key={`heat-circle-${b.id}`}
                        cx={center.x} 
                        cy={center.y} 
                        r={radius} 
                        fill={`url(#heat-grad-${b.id})`}
                        className="animate-pulse-slow"
                        style={{ animationDuration: `${4 - (Math.min(visitors, 40) / 10)}s` }}
                    />
                );
            })}
        </svg>
    );
};

const LayerToggle: React.FC<{ mode: MapMode; onToggle: (m: MapMode) => void; t: any }> = ({ mode, onToggle, t }) => {
    const layers: { id: MapMode; label: string; icon: string }[] = [
        { id: 'standard', label: 'standardMode', icon: '🏙️' },
        { id: 'heatmap', label: 'heatmapMode', icon: '🔥' },
        { id: 'traffic', label: 'trafficMode', icon: '🚗' },
        { id: 'networking', label: 'connectionsMode', icon: '🕸️' },
        { id: 'globe', label: 'Globe', icon: '🌍' }
    ];

    return (
        <div className="absolute top-6 right-6 z-20 flex flex-col gap-2 p-2 bg-white/90 backdrop-blur rounded-2xl shadow-card border border-white/50">
            {layers.map(layer => (
                <button
                    key={layer.id}
                    onClick={() => onToggle(layer.id)}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all group relative ${mode === layer.id ? 'bg-brand-primary text-white shadow-md' : 'text-slate-400 hover:bg-slate-100'}`}
                    title={t(layer.label)}
                >
                    <span className="text-lg">{layer.icon}</span>
                    <span className="absolute right-full mr-3 px-2 py-1 bg-brand-dark text-white text-[10px] font-bold rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap">
                        {t(layer.label)}
                    </span>
                </button>
            ))}
        </div>
    );
};

const OfficeMap: React.FC<OfficeMapProps> = ({ businesses, favorites, onToggleFavorite, onRentClick, onAddBusiness, onUpdateBusiness }) => {
  const { t, language } = useLanguage();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const [mapMode, setMapMode] = useState<MapMode>('standard');
  const [viewState, setViewState] = useState({ zoom: 0.8, rotateX: 55, rotateZ: 45, panX: 0, panY: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [mapMatches, setMapMatches] = useState<MatchResult[]>([]);

  const currentLOD = useMemo((): 'high' | 'medium' | 'low' => {
      if (viewState.zoom < 0.5) return 'low';
      if (viewState.zoom < 1.2) return 'medium';
      return 'high';
  }, [viewState.zoom]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
      const zoomSensitivity = 0.001;
      const minZoom = 0.2;
      const maxZoom = 2.5;
      
      setViewState(prev => ({
          ...prev,
          zoom: Math.min(maxZoom, Math.max(minZoom, prev.zoom - e.deltaY * zoomSensitivity))
      }));
  }, []);

  const adjustZoom = (delta: number) => {
      const minZoom = 0.2;
      const maxZoom = 2.5;
      setViewState(prev => ({
          ...prev,
          zoom: Math.min(maxZoom, Math.max(minZoom, prev.zoom + delta))
      }));
  };

  useEffect(() => {
    if (mapMode === 'networking') {
        generateBusinessMatches(MY_BUSINESS_GENOME.genomeProfile as any, businesses, language).then(setMapMatches);
    }
  }, [mapMode, businesses, language]);

  const trafficSegments = useMemo(() => {
    const segments = [];
    for (let c = 1; c < GRID_COLS; c++) {
        const x = PADDING + (c-1)*(CELL_SIZE+GAP) + CELL_SIZE + GAP/2;
        const nearby = businesses.filter(b => b.isOccupied && (b.gridPosition.x === c || b.gridPosition.x === c + 1));
        const visitors = nearby.reduce((acc, b) => acc + (b.activeVisitors || 0), 0);
        segments.push({ id: `v-${c}`, x, visitors, orientation: 'vertical' });
    }
    for (let r = 1; r < GRID_COLS; r++) { 
         const y = PADDING + (r-1)*(CELL_SIZE+GAP) + CELL_SIZE + GAP/2;
         const nearby = businesses.filter(b => b.isOccupied && (b.gridPosition.y === r || b.gridPosition.y === r + 1));
         const visitors = nearby.reduce((acc, b) => acc + (b.activeVisitors || 0), 0);
         segments.push({ id: `h-${r}`, y, visitors, orientation: 'horizontal' });
    }
    return segments;
  }, [businesses]);

  const networkingConnections = useMemo(() => {
    if (mapMode !== 'networking') return [];
    const connections: any[] = [];
    const occupied = businesses.filter(b => b.isOccupied && b.genomeProfile);
    
    for (let i = 0; i < occupied.length; i++) {
        for (let j = i + 1; j < occupied.length; j++) {
            const b1 = occupied[i];
            const b2 = occupied[j];
            
            const b1OfferedB2Needed = b1.genomeProfile?.servicesOffered.some(offered => 
                b2.genomeProfile?.servicesNeeded.some(needed => offered.toLowerCase() === needed.toLowerCase())
            );
            const b2OfferedB1Needed = b2.genomeProfile?.servicesOffered.some(offered => 
                b1.genomeProfile?.servicesNeeded.some(needed => offered.toLowerCase() === needed.toLowerCase())
            );

            const sameIndustry = b1.genomeProfile?.industrySector === b2.genomeProfile?.industrySector;

            if (b1OfferedB2Needed || b2OfferedB1Needed) {
                connections.push({
                    participants: [b1.id, b2.id],
                    start: getCellCenter(b1.gridPosition),
                    end: getCellCenter(b2.gridPosition),
                    type: 'synergy'
                });
            } else if (sameIndustry) {
                connections.push({
                    participants: [b1.id, b2.id],
                    start: getCellCenter(b1.gridPosition),
                    end: getCellCenter(b2.gridPosition),
                    type: 'industry'
                });
            }
        }
    }
    return connections;
  }, [businesses, mapMode]);

  const handleMouseDown = (e: React.MouseEvent) => { 
      if ((e.target as HTMLElement).closest('button')) return;
      setIsDragging(true);
  };
  
  const handleMouseMove = (e: React.MouseEvent) => {
      if (!isDragging) return;
      setViewState(prev => ({ 
          ...prev, 
          panX: prev.panX + e.movementX, 
          panY: prev.panY + e.movementY 
      }));
  };

  const selectedBusiness = useMemo(() => businesses.find(b => b.id === selectedBusinessId) || null, [businesses, selectedBusinessId]);

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
           <div className="absolute top-6 left-6 z-20 pointer-events-none">
               <div className="pointer-events-auto bg-white/90 backdrop-blur shadow-card border border-white/50 rounded-2xl p-5 w-64">
                   <h2 className="text-xl font-bold text-brand-primary mb-1 font-heading">{t('businessMap')}</h2>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{mapMode === 'globe' ? '3D View' : t(mapMode + 'Mode')} | LOD: {currentLOD.toUpperCase()}</p>
               </div>
           </div>

           <div className="absolute bottom-6 left-6 z-20 flex flex-col gap-2 p-2 bg-white/90 backdrop-blur rounded-2xl shadow-card border border-white/50">
                <button onClick={() => adjustZoom(0.2)} className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-600 hover:bg-slate-100 font-bold text-xl">+</button>
                <button onClick={() => adjustZoom(-0.2)} className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-600 hover:bg-slate-100 font-bold text-xl">−</button>
           </div>

           <LayerToggle mode={mapMode} onToggle={setMapMode} t={t} />

           <div 
                className="absolute inset-0 preserve-3d origin-center transition-transform duration-75"
                style={{
                    transform: `translate3d(${viewState.panX}px, ${viewState.panY}px, 0) scale(${viewState.zoom}) rotateX(${viewState.rotateX}deg) rotateZ(${viewState.rotateZ}deg)`,
                    '--map-inv-rotate-x': `-${viewState.rotateX}deg`,
                    '--map-inv-rotate-z': `-${viewState.rotateZ}deg`
                } as React.CSSProperties}
           >
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 preserve-3d" style={{ width: CONTAINER_SIZE, height: CONTAINER_SIZE }}>
                    <div className={`absolute inset-0 rounded-3xl border-4 border-white/50 transition-colors duration-500 ${isSidebarOpen ? 'bg-white/40' : 'bg-white'} ${mapMode !== 'standard' ? 'opacity-10' : 'opacity-100 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.1)]'}`}></div>
                    
                    {mapMode === 'heatmap' && (
                        <HeatmapLayer businesses={businesses} />
                    )}

                    {mapMode === 'networking' && (
                        <NetworkingLayer connections={networkingConnections} activeId={hoveredId || selectedBusinessId} />
                    )}

                    {mapMode === 'traffic' && (
                        <div className="absolute inset-0 pointer-events-none" style={{ transform: 'translateZ(1px)' }}>
                            {trafficSegments.map(seg => {
                                const color = seg.visitors > 40 ? '#ef4444' : seg.visitors > 20 ? '#f59e0b' : '#10b981';
                                const speed = seg.visitors > 40 ? '1s' : seg.visitors > 20 ? '2s' : '4s';
                                
                                return (
                                    <div key={seg.id} className="absolute bg-current opacity-80 rounded-full" style={{ 
                                        left: seg.orientation === 'vertical' ? seg.x : PADDING, 
                                        top: seg.orientation === 'horizontal' ? seg.y : PADDING,
                                        width: seg.orientation === 'vertical' ? 12 : (CONTAINER_SIZE - PADDING*2),
                                        height: seg.orientation === 'horizontal' ? 12 : (CONTAINER_SIZE - PADDING*2),
                                        color,
                                        boxShadow: `0 0 15px ${color}`,
                                        marginLeft: seg.orientation === 'vertical' ? -6 : 0,
                                        marginTop: seg.orientation === 'horizontal' ? -6 : 0
                                    }}>
                                        <div className={`absolute inset-0 ${seg.orientation === 'vertical' ? 'animate-traffic-v' : 'animate-traffic-h'}`} style={{ 
                                            backgroundImage: seg.orientation === 'vertical' ? 'linear-gradient(to bottom, transparent 40%, rgba(255,255,255,0.8) 50%, transparent 60%)' : 'linear-gradient(to right, transparent 40%, rgba(255,255,255,0.8) 50%, transparent 60%)',
                                            backgroundSize: seg.orientation === 'vertical' ? '100% 40px' : '40px 100%',
                                            animationDuration: speed
                                        }} />
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {businesses.map((business) => {
                        const colIndex = business.gridPosition.x - 1;
                        const rowIndex = business.gridPosition.y - 1;
                        const xPos = PADDING + (colIndex * CELL_SIZE) + (colIndex * GAP);
                        const yPos = PADDING + (rowIndex * CELL_SIZE) + (rowIndex * GAP);
                        const match = mapMatches.find(m => m.companyId === business.id);

                        return (
                            <div key={business.id} className="absolute preserve-3d transition-all duration-500" style={{ width: CELL_SIZE, height: CELL_SIZE, left: xPos, top: yPos }} >
                                <BuildingBlock 
                                    business={business} 
                                    isHovered={hoveredId === business.id} 
                                    isSelected={selectedBusinessId === business.id} 
                                    isFeatured={false} 
                                    lod={currentLOD} 
                                    onSelect={(b) => { setSelectedBusinessId(b.id); setIsSidebarOpen(true); }} 
                                    onHover={setHoveredId} 
                                    t={t} 
                                    mapMode={mapMode}
                                    matchScore={match?.score}
                                />
                            </div>
                        );
                    })}
               </div>
           </div>

           {(mapMode === 'traffic' || mapMode === 'networking' || mapMode === 'heatmap') && (
                <div className="absolute bottom-6 right-6 bg-white/90 backdrop-blur-md p-4 rounded-xl shadow-lg border border-slate-200 animate-fade-in pointer-events-auto min-w-[180px]">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 border-b border-slate-100 pb-1">{t(mapMode + 'Mode')}</h4>
                    <div className="space-y-2">
                        {mapMode === 'traffic' ? (
                            <>
                                <div className="flex items-center gap-2 text-xs font-bold text-slate-700"><div className="w-3 h-3 rounded-full bg-emerald-500"></div><span>Stable</span></div>
                                <div className="flex items-center gap-2 text-xs font-bold text-slate-700"><div className="w-3 h-3 rounded-full bg-amber-500"></div><span>Congested</span></div>
                                <div className="flex items-center gap-2 text-xs font-bold text-slate-700"><div className="w-3 h-3 rounded-full bg-rose-500"></div><span>Critical</span></div>
                            </>
                        ) : mapMode === 'networking' ? (
                            <>
                                <div className="flex items-center gap-2 text-xs font-bold text-slate-700"><div className="w-6 h-1 bg-brand-accent rounded"></div><span>Service Synergy</span></div>
                                <div className="flex items-center gap-2 text-xs font-bold text-slate-700"><div className="w-6 h-1 bg-brand-primary rounded"></div><span>Same Industry</span></div>
                            </>
                        ) : (
                            <div className="space-y-1">
                               <div className="flex items-center justify-between text-[10px] font-bold text-slate-400"><span>COLD</span><span>HOT</span></div>
                               <div className="w-full h-2 rounded-full bg-gradient-to-r from-blue-500 via-green-400 to-red-500"></div>
                            </div>
                        )}
                    </div>
                </div>
           )}
       </div>

       {isSidebarOpen && selectedBusiness && (
           <div className="w-full lg:w-[400px] bg-white rounded-[32px] shadow-elevated flex flex-col z-30 animate-fade-in border border-slate-100 overflow-hidden absolute lg:relative bottom-0 lg:bottom-auto h-[70vh] lg:h-auto">
               <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-start">
                   <div>
                       <h2 className="text-2xl font-bold text-brand-primary font-heading mb-1">{selectedBusiness.name}</h2>
                       <span className="text-xs font-bold uppercase tracking-wide text-brand-secondary">{selectedBusiness.category}</span>
                   </div>
                   <button onClick={() => setIsSidebarOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400">✕</button>
               </div>
               <div className="p-8 flex-1 overflow-y-auto custom-scrollbar">
                   <div className="w-full h-40 bg-brand-surface rounded-2xl mb-8 border border-slate-100 flex items-center justify-center overflow-hidden">
                      {selectedBusiness.logoUrl && <img src={selectedBusiness.logoUrl} className="w-full h-full object-cover" alt="logo" />}
                   </div>
                   <p className="text-slate-600 mb-8 leading-relaxed font-medium">{selectedBusiness.description}</p>
                   
                   {mapMode === 'networking' && selectedBusiness.isOccupied && (
                       <div className="mb-8 p-6 bg-brand-primary/5 rounded-2xl border border-brand-primary/20 animate-pulse-slow">
                           <h4 className="text-sm font-bold text-brand-primary uppercase tracking-widest mb-2">{t('aiInsight')}</h4>
                           <p className="text-xs text-brand-dark leading-relaxed">
                               {mapMatches.find(m => m.companyId === selectedBusiness.id)?.matchReason || 'Calculating strategic synergy...'}
                           </p>
                       </div>
                   )}

                   {mapMode === 'traffic' && selectedBusiness.isOccupied && (
                       <div className="mb-8 p-6 bg-slate-50 rounded-2xl border border-slate-200">
                           <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">{t('liveActivity')}</h4>
                           <div className="flex items-center justify-between">
                               <div className="text-3xl font-mono font-bold text-brand-dark">{selectedBusiness.activeVisitors || 0}</div>
                               <div className="text-xs font-bold text-slate-400">{t('visitorNow')}</div>
                           </div>
                       </div>
                   )}

                   <div className="space-y-4">
                       {selectedBusiness.isOccupied ? (
                          <>
                             <button className="w-full py-4 bg-brand-primary text-white rounded-xl font-bold text-sm shadow-lg shadow-brand-primary/20 hover:brightness-110 transition-all">{t('contact')}</button>
                             <button className="w-full py-4 bg-white border border-slate-200 text-brand-primary rounded-xl font-bold text-sm hover:bg-slate-50 transition-all">{t('viewDetails')}</button>
                          </>
                       ) : (
                          <button onClick={() => onRentClick(selectedBusiness)} className="w-full py-4 bg-green-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-green-600/20 hover:bg-green-500 transition-all">{t('rentFree')}</button>
                       )}
                   </div>
               </div>
           </div>
       )}
    </div>
  );
};

export default OfficeMap;
