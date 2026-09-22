import React from 'react';
import { 
  Home, 
  Compass, 
  Key, 
  Cpu, 
  Settings,
  LogOut 
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Tooltip } from './Tooltip';

export const Sidebar: React.FC = () => {
  const {
    user,
    activeTab,
    setActiveTab,
    isLoadingSystemStatus,
    isSystemPatching,
    systemStatus,
    systemPatchConfig,
    handleLogout
  } = useAppContext();

  if (!user) return null;

  return (
    <aside className="w-64 border-r border-zinc-800/60 bg-zinc-900/30 flex flex-col justify-between p-4 select-none flex-shrink-0">
      <div>
        {/* Logo / App Name */}
        <div className="flex items-center gap-3 px-2 py-3 mb-6">
          <div className="w-8 h-8 rounded-lg bg-zinc-100 text-zinc-950 flex items-center justify-center shadow-sm flex-shrink-0">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="6" y1="12" x2="10" y2="12"></line>
              <line x1="8" y1="10" x2="8" y2="14"></line>
              <line x1="15" y1="13" x2="15.01" y2="13"></line>
              <line x1="18" y1="11" x2="18.01" y2="11"></line>
              <rect x="2" y="6" width="20" height="12" rx="3" ry="3"></rect>
            </svg>
          </div>
          <div className="min-w-0">
            <h1 className="font-bold text-sm tracking-wide leading-none text-zinc-100 truncate">
              DigiManager
            </h1>
            <span className="text-[11px] text-zinc-400 font-medium tracking-tight block mt-1 truncate">
              DigiByte Library Manager
            </span>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="space-y-1">
          <button
            onClick={() => setActiveTab('home')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeTab === 'home'
                ? 'bg-zinc-900 border border-zinc-800/80 text-zinc-50 shadow-sm'
                : 'border border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
            }`}
          >
            <Home className="w-4 h-4" />
            <span>หน้าหลัก</span>
          </button>

          <button
            onClick={() => setActiveTab('library')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeTab === 'library'
                ? 'bg-zinc-900 border border-zinc-800/80 text-zinc-50 shadow-sm'
                : 'border border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>คลังเกม</span>
          </button>

          <button
            onClick={() => setActiveTab('redeem')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeTab === 'redeem'
                ? 'bg-zinc-900 border border-zinc-800/80 text-zinc-50 shadow-sm'
                : 'border border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
            }`}
          >
            <Key className="w-4 h-4" />
            <span>รีดีมออเดอร์</span>
          </button>

          <button
            onClick={() => setActiveTab('specs')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeTab === 'specs'
                ? 'bg-zinc-900 border border-zinc-800/80 text-zinc-50 shadow-sm'
                : 'border border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>ตรวจสอบสเปคคอม</span>
          </button>
        </nav>
      </div>

      {/* Sidebar Footer */}
      <div className="space-y-1">
        <button
          onClick={() => setActiveTab('system')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
            activeTab === 'system'
              ? 'bg-zinc-900 border border-zinc-800/80 text-zinc-50 shadow-sm'
              : 'border border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
          }`}
        >
          {isLoadingSystemStatus || isSystemPatching ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-zinc-400" viewBox="0 0 24 24">
              <g stroke="currentColor">
                <circle cx="12" cy="12" r="9.5" fill="none" strokeLinecap="round" strokeWidth="3">
                  <animate attributeName="stroke-dasharray" calcMode="spline" dur="1.5s" keySplines="0.42,0,0.58,1;0.42,0,0.58,1;0.42,0,0.58,1" keyTimes="0;0.475;0.95;1" repeatCount="indefinite" values="0 150;42 150;42 150;42 150"/>
                  <animate attributeName="stroke-dashoffset" calcMode="spline" dur="1.5s" keySplines="0.42,0,0.58,1;0.42,0,0.58,1;0.42,0,0.58,1" keyTimes="0;0.475;0.95;1" repeatCount="indefinite" values="0;-16;-59;-59"/>
                </circle>
                <animateTransform attributeName="transform" dur="2s" repeatCount="indefinite" type="rotate" values="0 12 12;360 12 12"/>
              </g>
            </svg>
          ) : (!systemStatus || !systemStatus.is_installed) ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" className="w-4 h-4 text-zinc-400">
              <path fill="currentColor" d="M20 17.175L7.4 4.6L10 2h8q.825 0 1.413.588T20 4zm.5 6.125L15.2 18l1.425-1.4L20 19.975V20q0 .825-.587 1.413T18 22H6q-.825 0-1.412-.587T4 20V8l.6-.6L.7 3.5l1.425-1.4L21.9 21.875z"/>
            </svg>
          ) : (systemStatus.installed_version && systemPatchConfig?.patch_version && systemStatus.installed_version !== systemPatchConfig.patch_version) ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" className="w-4 h-4 text-amber-400 animate-pulse">
              <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 11A8.1 8.1 0 0 0 4.5 9M4 5v4h4m-4 4a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4"/>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" className="w-4 h-4 text-emerald-400">
              <path fill="currentColor" d="M.41 13.41L6 19l1.41-1.42L1.83 12m20.41-6.42L11.66 16.17L7.5 12l-1.43 1.41L11.66 19l12-12M18 7l-1.41-1.42l-6.35 6.35l1.42 1.41z"/>
            </svg>
          )}
          <span>ระบบ</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
            activeTab === 'settings'
              ? 'bg-zinc-900 border border-zinc-800/80 text-zinc-50 shadow-sm'
              : 'border border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>ตั้งค่า</span>
        </button>

        <div className="border-t border-zinc-800/40 pt-4 px-1">
          <div 
            onClick={() => setActiveTab('profile')}
            className={`w-full flex items-center justify-between p-2 rounded-xl transition-all duration-300 border cursor-pointer select-none group/profile
              ${activeTab === 'profile'
                ? 'bg-zinc-900 border-zinc-800/80 text-zinc-50 shadow-sm'
                : 'bg-transparent border-transparent hover:bg-zinc-900/50 text-zinc-400 hover:text-zinc-200'
              }`}
          >
            {/* Left User Details */}
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="w-9 h-9 rounded-lg bg-zinc-800/70 border border-zinc-700/20 flex items-center justify-center text-zinc-300 flex-shrink-0 shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-[15px] h-[15px] text-zinc-400" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M12 2a5 5 0 1 0 0 10a5 5 0 1 0 0-10M4 22h16c.55 0 1-.45 1-1v-1c0-3.86-3.14-7-7-7h-4c-3.86 0-7 3.14-7 7v1c0 .55.45 1 1 1" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[12.5px] font-bold text-zinc-200 truncate leading-none">
                  {user.name}
                </p>
                <p className="text-[9.5px] text-zinc-500 font-semibold truncate leading-none mt-1.5">
                  @{user.username.toLowerCase()}
                </p>
              </div>
            </div>

            {/* Right Nested Logout Button */}
            <Tooltip content="ออกจากระบบ" side="top">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleLogout();
                }}
                className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-zinc-850/60 rounded-lg transition-all flex-shrink-0 outline-none"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </Tooltip>
          </div>
        </div>
      </div>
    </aside>
  );
};
