import React from 'react';
import { createPortal } from 'react-dom';
import { 
  Gamepad2, 
  Search,
  ArrowUpDown,
} from 'lucide-react';
import { openUrl } from '@tauri-apps/plugin-opener';
import { useAppContext, OwnedGameItem } from '../context/AppContext';
import { getApiBaseUrl } from '../config';
import { GameCard } from './GameCard';
import { GameContextMenu } from './GameContextMenu';

export const LibraryTab: React.FC = () => {
  const {
    user,
    ownedGames,
    isLoadingGames,
    setActiveMenuGameId,
    setMenuPosition,
    favorites,
  } = useAppContext();

  // Local search, filter, and sort states
  const [searchQuery, setSearchQuery] = React.useState('');
  const [filterType, setFilterType] = React.useState<'all' | 'redeemed' | 'unredeemed'>('all');
  const [sortType, setSortType] = React.useState<'latest' | 'oldest' | 'alpha_asc' | 'alpha_desc'>(() => {
    return (localStorage.getItem('digimanager_library_sort') as any) || 'latest';
  });

  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const filterButtonRef = React.useRef<HTMLButtonElement>(null);
  const [dropdownPosition, setDropdownPosition] = React.useState<{ top: number; left: number } | null>(null);

  const [sortDropdownOpen, setSortDropdownOpen] = React.useState(false);
  const sortDropdownRef = React.useRef<HTMLDivElement>(null);
  const sortButtonRef = React.useRef<HTMLButtonElement>(null);
  const [sortDropdownPosition, setSortDropdownPosition] = React.useState<{ top: number; left: number } | null>(null);

  React.useEffect(() => {
    if (dropdownOpen && filterButtonRef.current) {
      const rect = filterButtonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 6,
        left: Math.max(12, rect.right - 144)
      });
    } else {
      setDropdownPosition(null);
    }
  }, [dropdownOpen]);

  React.useEffect(() => {
    if (sortDropdownOpen && sortButtonRef.current) {
      const rect = sortButtonRef.current.getBoundingClientRect();
      setSortDropdownPosition({
        top: rect.bottom + 6,
        left: Math.max(12, rect.right - 168)
      });
    } else {
      setSortDropdownPosition(null);
    }
  }, [sortDropdownOpen]);

  if (!user) return null;

  const handleSelectSort = (type: 'latest' | 'oldest' | 'alpha_asc' | 'alpha_desc') => {
    setSortType(type);
    localStorage.setItem('digimanager_library_sort', type);
    setSortDropdownOpen(false);
  };

  const handleOutsideClick = (e: MouseEvent) => {
    setActiveMenuGameId(null);
    setMenuPosition(null);

    const target = e.target as Node;
    const isButtonClick = filterButtonRef.current && filterButtonRef.current.contains(target);
    const isDropdownClick = dropdownRef.current && dropdownRef.current.contains(target);
    if (!isButtonClick && !isDropdownClick) {
      setDropdownOpen(false);
    }

    const isSortButtonClick = sortButtonRef.current && sortButtonRef.current.contains(target);
    const isSortDropdownClick = sortDropdownRef.current && sortDropdownRef.current.contains(target);
    if (!isSortButtonClick && !isSortDropdownClick) {
      setSortDropdownOpen(false);
    }
  };

  const openContextMenu = (e: React.MouseEvent, gameId: string) => {
    e.preventDefault();
    e.stopPropagation();

    const menuWidth = 224; // w-56 is 224px
    const menuHeight = 160;

    let x = e.clientX;
    let y = e.clientY;

    if (x + menuWidth > window.innerWidth) {
      x = window.innerWidth - menuWidth - 12;
    }
    if (y + menuHeight > window.innerHeight) {
      y = window.innerHeight - menuHeight - 12;
    }

    x = Math.max(12, x);
    y = Math.max(12, y);

    const originX = (e.clientX > x + 10) ? 'right' : 'left';
    const originY = (e.clientY > y + 10) ? 'bottom' : 'top';
    const transformOrigin = `${originY} ${originX}`;

    setActiveMenuGameId(gameId);
    setMenuPosition({ x, y, transformOrigin });
  };

  React.useEffect(() => {
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  const [displayGames, setDisplayGames] = React.useState<OwnedGameItem[]>([]);

  React.useEffect(() => {
    const filtered = ownedGames
      .filter(game => {
        const matchesSearch = game.title.toLowerCase().includes(searchQuery.toLowerCase());
        const isRedeemed = !!game.redeemed_by && game.redeemed_by.trim() !== '' && game.redeemed_by.trim() !== '-';
        if (filterType === 'redeemed') {
          return matchesSearch && isRedeemed;
        }
        if (filterType === 'unredeemed') {
          return matchesSearch && !isRedeemed;
        }
        return matchesSearch;
      })
      .sort((a, b) => {
        const aFav = favorites.includes(a.order_id) ? 1 : 0;
        const bFav = favorites.includes(b.order_id) ? 1 : 0;
        if (aFav !== bFav) {
          return bFav - aFav; // favorited first
        }

        if (sortType === 'latest') {
          const timeA = a.created_at ? new Date(a.created_at.replace(/-/g, '/')).getTime() : 0;
          const timeB = b.created_at ? new Date(b.created_at.replace(/-/g, '/')).getTime() : 0;
          if (timeA !== timeB) return timeB - timeA;
          return (b.order_id || '').localeCompare(a.order_id || '');
        }

        if (sortType === 'oldest') {
          const timeA = a.created_at ? new Date(a.created_at.replace(/-/g, '/')).getTime() : 0;
          const timeB = b.created_at ? new Date(b.created_at.replace(/-/g, '/')).getTime() : 0;
          if (timeA !== timeB) return timeA - timeB;
          return (a.order_id || '').localeCompare(b.order_id || '');
        }

        if (sortType === 'alpha_desc') {
          return b.title.localeCompare(a.title, 'th', { sensitivity: 'base' });
        }

        // alpha_asc
        return a.title.localeCompare(b.title, 'th', { sensitivity: 'base' });
      });
    setDisplayGames(filtered);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownedGames, searchQuery, filterType, sortType, favorites]);

  const filteredGames = displayGames;

  return (
    <div className="min-h-[calc(100vh-150px)] flex flex-col animate-fade-in relative">
      
      {/* Title, Search, and Filters Row */}
      <div className="sticky top-[-1rem] sm:top-[-1.5rem] lg:top-[-2rem] z-30 flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-zinc-900/60 bg-zinc-950/80 backdrop-blur-md -mt-4 -mx-4 pt-3 px-4 sm:-mt-6 sm:-mx-6 sm:px-6 lg:-mt-8 lg:-mx-8 lg:px-8 flex-shrink-0 font-sans">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight text-white">คลังเกมของฉัน ({ownedGames.length})</h2>
          <p className="text-zinc-400 text-xs">พร้อมจัดการดาวน์โหลด ติดตั้ง และเข้าเล่นได้ทันที</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Search Box */}
          <div className="relative w-44 sm:w-60">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="ค้นหาเกม..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-zinc-900 border border-zinc-800/80 rounded-xl focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700/50 text-zinc-200 placeholder-zinc-650 text-xs transition-all outline-none"
            />
          </div>

          {/* Sort Dropdown */}
          <div className="relative">
            <button
              ref={sortButtonRef}
              onClick={(e) => {
                e.stopPropagation();
                setSortDropdownOpen(!sortDropdownOpen);
                setDropdownOpen(false);
              }}
              title="จัดเรียงลำดับเกม"
              className="px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 hover:text-white rounded-xl text-zinc-300 font-semibold text-xs flex items-center gap-1.5 transition-colors border border-zinc-800/60 shadow-sm"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-zinc-400" />
              <span>
                {sortType === 'latest' && 'ล่าสุด'}
                {sortType === 'oldest' && 'เก่าสุด'}
                {sortType === 'alpha_asc' && 'ชื่อ (A-Z)'}
                {sortType === 'alpha_desc' && 'ชื่อ (Z-A)'}
              </span>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </button>
          </div>

          {/* Filter Dropdown */}
          <div className="relative">
            <button
              ref={filterButtonRef}
              onClick={(e) => {
                e.stopPropagation();
                setDropdownOpen(!dropdownOpen);
                setSortDropdownOpen(false);
              }}
              className="px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 hover:text-white rounded-xl text-zinc-355 font-semibold text-xs flex items-center gap-1.5 transition-colors border border-zinc-800/60 shadow-sm"
            >
              <span>
                {filterType === 'all' && 'ทั้งหมด'}
                {filterType === 'redeemed' && 'รีดีมแล้ว'}
                {filterType === 'unredeemed' && 'ยังไม่รีดีม'}
              </span>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </button>
          </div>
        </div>
      </div>

      {isLoadingGames && ownedGames.length === 0 ? (
        <div className="flex-grow flex-1 flex flex-col items-center justify-center gap-3">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-zinc-400 animate-spin" viewBox="0 0 24 24">
            <g stroke="currentColor">
              <circle cx="12" cy="12" r="9.5" fill="none" strokeLinecap="round" strokeWidth="3">
                <animate attributeName="stroke-dasharray" calcMode="spline" dur="1.5s" keySplines="0.42,0,0.58,1;0.42,0,0.58,1;0.42,0,0.58,1" keyTimes="0;0.475;0.95;1" repeatCount="indefinite" values="0 150;42 150;42 150;42 150"/>
                <animate attributeName="stroke-dashoffset" calcMode="spline" dur="1.5s" keySplines="0.42,0,0.58,1;0.42,0,0.58,1;0.42,0,0.58,1" keyTimes="0;0.475;0.95;1" repeatCount="indefinite" values="0;-16;-59;-59"/>
              </circle>
              <animateTransform attributeName="transform" dur="2s" repeatCount="indefinite" type="rotate" values="0 12 12;360 12 12"/>
            </g>
          </svg>
          <p className="text-zinc-500 text-xs font-semibold animate-pulse">กำลังตรวจสอบข้อมูลเกมในคลัง...</p>
        </div>
      ) : filteredGames.length === 0 ? (
        <div className="flex-grow flex-1 flex flex-col items-center justify-center text-center space-y-4">
          <div className="p-3.5 bg-zinc-900 border border-zinc-800/80 rounded-2xl text-zinc-400">
            <Gamepad2 className="w-8 h-8" />
          </div>
          <div>
            <h4 className="text-base font-bold text-zinc-200">ไม่พบเกมในคลังของคุณ</h4>
            <p className="text-zinc-500 text-xs mt-1">ลองล้างการค้นหาหรือซื้อเปิดสิทธิ์คีย์เกมที่ระบบเว็บหลักเพื่อซิงค์มาใหม่</p>
          </div>
          {ownedGames.length === 0 && (
            <button
              onClick={() => openUrl(getApiBaseUrl().replace('/api', ''))}
              className="px-5 py-2.5 bg-zinc-50 hover:bg-zinc-200 text-zinc-950 font-bold rounded-xl text-xs shadow-sm transition-colors"
            >
              เลือกซื้อเกมบนหน้าร้านค้าเว็บ
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(270px,1fr))] gap-4 sm:gap-5 pb-6">
          {filteredGames.map((game) => (
            <GameCard key={game.order_id} game={game} onOpenContextMenu={openContextMenu} />
          ))}
        </div>
      )}

      {/* RENDER CONTEXT MENU */}
      <GameContextMenu />

      {/* SORT DROPDOWN PORTAL */}
      {sortDropdownOpen && sortDropdownPosition && createPortal(
        <div
          ref={sortDropdownRef}
          className="fixed w-44 bg-zinc-950/85 backdrop-blur-lg border border-zinc-800/80 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] p-1.5 z-[9999] space-y-0.5 animate-fade-slide-down font-sans"
          style={{
            top: `${sortDropdownPosition.top}px`,
            left: `${sortDropdownPosition.left}px`
          }}
        >
          <div className="px-2.5 py-1 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
            จัดเรียงตาม
          </div>
          <button
            onClick={() => handleSelectSort('latest')}
            className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors font-medium flex items-center justify-between ${sortType === 'latest' ? 'bg-zinc-900 text-white font-semibold' : 'text-zinc-400 hover:bg-zinc-900/60 hover:text-zinc-200'}`}
          >
            <span>ล่าสุด (ที่สั่งซื้อ)</span>
            {sortType === 'latest' && <span className="w-1.5 h-1.5 rounded-full bg-white"></span>}
          </button>
          <button
            onClick={() => handleSelectSort('oldest')}
            className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors font-medium flex items-center justify-between ${sortType === 'oldest' ? 'bg-zinc-900 text-white font-semibold' : 'text-zinc-400 hover:bg-zinc-900/60 hover:text-zinc-200'}`}
          >
            <span>เก่าสุด (ที่สั่งซื้อ)</span>
            {sortType === 'oldest' && <span className="w-1.5 h-1.5 rounded-full bg-white"></span>}
          </button>
          <div className="my-1 border-t border-zinc-800/50"></div>
          <button
            onClick={() => handleSelectSort('alpha_asc')}
            className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors font-medium flex items-center justify-between ${sortType === 'alpha_asc' ? 'bg-zinc-900 text-white font-semibold' : 'text-zinc-400 hover:bg-zinc-900/60 hover:text-zinc-200'}`}
          >
            <span>ตามตัวอักษร (A - Z)</span>
            {sortType === 'alpha_asc' && <span className="w-1.5 h-1.5 rounded-full bg-white"></span>}
          </button>
          <button
            onClick={() => handleSelectSort('alpha_desc')}
            className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors font-medium flex items-center justify-between ${sortType === 'alpha_desc' ? 'bg-zinc-900 text-white font-semibold' : 'text-zinc-400 hover:bg-zinc-900/60 hover:text-zinc-200'}`}
          >
            <span>ตามตัวอักษร (Z - A)</span>
            {sortType === 'alpha_desc' && <span className="w-1.5 h-1.5 rounded-full bg-white"></span>}
          </button>
        </div>,
        document.body
      )}

      {/* FILTER DROPDOWN PORTAL */}
      {dropdownOpen && dropdownPosition && createPortal(
        <div
          ref={dropdownRef}
          className="fixed w-36 bg-zinc-950/85 backdrop-blur-lg border border-zinc-800/80 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] p-1.5 z-[9999] space-y-0.5 animate-fade-slide-down font-sans"
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`
          }}
        >
          <div className="px-2.5 py-1 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
            สถานะ
          </div>
          <button
            onClick={() => { setFilterType('all'); setDropdownOpen(false); }}
            className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors font-medium flex items-center justify-between ${filterType === 'all' ? 'bg-zinc-900 text-white font-semibold' : 'text-zinc-400 hover:bg-zinc-900/60 hover:text-zinc-200'}`}
          >
            <span>ทั้งหมด</span>
            {filterType === 'all' && <span className="w-1.5 h-1.5 rounded-full bg-white"></span>}
          </button>
          <button
            onClick={() => { setFilterType('redeemed'); setDropdownOpen(false); }}
            className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors font-medium flex items-center justify-between ${filterType === 'redeemed' ? 'bg-zinc-900 text-white font-semibold' : 'text-zinc-400 hover:bg-zinc-900/60 hover:text-zinc-200'}`}
          >
            <span>รีดีมแล้ว</span>
            {filterType === 'redeemed' && <span className="w-1.5 h-1.5 rounded-full bg-white"></span>}
          </button>
          <button
            onClick={() => { setFilterType('unredeemed'); setDropdownOpen(false); }}
            className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors font-medium flex items-center justify-between ${filterType === 'unredeemed' ? 'bg-zinc-900 text-white font-semibold' : 'text-zinc-400 hover:bg-zinc-900/60 hover:text-zinc-200'}`}
          >
            <span>ยังไม่รีดีม</span>
            {filterType === 'unredeemed' && <span className="w-1.5 h-1.5 rounded-full bg-white"></span>}
          </button>
        </div>,
        document.body
      )}
    </div>
  );
};
