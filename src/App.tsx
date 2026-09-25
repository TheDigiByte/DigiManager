import './App.css';
import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { Minus, Square, X } from 'lucide-react';
import { AppProvider, useAppContext } from './context/AppContext';
import { API_BASE_URL, APP_VERSION, resolveApiEndpoint } from './config';

// Import Modular Components
import { Sidebar } from './components/Sidebar';
import { LoginScreen } from './components/LoginScreen';
import { HomeTab } from './components/HomeTab';
import { LibraryTab } from './components/LibraryTab';
import { SpecsTab } from './components/SpecsTab';
import { SystemTab } from './components/SystemTab';
import { RedeemTab } from './components/RedeemTab';
import { ProfileTab } from './components/ProfileTab';
import { SettingsTab } from './components/SettingsTab';
import { ProgressModal } from './components/ProgressModal';
import { GlobalModal } from './components/GlobalModal';
import { Tooltip } from './components/Tooltip';

const appWindow = getCurrentWindow();

function AppContent() {
  const {
    user,
    activeTab,
    setActiveTab,
    isInitializing,
    setIsInitializing,
    isSyncing,
    setUser,
    setOwnedGames,
    setLuaExistsMap,
    syncProfile,
    systemStatus,
    systemSpecs,
    fetchOwnedGames,
    fetchSystemStatusAndConfig,
    fetchSystemSpecs,
    checkAppUpdateGlobal,
    isStoreConnected,
    setIsStoreConnected
  } = useAppContext();

  const [isRetryingConnect, setIsRetryingConnect] = useState(false);

  const handleRetryConnect = async () => {
    if (isRetryingConnect) return;
    setIsRetryingConnect(true);
    try {
      await resolveApiEndpoint();
      await fetchSystemStatusAndConfig(true);
    } catch (e) {
      console.error(e);
    } finally {
      setTimeout(() => {
        setIsRetryingConnect(false);
      }, 600);
    }
  };

  // 1. Check Session & Restore state on initial startup
  useEffect(() => {
    const checkSession = async () => {
      // Auto-resolve dynamic server API endpoint from GitHub pointer/cache before network requests
      try {
        await resolveApiEndpoint();
      } catch (e) {
        console.warn('Endpoint resolution fallback:', e);
      }

      // Immediately check for update on app startup
      checkAppUpdateGlobal({ forceModal: true });

      // Enable autostart with Windows by default ONLY on fresh first launch (never overrides user choice)
      const autostartConfigured = localStorage.getItem('digimanager_autostart_configured');
      const isExplicitlyDisabled = localStorage.getItem('digimanager_autostart_disabled') === 'true';
      const cachedUser = localStorage.getItem('user');
      const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding');

      if (!isExplicitlyDisabled && autostartConfigured === null) {
        // Only auto-enable for brand new users downloading for the first time
        const isFreshUser = !hasSeenOnboarding && !cachedUser;
        if (isFreshUser) {
          try {
            const ok = await invoke<boolean>('set_autostart_status', { enabled: true });
            if (ok) {
              localStorage.setItem('digimanager_autostart_configured', 'true');
            }
          } catch (e) {
            console.error('Failed to enable default autostart on boot:', e);
          }
        } else {
          // Existing user who updated: mark configured so we respect their existing registry choice
          localStorage.setItem('digimanager_autostart_configured', 'true');
        }
      }

      if (cachedUser) {
        try {
          const parsed = JSON.parse(cachedUser);
          setUser(parsed);

          // Instantly restore cached games & lua map to prevent screen flashing
          const cachedGames = localStorage.getItem(`ownedGames_${parsed.username}`);
          const cachedLuaMap = localStorage.getItem(`luaExistsMap_${parsed.username}`);
          if (cachedGames) setOwnedGames(JSON.parse(cachedGames));
          if (cachedLuaMap) setLuaExistsMap(JSON.parse(cachedLuaMap));

          setActiveTab('home');
          await syncProfile(parsed.username);
        } catch (e) {
          localStorage.removeItem('user');
          setActiveTab('login');
        }
      } else {
        if (hasSeenOnboarding === 'true') {
          setActiveTab('login');
        } else {
          setActiveTab('onboarding');
        }
      }
      setIsInitializing(false);
    };

    checkSession();
  }, []);

  // Disable default browser context menu globally in the desktop client
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };
    window.addEventListener('contextmenu', handleContextMenu);
    return () => window.removeEventListener('contextmenu', handleContextMenu);
  }, []);

  // 2. Fetch data upon switching tabs & background periodic sync
  useEffect(() => {
    if (!user) return;

    if (activeTab === 'library' || activeTab === 'home') {
      fetchOwnedGames(user.username, true);
    }
    if (activeTab === 'system') {
      fetchSystemStatusAndConfig(systemStatus !== null);
    }
    if (activeTab === 'specs' && !systemSpecs) {
      fetchSystemSpecs();
    }
  }, [activeTab]);

  // 3. Silent background auto-sync (every 45 seconds & on window focus)
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      fetchOwnedGames(user.username, true);
    }, 45000);

    const handleFocus = () => {
      fetchOwnedGames(user.username, true);
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [user]);

  // 4. Background Auto-Update Check (runs on startup, every 2 minutes & on focus)
  useEffect(() => {
    let lastChecked = 0;
    const pollUpdate = () => {
      const now = Date.now();
      if (now - lastChecked < 60000) return;
      lastChecked = now;
      checkAppUpdateGlobal({ forceModal: true });
    };

    const interval = setInterval(pollUpdate, 120000);

    const handleFocus = () => {
      pollUpdate();
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // 5. Silent periodic heartbeat to monitor store server connectivity (every 30 seconds & on focus)
  useEffect(() => {
    const pingServer = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/digimanager_settings.php`, {
          headers: { 'ngrok-skip-browser-warning': 'true' },
          signal: AbortSignal.timeout(4000)
        });
        if (res.ok) {
          setIsStoreConnected(true);
        } else {
          setIsStoreConnected(false);
        }
      } catch {
        setIsStoreConnected(false);
      }
    };

    pingServer();
    const interval = setInterval(pingServer, 30000);
    window.addEventListener('focus', pingServer);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', pingServer);
    };
  }, []);

  // Handle Window Commands
  const handleMinimize = () => appWindow.minimize().catch(err => console.error(err));
  const handleMaximize = () => appWindow.toggleMaximize().catch(err => console.error(err));
  const handleClose = () => {
    invoke('hide_window').catch(() => {
      appWindow.hide().catch(err => console.error(err));
    });
  };

  // Boot Loading State
  if (isInitializing) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-zinc-950 text-zinc-100 font-sans select-none">
        <div className="flex flex-col items-center gap-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-zinc-400" viewBox="0 0 24 24">
            <g stroke="currentColor">
              <circle cx="12" cy="12" r="9.5" fill="none" strokeLinecap="round" strokeWidth="3">
                <animate attributeName="stroke-dasharray" calcMode="spline" dur="1.5s" keySplines="0.42,0,0.58,1;0.42,0,0.58,1;0.42,0,0.58,1" keyTimes="0;0.475;0.95;1" repeatCount="indefinite" values="0 150;42 150;42 150;42 150"/>
                <animate attributeName="stroke-dashoffset" calcMode="spline" dur="1.5s" keySplines="0.42,0,0.58,1;0.42,0,0.58,1;0.42,0,0.58,1" keyTimes="0;0.475;0.95;1" repeatCount="indefinite" values="0;-16;-59;-59"/>
              </circle>
              <animateTransform attributeName="transform" dur="2s" repeatCount="indefinite" type="rotate" values="0 12 12;360 12 12"/>
            </g>
          </svg>
          <p className="text-sm font-semibold tracking-wide text-zinc-400 animate-pulse font-sans">กำลังตรวจสอบเซสชั่น...</p>
        </div>
      </div>
    );
  }

  const showSidebar = user !== null && activeTab !== 'onboarding' && activeTab !== 'login' && activeTab !== 'register';

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-zinc-950 text-zinc-100 font-sans select-none relative">
      
      {/* LEFT SIDEBAR VIEW */}
      {showSidebar && <Sidebar />}

      {/* RIGHT CONTENT PANE */}
      <main className="flex-1 flex flex-col min-w-0 bg-zinc-950 relative">
        
        {/* Custom Window Header for Dragging Region */}
        <header
          className="relative z-50 h-10 border-b border-zinc-800/40 flex items-center justify-between px-4 select-none drag-region flex-shrink-0"
          onDoubleClick={handleMaximize}
        >
          <div className="text-xs text-zinc-500 font-medium flex items-center gap-2 font-sans">
            <span className="text-zinc-400 font-medium">DigiManager Hub</span>
            <span className="text-[11px] text-zinc-600 font-normal tracking-wide">v{APP_VERSION}</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`w-3.5 h-3.5 text-zinc-400 transition-all duration-300 transform ${
                isSyncing ? 'opacity-100 scale-100 animate-spin' : 'opacity-0 scale-75 pointer-events-none'
              }`}
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeWidth="3" className="opacity-25" />
              <path fill="currentColor" d="M12 2a10 10 0 0 1 10 10h-2a8 8 0 0 0-8-8z" className="opacity-75" />
            </svg>
          </div>

          {/* Window control buttons & status badges (no-drag so they are clickable) */}
          <div className="flex items-center gap-2 text-zinc-400 no-drag">
            {/* Disconnected / Reconnecting Spinner Status Icon */}
            {!isStoreConnected && (
              <Tooltip content="ยังไม่ได้เชื่อมต่อ กำลังลองอีกครั้ง" side="bottom" sideOffset={8}>
                <button
                  type="button"
                  onClick={handleRetryConnect}
                  disabled={isRetryingConnect}
                  title="ยังไม่ได้เชื่อมต่อ กำลังลองอีกครั้ง"
                  aria-label="ยังไม่ได้เชื่อมต่อ กำลังลองอีกครั้ง"
                  className="p-1 rounded hover:bg-zinc-800/60 text-rose-500 hover:text-rose-400 transition-colors flex items-center justify-center cursor-pointer mr-0.5 select-none"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24">
                    <g stroke="currentColor">
                      <circle cx="12" cy="12" r="9.5" fill="none" strokeLinecap="round" strokeWidth="3">
                        <animate attributeName="stroke-dasharray" calcMode="spline" dur="1.5s" keySplines="0.42,0,0.58,1;0.42,0,0.58,1;0.42,0,0.58,1" keyTimes="0;0.475;0.95;1" repeatCount="indefinite" values="0 150;42 150;42 150;42 150"/>
                        <animate attributeName="stroke-dashoffset" calcMode="spline" dur="1.5s" keySplines="0.42,0,0.58,1;0.42,0,0.58,1;0.42,0,0.58,1" keyTimes="0;0.475;0.95;1" repeatCount="indefinite" values="0;-16;-59;-59"/>
                      </circle>
                      <animateTransform attributeName="transform" dur="2s" repeatCount="indefinite" type="rotate" values="0 12 12;360 12 12"/>
                    </g>
                  </svg>
                </button>
              </Tooltip>
            )}

            <div className="flex items-center gap-1">
              <button
                onClick={handleMinimize}
                className="p-1.5 hover:bg-zinc-850 rounded transition-colors"
                aria-label="Minimize"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleMaximize}
                className="p-1.5 hover:bg-zinc-850 rounded transition-colors"
                aria-label="Maximize / Restore"
              >
                <Square className="w-3 h-3" />
              </button>
              <button
                onClick={handleClose}
                className="p-1.5 hover:bg-rose-600 hover:text-white rounded transition-colors"
                aria-label="Close"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </header>

        {/* Tab switcher wrapper */}
        <div 
          style={{ scrollbarGutter: (activeTab === 'login' || activeTab === 'register' || activeTab === 'onboarding') ? 'auto' : 'stable' }}
          className={`flex-1 ${
            (activeTab === 'login' || activeTab === 'register' || activeTab === 'onboarding') ? 'p-0 overflow-hidden' : 'p-4 sm:p-6 lg:p-8 overflow-y-auto'
          }`}
        >
          {/* Splash screen / onboarding screen */}
          {(activeTab === 'onboarding' || activeTab === 'login' || activeTab === 'register') && <LoginScreen />}

          {/* Core views */}
          {activeTab === 'home' && user && <HomeTab />}
          {activeTab === 'library' && user && <LibraryTab />}
          {activeTab === 'redeem' && user && <RedeemTab />}
          {activeTab === 'system' && user && <SystemTab />}
          {activeTab === 'specs' && user && <SpecsTab />}
          {activeTab === 'profile' && user && <ProfileTab />}
          {activeTab === 'settings' && user && <SettingsTab />}
        </div>
      </main>

      {/* OVERLAY MODALS */}
      <ProgressModal />
      <GlobalModal />

    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}