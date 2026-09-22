import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { APP_VERSION } from '../config';
import { getModalIcon, formatModalMessage } from '../utils/helpers';
import { Download, X, AlertCircle } from 'lucide-react';
import { Tooltip } from './Tooltip';
import { LoadingSpinner } from './LoadingSpinner';

export const GlobalModal: React.FC = () => {
  const { 
    modal, 
    closeModalWithTransition,
    ownedGames,
    verifiedGame,
    isUpdatingApp,
    updateProgressPct,
    updateStatusMsg,
    updateError,
    updateInfo
  } = useAppContext();

  // Dynamic pixel-perfect sync & ambient animations for in-modal update card
  const modalCardRef = useRef<HTMLDivElement>(null);
  const modalTrackRef = useRef<HTMLDivElement>(null);
  const [modalAmbientWidth, setModalAmbientWidth] = useState<number>(0);
  const [modalAmbientStarted, setModalAmbientStarted] = useState<boolean>(false);
  const [modalAmbientFaded, setModalAmbientFaded] = useState<boolean>(false);

  const syncModalAmbientWidth = () => {
    if (modalCardRef.current && modalTrackRef.current) {
      const cardRect = modalCardRef.current.getBoundingClientRect();
      const trackRect = modalTrackRef.current.getBoundingClientRect();
      // Subtract 1px to offset outer border so vertical line touches the fill edge seamlessly
      const trackLeftOffset = trackRect.left - cardRect.left - 1;
      const progressFillPx = (trackRect.width * Math.max(0, Math.min(100, updateProgressPct))) / 100;
      setModalAmbientWidth(trackLeftOffset + progressFillPx);
    }
  };

  useLayoutEffect(() => {
    if (isUpdatingApp) {
      syncModalAmbientWidth();
      const raf = requestAnimationFrame(syncModalAmbientWidth);
      return () => cancelAnimationFrame(raf);
    }
  }, [updateProgressPct, isUpdatingApp]);

  useEffect(() => {
    if (isUpdatingApp) {
      window.addEventListener('resize', syncModalAmbientWidth);
      return () => window.removeEventListener('resize', syncModalAmbientWidth);
    }
  }, [updateProgressPct, isUpdatingApp]);

  // Ambient start entrance animation: smoothly flows in from left edge (0px) to start of track (~24px)
  useEffect(() => {
    let startTimer: any;
    if (isUpdatingApp) {
      if (updateProgressPct === 0) {
        setModalAmbientStarted(false);
        startTimer = setTimeout(() => {
          setModalAmbientStarted(true);
        }, 40);
      } else {
        setModalAmbientStarted(true);
      }
    } else {
      setModalAmbientStarted(false);
    }
    return () => {
      if (startTimer) clearTimeout(startTimer);
    };
  }, [isUpdatingApp, updateProgressPct === 0]);

  // Ambient completion animation: smoothly fill the remaining card width at 100%, then fade out
  useEffect(() => {
    let fadeTimer: any;
    if (updateProgressPct >= 100 && isUpdatingApp) {
      fadeTimer = setTimeout(() => {
        setModalAmbientFaded(true);
      }, 550);
    } else {
      setModalAmbientFaded(false);
    }
    return () => {
      if (fadeTimer) clearTimeout(fadeTimer);
    };
  }, [updateProgressPct, isUpdatingApp]);

  const [isHeroLoading, setIsHeroLoading] = useState(true);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const isPatchNotes = modal.type === 'patch_notes' || modal.type === 'mandatory_update';
  const isMandatory = !!modal.isMandatory || modal.type === 'mandatory_update';
  const hasHero = !isPatchNotes && (!!modal.gameId || !!modal.imageUrl);

  // Find target game from ownedGames or verifiedGame
  const targetGame = modal.gameId
    ? ((ownedGames || []).find((g) => g.game_id === modal.gameId) || (verifiedGame?.game_id === modal.gameId ? verifiedGame : null))
    : null;

  // Strictly use Hero image only (custom hero from json, modal parameter, or steam library_hero)
  const customHeroUrl = modal.imageUrl || targetGame?.hero_image;
  const defaultSteamHeroUrl = modal.gameId ? `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${modal.gameId}/library_hero.jpg` : null;

  const rawHeroUrl = customHeroUrl || defaultSteamHeroUrl;
  const heroUrl = rawHeroUrl
    ? (rawHeroUrl.startsWith('http') && !rawHeroUrl.includes('localhost') && !rawHeroUrl.includes('127.0.0.1')
        ? `https://wsrv.nl/?url=${encodeURIComponent(rawHeroUrl)}&output=webp&q=75&w=800`
        : rawHeroUrl)
    : null;

  React.useEffect(() => {
    if (modal.isOpen) {
      if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0) {
        setIsHeroLoading(false);
      } else {
        setIsHeroLoading(true);
      }
    }
  }, [modal.isOpen, heroUrl, rawHeroUrl]);

  if (!modal.isOpen) return null;

  const renderPatchNoteItems = (text: string) => {
    if (!text || !text.trim()) {
      return <p className="text-xs text-zinc-400">ไม่มีรายละเอียดการอัปเดตระบุไว้</p>;
    }

    const lines = text.split('\n');

    return (
      <div className="space-y-1.5 select-text font-sans">
        {lines.map((rawLine, idx) => {
          if (!rawLine.trim()) {
            return <div key={idx} className="h-1" />;
          }

          // Calculate indent level from leading spaces or tabs
          const leadingMatch = rawLine.match(/^([ \t]*)/);
          const leadingStr = leadingMatch ? leadingMatch[1] : '';
          const spaceCount = leadingStr.replace(/\t/g, '  ').length;
          const indentLevel = Math.min(4, Math.floor(spaceCount / 2));

          const trimmed = rawLine.trim();
          const isBullet = /^[-*•]\s+/.test(trimmed) || /^\d+\.\s+/.test(trimmed);
          const content = isBullet 
            ? trimmed.replace(/^[-*•]\s+/, '').replace(/^\d+\.\s+/, '')
            : trimmed;

          // Padding left based on indentation level
          const plStyle = indentLevel > 0 ? { paddingLeft: `${indentLevel * 1.25}rem` } : undefined;

          return (
            <div 
              key={idx} 
              style={plStyle}
              className={`flex items-start gap-2 text-xs leading-relaxed ${
                indentLevel === 0 ? 'text-zinc-200' : 'text-zinc-350'
              }`}
            >
              {/* Clean solid bullet dot */}
              <span className={`mt-1.5 flex-shrink-0 w-1.5 h-1.5 rounded-full ${
                indentLevel === 0 ? 'bg-zinc-200' : 'bg-zinc-400'
              }`} />
              <span className="break-words flex-1">
                {content}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 ${modal.isClosing ? 'animate-backdrop-out' : 'animate-backdrop-in'}`}>
      {isUpdatingApp ? (
        /* Sleek 1:1 In-Modal Update Card matching SettingsTab */
        <div 
          ref={modalCardRef}
          className={`relative overflow-hidden rounded-2xl bg-[#222225] border border-zinc-800/80 p-5 sm:p-6 w-full max-w-lg shadow-2xl mx-4 transition-all duration-300 font-sans ${
            modal.isClosing ? 'animate-modal-out' : 'animate-modal-in'
          }`}
        >
          {/* Ambient Blue Background Fill (Dynamically synchronized with progress bar head, flows smoothly at start & end) */}
          <div 
            className={`absolute inset-y-0 left-0 bg-gradient-to-r from-sky-950/70 via-sky-900/40 to-sky-700/25 pointer-events-none z-0 border-r ${
              updateProgressPct >= 100 
                ? 'border-r-transparent' 
                : 'border-sky-400/30'
            } ${
              modalAmbientFaded 
                ? 'opacity-0 transition-opacity duration-700 ease-out' 
                : updateProgressPct >= 100
                ? 'opacity-100 transition-all duration-500 ease-out'
                : !modalAmbientStarted
                ? 'opacity-100 transition-none'
                : updateProgressPct === 0
                ? 'opacity-100 transition-all duration-500 ease-out'
                : 'opacity-100 transition-all duration-300 ease-out'
            }`}
            style={{ 
              width: !modalAmbientStarted
                ? '0px'
                : updateProgressPct >= 100 
                ? '100%' 
                : modalAmbientWidth > 0 
                ? `${modalAmbientWidth}px` 
                : `calc(1.5rem + (100% - 3rem) * ${updateProgressPct} / 100)` 
            }}
          />

          {/* Card Content Layer */}
          <div className="relative z-10 space-y-4">
            
            {/* Top Row: Title + Version info on left, Ring Spinner on right */}
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white tracking-tight">
                  กำลังอัพเดท
                </h3>
                <p className="text-xs text-zinc-400 font-normal">
                  เวอร์ชั่น {APP_VERSION} → {updateInfo?.latestVersion || modal.versionBadge || APP_VERSION}
                </p>
              </div>

              {/* Circular Ring Spinner matching loading-spinner.svg */}
              <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
                <LoadingSpinner className="w-7 h-7 text-zinc-200" />
              </div>
            </div>

            {/* Bottom Section: Mini Spinner Status + Progress Bar */}
            <div className="space-y-2 pt-1 animate-fade-in">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <div className="flex items-center gap-2">
                  <LoadingSpinner className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
                  <span>
                    {updateStatusMsg && !updateStatusMsg.startsWith('กำลังดาวน์โหลด')
                      ? updateStatusMsg
                      : `กำลังอัพเดท ${updateProgressPct}%`}
                  </span>
                </div>

              </div>

              {/* Progress Track Line */}
              <div 
                ref={modalTrackRef}
                className="w-full h-1.5 bg-zinc-600/70 rounded-full overflow-hidden"
              >
                <div 
                  className="h-full bg-sky-400 rounded-none transition-all duration-300 ease-out"
                  style={{ width: `${updateProgressPct}%` }}
                />
              </div>
            </div>

            {/* Error Message if any */}
            {updateError && (
              <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl flex items-start gap-2.5 text-rose-300 text-xs">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400 mt-0.5" />
                <div className="space-y-0.5 flex-1">
                  <p className="font-semibold text-rose-200">การอัปเดตไม่สำเร็จ</p>
                  <p className="text-[11px] text-rose-300/80">{updateError}</p>
                </div>
              </div>
            )}

          </div>
        </div>
      ) : (
        <div className={`${isPatchNotes ? 'max-w-md sm:max-w-lg' : hasHero ? 'max-w-md' : 'max-w-sm'} w-full bg-zinc-950/95 border border-zinc-800/80 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl mx-4 transition-all duration-300 flex flex-col max-h-[85vh] ${modal.isClosing ? 'animate-modal-out' : 'animate-modal-in'}`}>
          
          {/* Game Hero Banner for Game Modals */}
          {hasHero && (
            <div className="relative w-full aspect-[1920/620] overflow-hidden bg-zinc-900 border-b border-zinc-800/50 flex-shrink-0 flex items-center justify-center">
              {/* Loading Spinner */}
              {isHeroLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/60 z-10 animate-fade-in pointer-events-none">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-7 h-7 text-zinc-400"
                    viewBox="0 0 24 24"
                  >
                    <g stroke="currentColor">
                      <circle
                        cx="12"
                        cy="12"
                        r="9.5"
                        fill="none"
                        strokeLinecap="round"
                        strokeWidth="3"
                      >
                        <animate
                          attributeName="stroke-dasharray"
                          calcMode="spline"
                          dur="1.5s"
                          keySplines="0.42,0,0.58,1;0.42,0,0.58,1;0.42,0,0.58,1"
                          keyTimes="0;0.475;0.95;1"
                          repeatCount="indefinite"
                          values="0 150;42 150;42 150;42 150"
                        />
                        <animate
                          attributeName="stroke-dashoffset"
                          calcMode="spline"
                          dur="1.5s"
                          keySplines="0.42,0,0.58,1;0.42,0,0.58,1;0.42,0,0.58,1"
                          keyTimes="0;0.475;0.95;1"
                          repeatCount="indefinite"
                          values="0;-16;-59;-59"
                        />
                      </circle>
                      <animateTransform
                        attributeName="transform"
                        dur="2s"
                        repeatCount="indefinite"
                        type="rotate"
                        values="0 12 12;360 12 12"
                      />
                    </g>
                  </svg>
                </div>
              )}

              <img 
                ref={imgRef}
                src={heroUrl || rawHeroUrl || ''} 
                alt="" 
                className={`w-full h-full object-cover select-none transition-opacity duration-300 ${isHeroLoading ? 'opacity-0' : 'opacity-100'}`}
                onLoad={() => setIsHeroLoading(false)}
                onError={(e) => {
                  const img = e.target as HTMLImageElement;
                  if (rawHeroUrl && img.src !== rawHeroUrl) {
                    img.src = rawHeroUrl;
                  } else {
                    setIsHeroLoading(false);
                    img.style.display = 'none';
                  }
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-br from-black/85 via-black/20 to-transparent pointer-events-none" />
              <div className="absolute top-4 left-4 flex items-center justify-center drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] z-20">
                {getModalIcon(modal.type, modal.title)}
              </div>
            </div>
          )}

          {/* Patch Notes / Mandatory Update Modal Layout */}
          {isPatchNotes ? (
            <div className="p-6 sm:p-7 space-y-5 flex flex-col max-h-[85vh]">
              {/* Header */}
              <div className="flex items-start justify-between gap-4 flex-shrink-0 font-sans">
                <div className="space-y-0.5">
                  <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                    {modal.title || (isMandatory ? `จำเป็นต้องอัปเดตเวอร์ชันใหม่ v${modal.versionBadge}` : `บันทึกการอัปเดต v${modal.versionBadge}`)}
                  </h3>
                  <p className="text-xs text-zinc-400">
                    {isMandatory 
                      ? 'กรุณาอัปเดตเพื่อเข้าใช้งานและรับฟีเจอร์ความปลอดภัยล่าสุด' 
                      : 'รายละเอียดการเปลี่ยนแปลงและการปรับปรุงในเวอร์ชันนี้'}
                  </p>
                </div>

                <Tooltip content={isMandatory ? 'ปิดโปรแกรม' : 'ปิด'} side="left">
                  <button
                    onClick={() => {
                      if (isMandatory) {
                        if (modal.onCancel) modal.onCancel();
                      } else {
                        closeModalWithTransition(modal.onCancel);
                      }
                    }}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-850 active:scale-95 transition-all cursor-pointer flex-shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </Tooltip>
              </div>

              {/* List Body with clean nested bullet points */}
              <div className="flex-1 overflow-y-auto min-h-0 select-text font-sans pr-1 max-h-[48vh] custom-scrollbar">
                {renderPatchNoteItems(modal.message)}
              </div>

              {updateError && (
                <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl flex items-start gap-2 text-rose-300 text-xs">
                  <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                  <p>{updateError}</p>
                </div>
              )}

              {/* Footer without divider line (only render when actions exist) */}
              {(modal.onConfirm || (modal.cancelLabel && modal.cancelLabel !== 'ปิด') || isMandatory) && (
                <div className="pt-2 flex items-center justify-end gap-2.5 font-sans flex-shrink-0">
                  {((modal.cancelLabel && modal.cancelLabel !== 'ปิด') || isMandatory) && (
                    <button
                      onClick={() => {
                        if (isMandatory) {
                          if (modal.onCancel) modal.onCancel();
                        } else {
                          closeModalWithTransition(modal.onCancel);
                        }
                      }}
                      className="px-4 py-2 hover:bg-zinc-900 text-zinc-400 hover:text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                    >
                      {modal.cancelLabel || (isMandatory ? 'ปิดโปรแกรม' : '')}
                    </button>
                  )}
                  {modal.onConfirm && (
                    <button
                      onClick={() => {
                        if (modal.onConfirm) modal.onConfirm();
                      }}
                      className="px-5 py-2.5 bg-white hover:bg-zinc-200 active:scale-95 text-zinc-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-lg shadow-black/25 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>{modal.confirmLabel || 'อัปเดตทันที'}</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
          /* Standard Alert / Confirm / Choice Layout */
          <div className="p-6 space-y-4">
            <div className="space-y-2 font-sans">
              <div className="flex items-center gap-2">
                {!hasHero && (
                  <div className="flex-shrink-0 flex items-center justify-center text-zinc-100">
                    {getModalIcon(modal.type, modal.title)}
                  </div>
                )}
                <h3 className="text-sm font-bold text-zinc-100">{modal.title}</h3>
              </div>
              <p className="text-zinc-400 text-xs whitespace-pre-wrap leading-relaxed">{formatModalMessage(modal.message)}</p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 font-sans">
              {modal.type === 'patch_choice' ? (
                <>
                  <button
                    onClick={() => closeModalWithTransition(modal.onCancel)}
                    className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 hover:text-white text-zinc-300 font-bold rounded-lg text-xs transition-colors border border-zinc-800 flex-1 animate-fade-in"
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={() => closeModalWithTransition(modal.onSecondary)}
                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-bold rounded-lg text-xs transition-colors border border-zinc-700 flex-1 animate-fade-in"
                  >
                    ลงแต่ Patch พอ
                  </button>
                  <button
                    onClick={() => closeModalWithTransition(modal.onConfirm)}
                    className="px-4 py-2 bg-zinc-50 hover:bg-zinc-200 text-zinc-950 font-bold rounded-lg text-xs transition-colors shadow-sm flex-1 animate-fade-in"
                  >
                    เอาเลย
                  </button>
                </>
              ) : modal.type === 'confirm' ? (
                <>
                  <button
                    onClick={() => closeModalWithTransition(modal.onCancel)}
                    className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 hover:text-white text-zinc-300 font-bold rounded-lg text-xs transition-colors border border-zinc-800 min-w-[5rem] animate-fade-in"
                  >
                    {modal.cancelLabel || 'ยกเลิก'}
                  </button>
                  <button
                    onClick={() => closeModalWithTransition(modal.onConfirm)}
                    className="px-4 py-2 bg-zinc-50 hover:bg-zinc-200 text-zinc-950 font-bold rounded-lg text-xs transition-colors shadow-sm min-w-[5rem] animate-fade-in"
                  >
                    {modal.confirmLabel || 'ยืนยัน'}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => closeModalWithTransition(modal.onConfirm)}
                  className="px-4 py-2 bg-zinc-50 hover:bg-zinc-200 text-zinc-950 font-bold rounded-lg text-xs transition-colors shadow-sm min-w-[5rem] animate-fade-in"
                >
                  {modal.confirmLabel || 'ตกลง'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
      )}
    </div>
  );
};

