import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  Trash2, 
  Check, 
  RefreshCw, 
  ArrowUpCircle, 
  AlertCircle, 
  FileText,
  Download
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { useAppContext } from '../context/AppContext';
import { APP_VERSION } from '../config';
import { LoadingSpinner } from './LoadingSpinner';
import { Tooltip } from './Tooltip';

export const SettingsTab: React.FC = () => {
  const { 
    user, 
    fetchOwnedGames, 
    showPatchNotes,
    updateInfo,
    isUpdatingApp,
    updateProgressPct,
    updateStatusMsg,
    updateError,
    setUpdateError,
    handleDownloadAppUpdate,
    checkAppUpdateGlobal
  } = useAppContext();

  // Start with Windows setting (default to true for first-time users)
  const [startOnBoot, setStartOnBoot] = useState<boolean>(true);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [isClearingCache, setIsClearingCache] = useState(false);
  const [cacheCleared, setCacheCleared] = useState(false);

  // Dynamic pixel-perfect sync between progress bar and ambient background line
  const cardRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [ambientWidth, setAmbientWidth] = useState<number>(0);
  const [isAmbientFaded, setIsAmbientFaded] = useState<boolean>(false);
  const [ambientStarted, setAmbientStarted] = useState<boolean>(false);

  const syncAmbientWidth = () => {
    if (cardRef.current && trackRef.current) {
      const cardRect = cardRef.current.getBoundingClientRect();
      const trackRect = trackRef.current.getBoundingClientRect();
      // Subtract 1px to offset the card's outer border so the vertical line touches the fill edge seamlessly
      const trackLeftOffset = trackRect.left - cardRect.left - 1;
      const progressFillPx = (trackRect.width * Math.max(0, Math.min(100, updateProgressPct))) / 100;
      setAmbientWidth(trackLeftOffset + progressFillPx);
    }
  };

  useLayoutEffect(() => {
    syncAmbientWidth();
    const raf = requestAnimationFrame(syncAmbientWidth);
    return () => cancelAnimationFrame(raf);
  }, [updateProgressPct, isUpdatingApp]);

  useEffect(() => {
    window.addEventListener('resize', syncAmbientWidth);
    return () => window.removeEventListener('resize', syncAmbientWidth);
  }, [updateProgressPct]);

  // Ambient start entrance animation: smoothly flows in from left edge (0px) to start of track (~24px)
  useEffect(() => {
    let startTimer: any;
    if (isUpdatingApp) {
      if (updateProgressPct === 0) {
        setAmbientStarted(false);
        startTimer = setTimeout(() => {
          setAmbientStarted(true);
        }, 40);
      } else {
        setAmbientStarted(true);
      }
    } else {
      setAmbientStarted(false);
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
        setIsAmbientFaded(true);
      }, 550);
    } else {
      setIsAmbientFaded(false);
    }
    return () => {
      if (fadeTimer) clearTimeout(fadeTimer);
    };
  }, [updateProgressPct, isUpdatingApp]);

  useEffect(() => {
    // Check real Windows autostart registry status
    invoke<boolean>('get_autostart_status')
      .then((status) => {
        const autostartConfigured = localStorage.getItem('digimanager_autostart_configured');
        const isExplicitlyDisabled = localStorage.getItem('digimanager_autostart_disabled') === 'true';
        if (!status && !isExplicitlyDisabled && autostartConfigured === null) {
          // Fresh user: enable autostart by default in Windows Registry
          invoke<boolean>('set_autostart_status', { enabled: true })
            .then((ok) => {
              if (ok) {
                localStorage.setItem('digimanager_autostart_configured', 'true');
                setStartOnBoot(true);
              } else {
                setStartOnBoot(false);
              }
            })
            .catch(() => setStartOnBoot(false));
        } else {
          setStartOnBoot(status);
        }
      })
      .catch(() => setStartOnBoot(false));

    // Initial check for updates if not checked yet
    if (!updateInfo) {
      checkAppUpdateGlobal({ manual: false });
    }
  }, []);

  const handleToggleStartOnBoot = async () => {
    const next = !startOnBoot;
    try {
      const ok = await invoke<boolean>('set_autostart_status', { enabled: next });
      if (ok) {
        localStorage.setItem('digimanager_autostart_configured', 'true');
        if (!next) {
          localStorage.setItem('digimanager_autostart_disabled', 'true');
        } else {
          localStorage.removeItem('digimanager_autostart_disabled');
        }
        setStartOnBoot(next);
        (window as any).showToast(
          'ตั้งค่าสำเร็จ',
          next ? 'เปิดใช้งานเริ่มพร้อมเครื่อง (จะเปิดแบบย่อลง System Tray ล่างขวา)' : 'ปิดใช้งานการเริ่มโปรแกรมพร้อมเปิดเครื่องแล้ว',
          'success'
        );
      } else {
        (window as any).showToast('ข้อผิดพลาด', 'ไม่สามารถแก้ไขค่า Registry การเริ่มโปรแกรมได้', 'error');
      }
    } catch (err) {
      console.error('Failed to set autostart status:', err);
    }
  };

  const handleManualCheck = async () => {
    setIsCheckingUpdate(true);
    try {
      await checkAppUpdateGlobal({ manual: true });
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  const handleClearCache = async () => {
    setIsClearingCache(true);
    try {
      if (user) {
        localStorage.removeItem(`ownedGames_${user.username}`);
        localStorage.removeItem(`luaExistsMap_${user.username}`);
        await fetchOwnedGames(user.username, true);
      }
      setCacheCleared(true);
      (window as any).showToast('ล้างแคชสำเร็จ', 'ล้างข้อมูลแคชชั่วคราวและซิงค์ใหม่เรียบร้อยแล้ว', 'success');
      setTimeout(() => setCacheCleared(false), 3000);
    } catch (err) {
      console.error('Failed to clear cache:', err);
    } finally {
      setIsClearingCache(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-7 pt-1 pb-10 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between pb-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-zinc-900/80 flex items-center justify-center text-zinc-300 shadow-sm flex-shrink-0">
            <SettingsIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-zinc-100">
              ตั้งค่าโปรแกรม
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              ปรับแต่งการทำงาน อัปเดตเวอร์ชัน และข้อมูลระบบของโปรแกรม DigiManager
            </p>
          </div>
        </div>
      </div>

      {/* 1. General & Behavior Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-450 px-1">
          <RefreshCw className="w-3.5 h-3.5" />
          <span>การทำงานและพฤติกรรมของระบบ</span>
        </div>

        <div className="bg-[#121214]/90 rounded-2xl p-5 shadow-sm">
          {/* Start on Windows Boot */}
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5 max-w-[560px]">
              <p className="text-sm font-bold text-zinc-200">เปิดโปรแกรมอัตโนมัติเมื่อเปิดเครื่อง</p>
              <p className="text-xs text-zinc-450">
                เริ่มการทำงานของ DigiManager อัตโนมัติเมื่อเข้าสู่ระบบ Windows โดยจะย่อลง System Tray มุมล่างขวาพร้อมใช้งานทันที
              </p>
            </div>
            <button
              onClick={handleToggleStartOnBoot}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 cursor-pointer flex-shrink-0 ${
                startOnBoot ? 'bg-emerald-500' : 'bg-zinc-800'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                  startOnBoot ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Software Updates Section (Exact 1:1 Design from User Mockup) */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-450 px-1">
          <ArrowUpCircle className="w-3.5 h-3.5" />
          <span>การอัปเดตโปรแกรม</span>
        </div>

        {/* The Update Card */}
        <div 
          ref={cardRef}
          className="relative overflow-hidden rounded-2xl bg-[#222225] border border-zinc-800/80 p-5 sm:p-6 transition-all duration-300 shadow-sm"
        >
          
          {/* Ambient Blue Background Fill (Dynamically synchronized with progress bar head, flows smoothly at start & end) */}
          {isUpdatingApp && (
            <div 
              className={`absolute inset-y-0 left-0 bg-gradient-to-r from-sky-950/70 via-sky-900/40 to-sky-700/25 pointer-events-none z-0 border-r ${
                updateProgressPct >= 100 
                  ? 'border-r-transparent' 
                  : 'border-sky-400/30'
              } ${
                isAmbientFaded 
                  ? 'opacity-0 transition-opacity duration-700 ease-out' 
                  : updateProgressPct >= 100
                  ? 'opacity-100 transition-all duration-500 ease-out'
                  : !ambientStarted
                  ? 'opacity-100 transition-none'
                  : updateProgressPct === 0
                  ? 'opacity-100 transition-all duration-500 ease-out'
                  : 'opacity-100 transition-all duration-300 ease-out'
              }`}
              style={{ 
                width: !ambientStarted
                  ? '0px'
                  : updateProgressPct >= 100 
                  ? '100%' 
                  : ambientWidth > 0 
                  ? `${ambientWidth}px` 
                  : `calc(1.5rem + (100% - 3rem) * ${updateProgressPct} / 100)` 
              }}
            />
          )}

          {/* Card Content Layer */}
          <div className="relative z-10 space-y-4">
            
            {/* Top Row: Title + Version info on left, Action / Circular Spinner on right */}
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white tracking-tight">
                  {isUpdatingApp 
                    ? 'กำลังอัพเดท' 
                    : isCheckingUpdate 
                    ? 'กำลังตรวจสอบ' 
                    : updateInfo?.hasUpdate 
                    ? `พบเวอร์ชั่นใหม่ v${updateInfo.latestVersion}` 
                    : 'ตรวจสอบเวอร์ชั่นล่าสุด'}
                </h3>
                <p className="text-xs text-zinc-400 font-normal">
                  {isUpdatingApp ? (
                    <span>
                      เวอร์ชั่น {APP_VERSION} → {updateInfo?.latestVersion || APP_VERSION}
                    </span>
                  ) : updateInfo?.hasUpdate ? (
                    <span>
                      เวอร์ชั่น {APP_VERSION} → {updateInfo.latestVersion}
                    </span>
                  ) : (
                    <span>เวอร์ชั่นปัจจุบันของคุณ: {APP_VERSION}</span>
                  )}
                </p>
              </div>

              {/* Right Side: Circular Spinner if updating or checking, or Clean Floating Icon Buttons if idle */}
              <div className="flex items-center gap-1 flex-shrink-0">
                {isUpdatingApp || isCheckingUpdate ? (
                  /* Circular Ring Spinner matching loading-spinner.svg */
                  <div className="w-8 h-8 flex items-center justify-center">
                    <LoadingSpinner className="w-7 h-7 text-zinc-200" />
                  </div>
                ) : updateInfo?.hasUpdate ? (
                  /* Update Available State: Clean Floating Icons */
                  <div className="flex items-center gap-1">
                    <Tooltip content="บันทึกการอัปเดต (Patch Notes)">
                      <button
                        type="button"
                        onClick={() => showPatchNotes(
                          updateInfo?.latestVersion || '', 
                          updateInfo?.changelog || '', 
                          () => handleDownloadAppUpdate(updateInfo?.downloadUrl)
                        )}
                        className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800/60 active:scale-95 rounded-xl transition-all cursor-pointer"
                        aria-label="บันทึกการอัปเดต (Patch Notes)"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                    </Tooltip>

                    <Tooltip content={`อัปเดตทันทีเป็น v${updateInfo.latestVersion}`}>
                      <button
                        type="button"
                        onClick={() => handleDownloadAppUpdate(updateInfo.downloadUrl)}
                        className="p-2 text-sky-400 hover:text-sky-300 hover:bg-sky-500/15 active:scale-95 rounded-xl transition-all cursor-pointer"
                        aria-label="อัปเดตทันที"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </Tooltip>

                    <Tooltip content="ตรวจสอบอัปเดต">
                      <button
                        type="button"
                        onClick={handleManualCheck}
                        disabled={isCheckingUpdate || isUpdatingApp}
                        className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800/60 active:scale-95 rounded-xl transition-all cursor-pointer disabled:opacity-50"
                        aria-label="ตรวจสอบอัปเดต"
                      >
                        <RefreshCw className={`w-4 h-4 ${isCheckingUpdate ? 'animate-spin text-sky-400' : ''}`} />
                      </button>
                    </Tooltip>
                  </div>
                ) : (
                  /* Normal Default State: Clean Floating Icons (Patch Notes + Refresh) */
                  <div className="flex items-center gap-1">
                    <Tooltip content="บันทึกการอัปเดต (Patch Notes)">
                      <button
                        type="button"
                        onClick={() => showPatchNotes(
                          updateInfo?.latestVersion || APP_VERSION,
                          updateInfo?.changelog || '',
                          undefined
                        )}
                        className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800/60 active:scale-95 rounded-xl transition-all cursor-pointer"
                        aria-label="บันทึกการอัปเดต (Patch Notes)"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                    </Tooltip>

                    <Tooltip content="ตรวจสอบอัปเดต">
                      <button
                        type="button"
                        onClick={handleManualCheck}
                        disabled={isCheckingUpdate || isUpdatingApp}
                        className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800/60 active:scale-95 rounded-xl transition-all cursor-pointer disabled:opacity-50"
                        aria-label="ตรวจสอบอัปเดต"
                      >
                        <RefreshCw className={`w-4 h-4 ${isCheckingUpdate ? 'animate-spin text-sky-400' : ''}`} />
                      </button>
                    </Tooltip>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Section: Mini Spinner Status + Progress Bar (Only shown during actual update download/install) */}
            {isUpdatingApp && (
              <div className="space-y-2 pt-1 animate-fade-in">
                {/* Status line with mini circular spinner */}
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

                {/* Progress Track Line: Outer track has rounded-full overflow-hidden, inner fill has rounded-none (straight vertical cut) */}
                <div 
                  ref={trackRef}
                  className="w-full h-1.5 bg-zinc-600/70 rounded-full overflow-hidden"
                >
                  <div 
                    className="h-full bg-sky-400 rounded-none transition-all duration-300 ease-out"
                    style={{ 
                      width: `${updateProgressPct}%` 
                    }}
                  />
                </div>
              </div>
            )}

            {/* Error Message if any */}
            {updateError && (
              <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl flex items-start gap-2.5 text-rose-300 text-xs">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400 mt-0.5" />
                <div className="space-y-0.5 flex-1">
                  <p className="font-semibold text-rose-200">การอัปเดตไม่สำเร็จ</p>
                  <p className="text-[11px] text-rose-300/80">{updateError}</p>
                </div>
                <button
                  onClick={() => setUpdateError(null)}
                  className="text-rose-400 hover:text-rose-200 text-xs px-2 py-0.5 rounded cursor-pointer"
                >
                  ปิด
                </button>
              </div>
            )}

          </div>
        </div>

      </div>

      {/* 3. Cache & Storage Management */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-450 px-1">
          <Trash2 className="w-3.5 h-3.5" />
          <span>การจัดการข้อมูลแคช</span>
        </div>

        <div className="bg-[#121214]/90 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-0.5 max-w-[560px]">
            <p className="text-sm font-bold text-zinc-200">ล้างข้อมูลแคชชั่วคราว</p>
            <p className="text-xs text-zinc-450">
              ล้างแคชรายการเกมและข้อมูลชั่วคราวในเครื่องเพื่อบังคับซิงค์ข้อมูลใหม่จากเซิร์ฟเวอร์
            </p>
          </div>
          <button
            disabled={isClearingCache}
            onClick={handleClearCache}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 flex-shrink-0 cursor-pointer ${
              cacheCleared
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'bg-zinc-850 hover:bg-rose-500/20 text-zinc-300 hover:text-rose-400'
            }`}
          >
            {isClearingCache ? (
              <LoadingSpinner className="w-3.5 h-3.5" />
            ) : cacheCleared ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>ล้างสำเร็จแล้ว</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>ล้างข้อมูลแคช</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 4. Minimal About & Footer */}
      <div className="pt-6 pb-2 border-t border-zinc-800/85 flex items-center justify-between text-xs text-zinc-500">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-zinc-400">DigiManager v{APP_VERSION}</span>
          <span className="text-zinc-700">•</span>
          <span>Tauri 2.0 / Rust</span>
        </div>
      </div>
    </div>
  );
};
