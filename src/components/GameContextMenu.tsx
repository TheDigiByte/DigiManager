import React from 'react';
import { Trash2, ShoppingBag, RotateCcw } from 'lucide-react';
import { openUrl } from '@tauri-apps/plugin-opener';
import { useAppContext } from '../context/AppContext';
import { Tooltip } from './Tooltip';

export const GameContextMenu: React.FC = () => {
  const {
    user,
    ownedGames,
    luaExistsMap,
    activeMenuGameId,
    setActiveMenuGameId,
    menuPosition,
    setMenuPosition,
    favorites,
    toggleFavorite,
    handleRemoveFromSteam,
    handleClearGameCache
  } = useAppContext();

  if (!user || !activeMenuGameId || !menuPosition) return null;

  const game = ownedGames.find((g) => g.game_id === activeMenuGameId);
  if (!game) return null;

  const hasLua = !!luaExistsMap[game.game_id];

  return (
    <div
      key={`${activeMenuGameId}-${menuPosition.x}-${menuPosition.y}`}
      style={{
        position: 'fixed',
        left: menuPosition.x,
        top: menuPosition.y,
        transformOrigin: menuPosition.transformOrigin
      }}
      className="w-56 bg-zinc-900/80 backdrop-blur-md border border-zinc-800 rounded-xl shadow-2xl z-50 p-1.5 space-y-0.5 animate-context-menu-in no-drag font-sans"
    >
      <div className="space-y-0.5 mb-1">

        {/* Clear Game Cache */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setActiveMenuGameId(null);
            setMenuPosition(null);
            handleClearGameCache(game);
          }}
          className="w-full flex items-center justify-start gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs font-medium transition-colors hover:bg-amber-500/10 hover:text-amber-300 text-zinc-300 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
          <span>ล้างแคชและรีเซ็ตเกม</span>
        </button>


        {/* Revoke / Remove Lua */}
        <Tooltip
          content="ยังไม่ได้รีดีมหรือไม่มีไฟล์สิทธิ์ในเครื่อง"
          disabled={hasLua}
          side="left"
          containerClassName="w-full"
        >
          <button
            disabled={!hasLua}
            onClick={(e) => {
              if (!hasLua) return;
              e.stopPropagation();
              setActiveMenuGameId(null);
              setMenuPosition(null);
              handleRemoveFromSteam(game);
            }}
            className={`w-full flex items-center justify-start gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs font-medium transition-colors ${
              hasLua
                ? 'hover:bg-rose-500/10 hover:text-rose-400 text-rose-500/90 cursor-pointer'
                : 'opacity-40 text-zinc-500 cursor-not-allowed'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>ถอนสิทธิ์เล่น</span>
          </button>
        </Tooltip>
      </div>

      <div className="border-t border-zinc-800/50 my-1" />

      <button
        onClick={(e) => {
          e.stopPropagation();
          setActiveMenuGameId(null);
          setMenuPosition(null);
          toggleFavorite(game.order_id);
        }}
        className="w-full text-left px-2.5 py-1.5 hover:bg-zinc-800/50 hover:text-white rounded-lg text-xs text-zinc-300 transition-colors flex items-center gap-2 font-medium"
      >
        {favorites.includes(game.order_id) ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" fill="currentColor">
            <path d="M19.97 6.321v13.33a2.47 2.47 0 0 1-1.45 2.13a2.53 2.53 0 0 1-1.3.2a2.46 2.46 0 0 1-1.22-.51l-3.41-2.53a1.07 1.07 0 0 0-1.23 0l-3.43 2.56a2.47 2.47 0 0 1-1.2.5h-.3a2.4 2.4 0 0 1-1-.22a2.5 2.5 0 0 1-1-.83a2.53 2.53 0 0 1-.43-1.25V6.342a4.49 4.49 0 0 1 4.65-4.34h6.73A4.49 4.49 0 0 1 20 6.321z"/>
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" className="w-3.5 h-3.5 text-zinc-450 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m10.94 18.339l-3.43 2.548a1.71 1.71 0 0 1-2.76-1.23V6.35a3.735 3.735 0 0 1 3.87-3.597h6.76a3.74 3.74 0 0 1 3.87 3.597v13.309a1.708 1.708 0 0 1-2.76 1.229l-3.43-2.548a1.8 1.8 0 0 0-2.12 0"/>
          </svg>
        )}
        <span>{favorites.includes(game.order_id) ? 'นำออกจากเกมโปรด' : 'ปักหมุดเกมโปรด'}</span>
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation();
          setActiveMenuGameId(null);
          setMenuPosition(null);
          openUrl(`https://store.steampowered.com/app/${game.game_id}`);
        }}
        className="w-full text-left px-2.5 py-1.5 hover:bg-zinc-800/50 hover:text-white rounded-lg text-xs text-zinc-300 transition-colors flex items-center gap-2 font-medium"
      >
        <ShoppingBag className="w-3.5 h-3.5 text-zinc-450" />
        <span>หน้าร้านค้า Steam</span>
      </button>
    </div>
  );
};
