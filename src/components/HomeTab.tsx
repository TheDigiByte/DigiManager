import React from 'react';
import { ArrowRight, History, Clock } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { GameCard } from './GameCard';
import { GameContextMenu } from './GameContextMenu';

export const HomeTab: React.FC = () => {
  const { user, ownedGames, setActiveTab, favorites, activeMenuGameId, setActiveMenuGameId, setMenuPosition } = useAppContext();

  React.useEffect(() => {
    const handleOutsideClick = () => {
      if (activeMenuGameId) {
        setActiveMenuGameId(null);
        setMenuPosition(null);
      }
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, [activeMenuGameId, setActiveMenuGameId, setMenuPosition]);

  if (!user) return null;

  // Process game lists
  const pinnedGames = ownedGames.filter((game) => favorites.includes(game.order_id));

  const recentRedeemedGames = ownedGames
    .filter((game) => !!game.redeemed_by && game.redeemed_by.trim() !== '' && game.redeemed_by.trim() !== '-')
    .sort((a, b) => {
      if (!a.redeemed_at) return 1;
      if (!b.redeemed_at) return -1;
      return new Date(b.redeemed_at).getTime() - new Date(a.redeemed_at).getTime();
    })
    .slice(0, 5);

  return (
    <div className="space-y-8 font-sans pb-8">
      {/* Welcome Header */}
      <div className="flex flex-col gap-2">
        <span className="text-xs text-zinc-550 font-bold tracking-widest uppercase">Dashboard</span>
        <h2 className="text-3xl font-extrabold tracking-tight text-white">
          ยินดีต้อนรับกลับมา, {user.name}!
        </h2>
        <p className="text-zinc-400 text-sm">
          เข้าถึงเกมของคุณ ดาวน์โหลด และเริ่มผจญภัยได้ทันทีผ่านตัวรันเกมส่วนตัว
        </p>
      </div>

      {/* Pinned / Favorite Games Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" className="w-4.5 h-4.5 text-amber-400 fill-amber-400">
              <path fill="currentColor" d="M19.97 6.321v13.33a2.47 2.47 0 0 1-1.45 2.13a2.53 2.53 0 0 1-1.3.2a2.46 2.46 0 0 1-1.22-.51l-3.41-2.53a1.07 1.07 0 0 0-1.23 0l-3.43 2.56a2.47 2.47 0 0 1-1.2.5h-.3a2.4 2.4 0 0 1-1-.22a2.5 2.5 0 0 1-1-.83a2.53 2.53 0 0 1-.43-1.25V6.342a4.49 4.49 0 0 1 4.65-4.34h6.73A4.49 4.49 0 0 1 20 6.321z"/>
            </svg>
            <span>เกมโปรดของคุณ ({pinnedGames.length})</span>
          </h3>
          {pinnedGames.length > 0 && (
            <button 
              onClick={() => setActiveTab('library')}
              className="text-zinc-400 hover:text-white text-xs font-semibold flex items-center gap-1 transition-colors"
            >
              <span>ดูทั้งหมดในคลัง</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {pinnedGames.length === 0 ? (
          <div className="py-10 px-4 flex flex-col items-center justify-center text-center space-y-3 font-sans">
            <div className="text-zinc-600 mb-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m10.94 18.339l-3.43 2.548a1.71 1.71 0 0 1-2.76-1.23V6.35a3.735 3.735 0 0 1 3.87-3.597h6.76a3.74 3.74 0 0 1 3.87 3.597v13.309a1.708 1.708 0 0 1-2.76 1.229l-3.43-2.548a1.8 1.8 0 0 0-2.12 0"/>
              </svg>
            </div>
            <div>
              <p className="text-zinc-300 text-xs font-semibold">คุณยังไม่ได้ปักหมุดเกมโปรดไว้</p>
              <p className="text-zinc-500 text-[11px] mt-1 max-w-[360px]">
                สามารถกดไอคอนบุ๊กมาร์ก (Bookmark) ที่การ์ดเกมในหน้าคลังเพื่อแสดงทางลัดเข้าถึงด่วนในหน้านี้
              </p>
            </div>
            <button
              onClick={() => setActiveTab('library')}
              className="px-4 py-2 bg-zinc-850 hover:bg-zinc-800 text-zinc-300 hover:text-white font-semibold rounded-xl text-xs transition-colors border border-zinc-800 active:scale-95"
            >
              ไปหน้าคลังเกม
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(270px,1fr))] gap-4 sm:gap-5">
            {pinnedGames.map((game) => (
              <GameCard key={game.order_id} game={game} />
            ))}
          </div>
        )}
      </div>

      {/* Recently Redeemed Games Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
          <History className="w-4.5 h-4.5 text-indigo-400" />
          <span>เกมที่เพิ่งเปิดใช้งานล่าสุด (5 เกมล่าสุด)</span>
        </h3>

        {recentRedeemedGames.length === 0 ? (
          <div className="py-10 px-4 flex flex-col items-center justify-center text-center space-y-3 font-sans">
            <div className="text-zinc-600 mb-1">
              <Clock className="w-7 h-7" />
            </div>
            <div>
              <p className="text-zinc-300 text-xs font-semibold">ยังไม่มีประวัติการเปิดใช้งานสิทธิ์คีย์</p>
              <p className="text-zinc-500 text-[11px] mt-1 max-w-[360px]">
                เมื่อคุณทำการกรอกคีย์เพื่อรีดีมสิทธิ์เกมสำเร็จ รายชื่อเกมจะปรากฏที่นี่เพื่อแจ้งสถานะความพร้อมใช้งาน
              </p>
            </div>
            <button
              onClick={() => setActiveTab('redeem')}
              className="px-4 py-2 bg-zinc-850 hover:bg-zinc-800 text-zinc-300 hover:text-white font-semibold rounded-xl text-xs transition-colors border border-zinc-800 active:scale-95"
            >
              ไปหน้ารีดีมคีย์
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(270px,1fr))] gap-4 sm:gap-5">
            {recentRedeemedGames.map((game) => (
              <GameCard key={game.order_id} game={game} />
            ))}
          </div>
        )}
      </div>

      {/* Context Menu */}
      <GameContextMenu />
    </div>
  );
};
