import React from 'react';
import { Wrench } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

export const ProgressModal: React.FC = () => {
  const {
    showProgressModal,
    activePatchGame,
    patchProgress,
    currentDlIndex,
    handleCancelPatch
  } = useAppContext();

  if (!showProgressModal || !activePatchGame) return null;

  let displayMessage = 'กำลังเตรียมไฟล์...';
  let displayProgress = 0;

  if (patchProgress) {
    const status = patchProgress.status;
    
    // 1. Calculate overall download and extraction progress dynamically across all download files
    const hasMain = activePatchGame.patch_download_url ? 1 : 0;
    const extrasCount = activePatchGame.patch_extra_files?.length || 0;
    const totalDownloads = hasMain + extrasCount;
    
    let fileProgress = 0;
    if (totalDownloads > 0) {
      const currentPct = status === 'downloading' 
        ? patchProgress.progress * 0.8 
        : (status === 'extracting' || status === 'copying' || status === 'copying_extra' || status === 'shortcut' || status === 'success' ? 100 : 0);
      
      fileProgress = Math.min(100, Math.max(0, ((currentDlIndex * 100) + currentPct) / totalDownloads));
    }

    // 2. Map status to displayMessage and displayProgress dynamically
    if (status === 'preparing' || status === 'downloading' || status === 'extracting' || status === 'extra_downloading') {
      displayMessage = 'กำลังเตรียมไฟล์...';
      if (status === 'preparing') {
        displayProgress = 2;
      } else {
        displayProgress = Math.round(2 + (fileProgress * 0.83)); // Scales overall progress from 2% to 85%
      }
    } else if (status === 'copying' || status === 'copying_extra') {
      displayMessage = 'กำลัง Patch เกม...';
      if (status === 'copying') {
        displayProgress = 90;
      } else {
        displayProgress = 95;
      }
    } else if (status === 'shortcut') {
      displayMessage = 'กำลังสร้าง Shortcut บน Desktop ของคุณ...';
      displayProgress = 98;
    } else if (status === 'success') {
      displayMessage = 'เสร็จสิ้นการติดตั้ง';
      displayProgress = 100;
    }
  }

  const rawHeroUrl = activePatchGame.game_id ? `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${activePatchGame.game_id}/library_hero.jpg` : null;
  const heroUrl = rawHeroUrl ? `https://wsrv.nl/?url=${encodeURIComponent(rawHeroUrl)}&output=webp&q=75&w=800` : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs animate-backdrop-in">
      <div className="bg-zinc-950 border border-zinc-800/80 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl mx-4 animate-modal-in">
        
        {rawHeroUrl && (
          <div className="relative w-full aspect-[1920/620] overflow-hidden bg-zinc-900 border-b border-zinc-800/50">
            <img 
              src={heroUrl!} 
              alt="Game Hero Banner" 
              className="w-full h-full object-cover select-none"
              onError={(e) => {
                const img = e.target as HTMLImageElement;
                if (img.src !== rawHeroUrl) {
                  img.src = rawHeroUrl!;
                } else {
                  img.src = `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${activePatchGame.game_id}/header.jpg`;
                }
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-br from-black/85 via-black/20 to-transparent pointer-events-none" />
            <div className="absolute top-4 left-4 flex items-center justify-center drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] text-white">
              <Wrench className="w-5 h-5" />
            </div>
          </div>
        )}

        <div className="p-6 space-y-4">
          <div className="space-y-1.5 font-sans">
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">
              กำลังติดตั้ง Patch
            </span>
            <h3 className="text-sm font-bold text-white truncate">
              {activePatchGame.title}
            </h3>
            {activePatchGame.patch_exe_only && (
              <p className="text-[11px] text-zinc-400">
                Shortcut บน Desktop: <span className="text-zinc-200 font-semibold">{activePatchGame.title.replace(/[^a-zA-Z0-9 ]/g, '')}.lnk</span>
              </p>
            )}
          </div>

          {/* Progress Bar Container */}
          <div className="space-y-2 font-sans">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400 font-medium">
                {displayMessage}
              </span>
              <span className="text-white font-bold">
                {displayProgress}%
              </span>
            </div>
            
            <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800/50">
              <div 
                className="h-full bg-emerald-500 rounded-full transition-all duration-300 ease-out"
                style={{ 
                  width: `${displayProgress}%`
                }}
              />
            </div>
          </div>

          <div className="flex items-center justify-end pt-2 font-sans">
            <button
              onClick={handleCancelPatch}
              className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 hover:text-white text-zinc-300 font-bold rounded-lg text-xs transition-colors border border-zinc-800 w-full"
            >
              ยกเลิกการติดตั้ง
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
