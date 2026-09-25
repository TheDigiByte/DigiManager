import React, { useEffect } from 'react';
import { 
  AlertTriangle, 
  X, 
  Play, 
  RefreshCw, 
  Trash2, 
  Server, 
  Database 
} from 'lucide-react';
import { listen } from '@tauri-apps/api/event';
import { useAppContext } from '../context/AppContext';
import { resolveApiEndpoint } from '../config';
import { Tooltip } from './Tooltip';

export const SystemTab: React.FC = () => {
  const {
    user,
    systemStatus,
    systemPatchConfig,
    isLoadingSystemStatus,
    isSystemPatching,
    setIsSystemPatching,
    systemPatchStep,
    setSystemPatchStep,
    systemPatchProgress,
    setSystemPatchProgress,
    systemPatchMessage,
    setSystemPatchMessage,
    systemPatchError,
    setSystemPatchError,
    lastSystemCheckTime,
    isStoreConnected,
    isDbConnected,
    fetchSystemStatusAndConfig,
    handleStartSystemPatch,
    handleUninstallSystemPatch
  } = useAppContext();

  // Run a status check when mounting the tab
  useEffect(() => {
    fetchSystemStatusAndConfig(true);
  }, []);

  // Listen to background rust events for the system patch installation steps
  useEffect(() => {
    let unlisten: (() => void) | null = null;

    const setupListener = async () => {
      try {
        unlisten = await listen<{ step: number; progress: number; message: string }>('system-patch-progress', (event) => {
          const payload = event.payload;
          setSystemPatchStep(payload.step);
          setSystemPatchProgress(payload.progress);
          setSystemPatchMessage(payload.message);

          if (payload.step === 5 && payload.progress === 100) {
            // Successfully finished patch
            setTimeout(() => {
              setIsSystemPatching(false);
              fetchSystemStatusAndConfig();
            }, 1000);
          }
        });
      } catch (err) {
        console.error('Failed to setup system patch event listener:', err);
      }
    };

    if (isSystemPatching) {
      setupListener();
    }

    return () => {
      if (unlisten) unlisten();
    };
  }, [isSystemPatching]);

  if (!user) return null;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 pt-1 pb-10 animate-fade-in">

      {/* Error Alert if any */}
      {systemPatchError && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-3 text-rose-300 text-xs">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-400 mt-0.5" />
          <div className="flex-1 space-y-1">
            <h4 className="font-semibold text-rose-200 font-sans">เกิดข้อผิดพลาด</h4>
            <p className="text-rose-300/90 leading-relaxed">{systemPatchError}</p>
          </div>
          <button 
            onClick={() => setSystemPatchError(null)}
            className="text-rose-400 hover:text-rose-200 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col gap-1">
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">การตั้งค่าระบบ</span>
        <h2 className="text-2xl font-bold tracking-tight text-zinc-100 font-sans">สถานะระบบ & Patch</h2>
        <p className="text-sm text-zinc-400">จัดการส่วนเสริมและตรวจสอบความพร้อมในการเชื่อมต่อคลังเกมเข้ากับ Steam</p>
      </div>

      {/* 1. Steam & Patch Integration Card */}
      <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-zinc-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            {/* Left Header Icon */}
            <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 flex-shrink-0 flex items-center justify-center">
              {isSystemPatching ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" className="w-5 h-5 text-zinc-300 animate-spin" fill="none">
                  <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-25" />
                  <path fill="currentColor" d="M12 2a10 10 0 0 1 10 10h-2a8 8 0 0 0-8-8z" className="opacity-75" />
                </svg>
              ) : !systemStatus?.is_installed ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" className="w-5 h-5 text-zinc-500">
                  <path fill="currentColor" d="M20 17.175L7.4 4.6L10 2h8q.825 0 1.413.588T20 4zm.5 6.125L15.2 18l1.425-1.4L20 19.975V20q0 .825-.587 1.413T18 22H6q-.825 0-1.412-.587T4 20V8l.6-.6L.7 3.5l1.425-1.4L21.9 21.875z"/>
                </svg>
              ) : (systemStatus.installed_version && systemPatchConfig?.patch_version && systemStatus.installed_version !== systemPatchConfig.patch_version) ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" className="w-5 h-5 text-amber-400">
                  <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 11A8.1 8.1 0 0 0 4.5 9M4 5v4h4m-4 4a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4"/>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" className="w-5 h-5 text-emerald-400">
                  <path fill="currentColor" d="M.41 13.41L6 19l1.41-1.42L1.83 12m20.41-6.42L11.66 16.17L7.5 12l-1.43 1.41L11.66 19l12-12M18 7l-1.41-1.42l-6.35 6.35l1.42 1.41z"/>
                </svg>
              )}
            </div>

            <div className="space-y-0.5">
              <h3 className="text-base font-semibold text-zinc-100 font-sans">
                {isSystemPatching
                  ? 'กำลังติดตั้งส่วนเสริมระบบ'
                  : !systemStatus?.is_installed
                    ? 'ยังไม่ได้ติดตั้งระบบ'
                    : (systemStatus.installed_version && systemPatchConfig?.patch_version && systemStatus.installed_version !== systemPatchConfig.patch_version)
                      ? `พบอัปเดตใหม่ (v${systemPatchConfig.patch_version})`
                      : 'ระบบติดตั้งเรียบร้อยแล้ว'}
              </h3>
              <p className="text-xs text-zinc-400">
                {isSystemPatching
                  ? (systemPatchMessage || 'กำลังดำเนินการติดตั้งไฟล์ลงเครื่อง กรุณารอสักครู่...')
                  : !systemStatus?.is_installed
                    ? 'กดปุ่มติดตั้งเพื่อเชื่อมต่อคลังเกมเข้ากับโปรแกรม Steam'
                    : (systemStatus.installed_version && systemPatchConfig?.patch_version && systemStatus.installed_version !== systemPatchConfig.patch_version)
                      ? 'มีเวอร์ชันใหม่อัปเดตได้ กดปุ่มอัปเดตเพื่อรับเวอร์ชันล่าสุด'
                      : 'พร้อมสำหรับการเชื่อมต่อคลังเกมเข้ากับโปรแกรม Steam'}
              </p>
            </div>
          </div>

          {/* Card Actions (Shown when not patching) */}
          {!isSystemPatching && (
            <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
              {!systemStatus?.is_installed ? (
                <button
                  onClick={handleStartSystemPatch}
                  disabled={isLoadingSystemStatus}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-50 hover:bg-zinc-200 text-zinc-950 text-xs font-semibold transition-colors shadow-sm active:scale-95"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>ติดตั้งระบบทันที</span>
                </button>
              ) : (systemStatus.installed_version && systemPatchConfig?.patch_version && systemStatus.installed_version !== systemPatchConfig.patch_version) ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleStartSystemPatch}
                    disabled={isLoadingSystemStatus}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-semibold transition-colors shadow-sm active:scale-95"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>อัปเดต (v{systemPatchConfig.patch_version})</span>
                  </button>
                  <Tooltip content="ถอนการติดตั้ง Patch" side="top">
                    <button
                      onClick={handleUninstallSystemPatch}
                      disabled={isLoadingSystemStatus}
                      className="inline-flex items-center justify-center p-2 rounded-lg border border-zinc-800 bg-zinc-900/60 hover:bg-rose-500/10 hover:border-rose-500/30 text-zinc-400 hover:text-rose-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </Tooltip>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Tooltip content="ซิงค์และตรวจสอบไฟล์ระบบซ้ำ" side="top">
                    <button
                      onClick={handleStartSystemPatch}
                      disabled={isLoadingSystemStatus}
                      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-200 text-xs font-medium transition-colors"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>ซิงค์ระบบซ้ำ</span>
                    </button>
                  </Tooltip>
                  <Tooltip content="ถอนการติดตั้ง Patch" side="top">
                    <button
                      onClick={handleUninstallSystemPatch}
                      disabled={isLoadingSystemStatus}
                      className="inline-flex items-center justify-center p-2 rounded-lg border border-zinc-800 bg-zinc-900/60 hover:bg-rose-500/10 hover:border-rose-500/30 text-zinc-400 hover:text-rose-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </Tooltip>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Body Content */}
        {isSystemPatching ? (
          /* Inline Loading Panel during Patching */
          <div className="p-6 bg-zinc-950/40 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-zinc-350 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-25" />
                  <path fill="currentColor" d="M12 2a10 10 0 0 1 10 10h-2a8 8 0 0 0-8-8z" className="opacity-75" />
                </svg>
                <div>
                  <p className="text-sm font-semibold text-zinc-200">
                    {systemPatchMessage || 'กำลังดำเนินการติดตั้ง...'}
                  </p>
                  <p className="text-xs text-zinc-400">
                    ขั้นตอนที่ {systemPatchStep || 1} จาก 5 (กรุณารอสักครู่ ห้ามปิดโปรแกรม)
                  </p>
                </div>
              </div>
              <span className="text-sm font-semibold text-zinc-200">
                {systemPatchProgress}%
              </span>
            </div>

            <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-zinc-100 transition-all duration-300 rounded-full"
                style={{ width: `${systemPatchProgress}%` }}
              />
            </div>
          </div>
        ) : (
          /* Clean Settings Rows */
          <div className="divide-y divide-zinc-800/50 text-xs font-sans">
            <div className="px-6 py-3.5 flex items-center justify-between gap-4">
              <span className="text-zinc-400">เวอร์ชันระบบ</span>
              <div className="flex flex-col items-end gap-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-zinc-500 text-xs">เวอร์ชั่นของคุณ:</span>
                  <span className="font-medium text-zinc-200">
                    {systemStatus?.installed_version ? `v${systemStatus.installed_version}` : (systemStatus?.is_installed ? 'v1.0.4' : 'ยังไม่ได้ติดตั้ง')}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-zinc-500 text-xs">เวอร์ชั่นปัจจุบัน:</span>
                  <span className={`font-medium ${
                    (systemStatus?.is_installed && systemStatus?.installed_version && systemPatchConfig?.patch_version && systemStatus.installed_version !== systemPatchConfig.patch_version)
                      ? 'text-emerald-400 font-semibold'
                      : 'text-zinc-400'
                  }`}>
                    v{systemPatchConfig?.patch_version || '1.0.4'}
                  </span>
                </div>
              </div>
            </div>

            <div className="px-6 py-3.5 flex items-center justify-between">
              <span className="text-zinc-400">ตรวจสอบล่าสุดเมื่อ</span>
              <span className="font-medium text-zinc-300">
                {lastSystemCheckTime || 'เมื่อสักครู่'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 2. Services & Network Status */}
      <div className="space-y-3 font-sans">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <h3 className="text-sm font-semibold text-zinc-200">สถานะบริการและเครือข่าย</h3>
            <p className="text-xs text-zinc-400">สถานะการเชื่อมต่อไปยังระบบหลักของ DigiByte</p>
          </div>
          <button
            type="button"
            onClick={async () => {
              await resolveApiEndpoint();
              await fetchSystemStatusAndConfig(false);
            }}
            className="text-[11px] text-zinc-400 hover:text-zinc-200 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-800/60 hover:bg-zinc-800 border border-zinc-700/40 transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            <span>ตรวจสอบการเชื่อมต่อใหม่</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-4 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-zinc-800/60 border border-zinc-700/50 text-zinc-300">
                <Server className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-zinc-200">เซิร์ฟเวอร์ร้านค้า</h4>
                <p className="text-[11px] text-zinc-400">Store API Gateway</p>
              </div>
            </div>
            {isStoreConnected ? (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>เชื่อมต่อแล้ว</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                <span>ไม่ได้เชื่อมต่อ</span>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-4 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-zinc-800/60 border border-zinc-700/50 text-zinc-300">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-zinc-200">ฐานข้อมูลหลัก</h4>
                <p className="text-[11px] text-zinc-400">Main Database Hub</p>
              </div>
            </div>
            {isDbConnected ? (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>เชื่อมต่อแล้ว</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                <span>ไม่ได้เชื่อมต่อ</span>
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
};
