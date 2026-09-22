import React from 'react';
import { Wrench, Menu, Copy, Check } from 'lucide-react';
import { useAppContext, OwnedGameItem } from '../context/AppContext';
import { maskId, formatEditionName } from '../utils/helpers';
import { Tooltip } from './Tooltip';

interface GameCardProps {
  game: OwnedGameItem;
  onOpenContextMenu?: (e: React.MouseEvent, gameId: string) => void;
}

export const GameCard: React.FC<GameCardProps> = ({ game, onOpenContextMenu }) => {
  const {
    luaExistsMap,
    favorites,
    toggleFavorite,
    redeemingOrderId,
    redeemProgressMap,
    handleRedeem,
    handlePatchClick,
    activeMenuGameId,
    setActiveMenuGameId,
    setMenuPosition,
    showToast
  } = useAppContext();

  const [copiedOrderId, setCopiedOrderId] = React.useState<string | null>(null);

  const isRedeemed = !!game.redeemed_by && game.redeemed_by.trim() !== '' && game.redeemed_by.trim() !== '-';
  const hasLua = luaExistsMap[game.game_id];
  const isFav = favorites.includes(game.order_id);

  let btnText = 'รีดีม';
  let btnDisabled = false;

  if (isRedeemed) {
    if (hasLua) {
      btnText = 'รีดีมแล้ว';
      btnDisabled = true;
    } else {
      btnText = 'รีดีมอีกครั้ง';
      btnDisabled = false;
    }
  } else {
    btnText = 'รีดีม';
    btnDisabled = false;
  }

  const handleCopyOrder = (e: React.MouseEvent, orderId: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(orderId);
    setCopiedOrderId(orderId);
    showToast('คัดลอกสำเร็จ', 'คัดลอกรหัสออเดอร์คีย์ไปยังคลิปบอร์ดแล้ว', 'success');
    setTimeout(() => {
      setCopiedOrderId(null);
    }, 2000);
  };

  const handleContextMenuTrigger = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onOpenContextMenu) {
      onOpenContextMenu(e, game.game_id);
    } else {
      const menuWidth = 224;
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

      const originX = e.clientX > x + 10 ? 'right' : 'left';
      const originY = e.clientY > y + 10 ? 'bottom' : 'top';
      const transformOrigin = `${originY} ${originX}`;

      setActiveMenuGameId(game.game_id);
      setMenuPosition({ x, y, transformOrigin });
    }
  };

  return (
    <div
      onContextMenu={handleContextMenuTrigger}
      className={`group bg-[#121214]/90 rounded-2xl flex flex-col justify-between transition-all duration-300 cursor-pointer relative
        ${activeMenuGameId === game.game_id
          ? 'border border-zinc-800 bg-zinc-900/60 shadow-lg'
          : 'border border-transparent hover:border-zinc-800 hover:bg-zinc-900/60'
        }`}
    >
      <div>
        {/* Game Banner */}
        <div className="aspect-[2.14/1] bg-zinc-950 overflow-hidden relative rounded-t-2xl">
          <img
            src={game.header_image || game.poster_image}
            alt={game.title}
            className="w-full h-full object-cover transition-transform duration-350"
            loading="lazy"
          />

          {/* Bookmark Button */}
          <Tooltip
            content={isFav ? 'นำออกจากเกมโปรด' : 'ปักหมุดเกมโปรด'}
            side="top"
            containerClassName="absolute top-2.5 right-2.5 z-10"
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFavorite(game.order_id);
              }}
              className="p-1.5 rounded-lg bg-black/60 border border-zinc-800/40 backdrop-blur-md text-zinc-400 hover:text-amber-400 active:scale-90 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
              style={{
                color: isFav ? '#fbbf24' : undefined,
                opacity: isFav ? 1 : undefined
              }}
            >
              {isFav ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-amber-400 text-amber-400">
                  <path fill="currentColor" d="M19.97 6.321v13.33a2.47 2.47 0 0 1-1.45 2.13a2.53 2.53 0 0 1-1.3.2a2.46 2.46 0 0 1-1.22-.51l-3.41-2.53a1.07 1.07 0 0 0-1.23 0l-3.43 2.56a2.47 2.47 0 0 1-1.2.5h-.3a2.4 2.4 0 0 1-1-.22a2.5 2.5 0 0 1-1-.83a2.53 2.53 0 0 1-.43-1.25V6.342a4.49 4.49 0 0 1 4.65-4.34h6.73A4.49 4.49 0 0 1 20 6.321z"/>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m10.94 18.339l-3.43 2.548a1.71 1.71 0 0 1-2.76-1.23V6.35a3.735 3.735 0 0 1 3.87-3.597h6.76a3.74 3.74 0 0 1 3.87 3.597v13.309a1.708 1.708 0 0 1-2.76 1.229l-3.43-2.548a1.8 1.8 0 0 0-2.12 0"/>
                </svg>
              )}
            </button>
          </Tooltip>
        </div>

        {/* Info */}
        <div className="p-4 space-y-2">
          <div>
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-bold text-zinc-100 group-hover:text-white line-clamp-1 truncate text-sm">
                {game.title}
              </h3>
              {isRedeemed && hasLua && (
                <Tooltip content="ติดตั้งแล้ว (พร้อมเล่น)" side="top">
                  <span className="inline-flex items-center justify-center flex-shrink-0 text-emerald-400">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" className="w-4 h-4">
                      <defs>
                        <mask id={`installed-mask-card-${game.order_id}`}>
                          <g strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
                            <path fill="#fff" fillOpacity="0" stroke="#fff" strokeDasharray="60" d="M3 12c0 -4.97 4.03 -9 9 -9c4.97 0 9 4.03 9 9c0 4.97 -4.03 9 -9 9c-4.97 0 -9 -4.03 -9 -9Z">
                              <animate fill="freeze" attributeName="stroke-dashoffset" dur="0.6s" values="60;0" />
                              <animate fill="freeze" attributeName="fill-opacity" begin="0.6s" dur="0.4s" to="1" />
                            </path>
                            <path fill="none" stroke="#000" strokeDasharray="14" strokeDashoffset="14" d="M8 12l3 3l5 -5">
                              <animate fill="freeze" attributeName="stroke-dashoffset" begin="1.1s" dur="0.2s" to="0" />
                            </path>
                          </g>
                        </mask>
                      </defs>
                      <path fill="currentColor" d="M0 0h24v24H0z" mask={`url(#installed-mask-card-${game.order_id})`} />
                    </svg>
                  </span>
                </Tooltip>
              )}
            </div>
            {game.edition && (
              <p className="text-[11px] text-zinc-400 font-medium leading-tight mt-0.5 truncate">
                {formatEditionName(game.edition)}
              </p>
            )}
          </div>

          <div className="space-y-1 font-sans">
            <div className="flex items-center gap-1.5 text-[10px] text-zinc-450 font-medium select-none group/order">
              <span>ออเดอร์:</span>
              <span className="select-all text-zinc-300 font-semibold">{game.order_id}</span>
              <Tooltip content={copiedOrderId === game.order_id ? 'คัดลอกสำเร็จ' : 'คัดลอกรหัสออเดอร์'} side="top">
                <button
                  onClick={(e) => handleCopyOrder(e, game.order_id)}
                  className="p-1 hover:bg-zinc-800 rounded text-zinc-500 hover:text-zinc-300 transition-all flex items-center justify-center opacity-0 group-hover/order:opacity-100 focus:opacity-100"
                >
                  {copiedOrderId === game.order_id ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
              </Tooltip>
            </div>
            <div className="text-[10px] text-zinc-450 font-medium truncate">
              รีดีม: {game.redeemed_by ? (
                <span className="text-zinc-300 font-semibold">{maskId(game.redeemed_by)}</span>
              ) : (
                <span className="text-zinc-500">-</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Play / Actions */}
      <div className="px-4 pb-4 pt-1 flex items-center gap-2 relative font-sans">
        <button
          disabled={btnDisabled || redeemingOrderId === game.order_id}
          onClick={() => handleRedeem(game, btnText)}
          className={`flex-grow py-2 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 border relative overflow-hidden
            ${(btnDisabled || redeemingOrderId === game.order_id)
              ? 'bg-zinc-800/40 text-zinc-400 cursor-not-allowed border-zinc-700/50'
              : 'bg-zinc-50 hover:bg-zinc-200 active:scale-[0.98] text-zinc-950 border-transparent'
            }`}
        >
          {redeemingOrderId === game.order_id ? (
            game.has_manifests && typeof redeemProgressMap[game.order_id] === 'number' ? (
              <>
                <div
                  className="absolute inset-0 bg-blue-600/80 transition-all duration-250 ease-out"
                  style={{ width: `${Math.min(100, Math.max(0, redeemProgressMap[game.order_id]))}%` }}
                />
                <span className="relative z-10 text-white font-semibold flex items-center gap-1.5">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-white animate-spin flex-shrink-0" viewBox="0 0 24 24">
                    <g stroke="currentColor">
                      <circle cx="12" cy="12" r="9.5" fill="none" strokeLinecap="round" strokeWidth="3">
                        <animate attributeName="stroke-dasharray" calcMode="spline" dur="1.5s" keySplines="0.42,0,0.58,1;0.42,0,0.58,1;0.42,0,0.58,1" keyTimes="0;0.475;0.95;1" repeatCount="indefinite" values="0 150;42 150;42 150;42 150" />
                        <animate attributeName="stroke-dashoffset" calcMode="spline" dur="1.5s" keySplines="0.42,0,0.58,1;0.42,0,0.58,1;0.42,0,0.58,1" keyTimes="0;0.475;0.95;1" repeatCount="indefinite" values="0;-16;-59;-59" />
                      </circle>
                      <animateTransform attributeName="transform" dur="2s" repeatCount="indefinite" type="rotate" values="0 12 12;360 12 12" />
                    </g>
                  </svg>
                  <span>กำลังดำเนินการ {redeemProgressMap[game.order_id]}%</span>
                </span>
              </>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-white animate-spin" viewBox="0 0 24 24">
                <g stroke="currentColor">
                  <circle cx="12" cy="12" r="9.5" fill="none" strokeLinecap="round" strokeWidth="3">
                    <animate attributeName="stroke-dasharray" calcMode="spline" dur="1.5s" keySplines="0.42,0,0.58,1;0.42,0,0.58,1;0.42,0,0.58,1" keyTimes="0;0.475;0.95;1" repeatCount="indefinite" values="0 150;42 150;42 150;42 150" />
                    <animate attributeName="stroke-dashoffset" calcMode="spline" dur="1.5s" keySplines="0.42,0,0.58,1;0.42,0,0.58,1;0.42,0,0.58,1" keyTimes="0;0.475;0.95;1" repeatCount="indefinite" values="0;-16;-59;-59" />
                  </circle>
                  <animateTransform attributeName="transform" dur="2s" repeatCount="indefinite" type="rotate" values="0 12 12;360 12 12" />
                </g>
              </svg>
            )
          ) : (
            <span>{btnText}</span>
          )}
        </button>
        {game.patch_enabled && (
          <Tooltip content="ติดตั้ง Patch" side="top">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handlePatchClick(game);
              }}
              className="p-2 aspect-square bg-zinc-900 hover:bg-zinc-800 hover:text-white active:scale-98 text-zinc-300 rounded-lg transition-colors border border-zinc-800 flex items-center justify-center relative"
            >
              <Wrench className="w-4 h-4" />
            </button>
          </Tooltip>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (activeMenuGameId === game.game_id) {
              setActiveMenuGameId(null);
              setMenuPosition(null);
            } else {
              handleContextMenuTrigger(e);
            }
          }}
          className="p-2 aspect-square bg-zinc-900 hover:bg-zinc-800 hover:text-white active:scale-98 text-zinc-300 rounded-lg transition-colors border border-zinc-800 flex items-center justify-center relative"
        >
          <Menu className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
