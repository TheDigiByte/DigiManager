import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { openUrl } from '@tauri-apps/plugin-opener';
import { listen } from '@tauri-apps/api/event';
import { API_BASE_URL, APP_VERSION } from '../config';
import { maskId, formatEditionName } from '../utils/helpers';

export function compareVersions(v1: string, v2: string): number {
  const p1 = v1.replace(/^v/i, '').split('.').map(n => parseInt(n, 10) || 0);
  const p2 = v2.replace(/^v/i, '').split('.').map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
    const a = p1[i] || 0;
    const b = p2[i] || 0;
    if (a > b) return 1;
    if (a < b) return -1;
  }
  return 0;
}

export interface UserProfile {
  username: string;
  name: string;
  display_name: string;
  email: string;
  avatar: string;
  role: number;
  credit: number;
  games: string[];
  favorite: string[];
}

export interface SystemPatchStatus {
  steam_path: string;
  steam_user: string;
  appdata_user: string;
  appdata_diby_path: string;
  has_toml: boolean;
  toml_content: string;
  has_xinput: boolean;
  has_opensteamtool_dll: boolean;
  has_dwmapi: boolean;
  all_files_exist: boolean;
  missing_files: string[];
  toml_valid: boolean;
  is_installed: boolean;
  installed_version?: string;
  is_steam_running: boolean;
}

export interface OwnedGameItem {
  game_id: string;
  order_id: string;
  title: string;
  poster_image: string;
  header_image: string;
  hero_image?: string;
  developer: string;
  game_type: string;
  denuvo: boolean;
  redeemed_by: string;
  redeemed_at: string;
  created_at?: string;
  edition: string;
  order_status: string;
  reject_reason: string;
  patch_enabled?: boolean;
  patch_download_url?: string;
  patch_exe_only?: boolean;
  patch_exe_filename?: string;
  patch_game_folder?: string;
  patch_extra_files?: Array<{ download_url: string; target_path: string }>;
  profile_sync_enabled?: boolean;
  profile_sync_file?: string;
  profile_sync_key?: string;
  manifest_enabled?: boolean;
  has_manifests?: boolean;
  manifest_count?: number;
  lua_hash?: string;
  manifest_hash?: string;
}

export interface ModalState {
  isOpen: boolean;
  isClosing?: boolean;
  title: string;
  message: string;
  type: 'confirm' | 'alert' | 'patch_choice' | 'patch_notes' | 'mandatory_update';
  gameId?: string;
  imageUrl?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  onSecondary?: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  versionBadge?: string;
  downloadUrl?: string;
  isMandatory?: boolean;
}

interface AppContextType {
  // States
  user: UserProfile | null;
  setUser: React.Dispatch<React.SetStateAction<UserProfile | null>>;
  activeTab: 'onboarding' | 'login' | 'register' | 'home' | 'library' | 'installed' | 'redeem' | 'system' | 'specs' | 'profile' | 'settings';
  setActiveTab: React.Dispatch<React.SetStateAction<'onboarding' | 'login' | 'register' | 'home' | 'library' | 'installed' | 'redeem' | 'system' | 'specs' | 'profile' | 'settings'>>;
  ownedGames: OwnedGameItem[];
  setOwnedGames: React.Dispatch<React.SetStateAction<OwnedGameItem[]>>;
  luaExistsMap: Record<string, boolean>;
  setLuaExistsMap: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  isLoadingGames: boolean;
  setIsLoadingGames: React.Dispatch<React.SetStateAction<boolean>>;
  activeMenuGameId: string | null;
  setActiveMenuGameId: React.Dispatch<React.SetStateAction<string | null>>;
  menuPosition: { x: number; y: number; transformOrigin?: string } | null;
  setMenuPosition: React.Dispatch<React.SetStateAction<{ x: number; y: number; transformOrigin?: string } | null>>;
  showProgressModal: boolean;
  setShowProgressModal: React.Dispatch<React.SetStateAction<boolean>>;
  patchProgress: { status: string; progress: number; message: string } | null;
  setPatchProgress: React.Dispatch<React.SetStateAction<{ status: string; progress: number; message: string } | null>>;
  activePatchGame: OwnedGameItem | null;
  setActivePatchGame: React.Dispatch<React.SetStateAction<OwnedGameItem | null>>;
  currentDlIndex: number;
  setCurrentDlIndex: React.Dispatch<React.SetStateAction<number>>;
  systemStatus: SystemPatchStatus | null;
  setSystemStatus: React.Dispatch<React.SetStateAction<SystemPatchStatus | null>>;
  systemPatchConfig: { patch_version: string; patch_url: string } | null;
  setSystemPatchConfig: React.Dispatch<React.SetStateAction<{ patch_version: string; patch_url: string } | null>>;
  isLoadingSystemStatus: boolean;
  setIsLoadingSystemStatus: React.Dispatch<React.SetStateAction<boolean>>;
  isSystemPatching: boolean;
  setIsSystemPatching: React.Dispatch<React.SetStateAction<boolean>>;
  systemPatchStep: number;
  setSystemPatchStep: React.Dispatch<React.SetStateAction<number>>;
  systemPatchProgress: number;
  setSystemPatchProgress: React.Dispatch<React.SetStateAction<number>>;
  systemPatchMessage: string;
  setSystemPatchMessage: React.Dispatch<React.SetStateAction<string>>;
  systemPatchError: string | null;
  setSystemPatchError: React.Dispatch<React.SetStateAction<string | null>>;
  lastSystemCheckTime: string;
  setLastSystemCheckTime: React.Dispatch<React.SetStateAction<string>>;
  isStoreConnected: boolean;
  setIsStoreConnected: React.Dispatch<React.SetStateAction<boolean>>;
  isDbConnected: boolean;
  setIsDbConnected: React.Dispatch<React.SetStateAction<boolean>>;
  systemSpecs: { os: string; cpu: string; gpu: string; ram: string } | null;
  setSystemSpecs: React.Dispatch<React.SetStateAction<{ os: string; cpu: string; gpu: string; ram: string } | null>>;
  isLoadingSpecs: boolean;
  setIsLoadingSpecs: React.Dispatch<React.SetStateAction<boolean>>;
  modal: ModalState;
  setModal: React.Dispatch<React.SetStateAction<ModalState>>;
  errorMsg: string | null;
  setErrorMsg: React.Dispatch<React.SetStateAction<string | null>>;
  successMsg: string | null;
  setSuccessMsg: React.Dispatch<React.SetStateAction<string | null>>;
  slides: Array<{ url: string; game_title: string; game_id: string }>;
  setSlides: React.Dispatch<React.SetStateAction<Array<{ url: string; game_title: string; game_id: string }>>>;
  currentSlideIndex: number;
  setCurrentSlideIndex: React.Dispatch<React.SetStateAction<number>>;
  loginUsername: string;
  setLoginUsername: React.Dispatch<React.SetStateAction<string>>;
  loginPassword: string;
  setLoginPassword: React.Dispatch<React.SetStateAction<string>>;
  registerUsername: string;
  setRegisterUsername: React.Dispatch<React.SetStateAction<string>>;
  registerDisplayName: string;
  setRegisterDisplayName: React.Dispatch<React.SetStateAction<string>>;
  registerPassword: string;
  setRegisterPassword: React.Dispatch<React.SetStateAction<string>>;
  registerConfirmPassword: string;
  setRegisterConfirmPassword: React.Dispatch<React.SetStateAction<string>>;
  registerRecoveryCode: string;
  setRegisterRecoveryCode: React.Dispatch<React.SetStateAction<string>>;
  isInitializing: boolean;
  setIsInitializing: React.Dispatch<React.SetStateAction<boolean>>;
  isSyncing: boolean;
  setIsSyncing: React.Dispatch<React.SetStateAction<boolean>>;
  redeemKey: string;
  setRedeemKey: React.Dispatch<React.SetStateAction<string>>;
  isRedeeming: boolean;
  setIsRedeeming: React.Dispatch<React.SetStateAction<boolean>>;
  verifiedGame: any | null;
  setVerifiedGame: React.Dispatch<React.SetStateAction<any | null>>;
  showVerifiedUI: boolean;
  setShowVerifiedUI: React.Dispatch<React.SetStateAction<boolean>>;
  imageLoaded: boolean;
  setImageLoaded: React.Dispatch<React.SetStateAction<boolean>>;
  isCanceling: boolean;
  setIsCanceling: React.Dispatch<React.SetStateAction<boolean>>;

  // Software Update States & Handlers
  updateInfo: {
    hasUpdate: boolean;
    latestVersion?: string;
    downloadUrl?: string;
    changelog?: string;
    checkedAt?: string;
  } | null;
  setUpdateInfo: React.Dispatch<React.SetStateAction<{
    hasUpdate: boolean;
    latestVersion?: string;
    downloadUrl?: string;
    changelog?: string;
    checkedAt?: string;
  } | null>>;
  isUpdatingApp: boolean;
  setIsUpdatingApp: React.Dispatch<React.SetStateAction<boolean>>;
  updateProgressPct: number;
  setUpdateProgressPct: React.Dispatch<React.SetStateAction<number>>;
  updateStatusMsg: string;
  setUpdateStatusMsg: React.Dispatch<React.SetStateAction<string>>;
  updateError: string | null;
  setUpdateError: React.Dispatch<React.SetStateAction<string | null>>;
  handleDownloadAppUpdate: (url?: string) => Promise<void>;
  showMandatoryUpdateModal: (version: string, changelog: string, downloadUrl: string) => void;
  checkAppUpdateGlobal: (opts?: { manual?: boolean; forceModal?: boolean }) => Promise<any>;


  // Handlers
  closeModalWithTransition: (callback?: () => void) => void;
  showToast: (titleOrMessage: string, descriptionOrType?: string, typeOrUndefined?: string) => void;
  showAlert: (title: string, message: string, gameId?: string, imageUrl?: string) => Promise<void>;
  showConfirm: (title: string, message: string, confirmLabel?: string, cancelLabel?: string, gameId?: string, imageUrl?: string) => Promise<boolean>;
  showPatchChoice: (title: string, message: string, gameId?: string, imageUrl?: string) => Promise<'confirm' | 'secondary' | 'cancel'>;
  showPatchNotes: (version: string, changelog: string, onUpdate?: () => void) => void;
  handleLogout: () => void;
  syncProfile: (username: string) => Promise<any>;
  fetchOwnedGames: (username: string, silent?: boolean) => Promise<void>;
  handleRedeem: (game: OwnedGameItem, playBtnText: string) => Promise<void>;
  handleCancelPatch: () => Promise<void>;
  handlePatchClick: (game: OwnedGameItem) => Promise<void>;
  handleRedeemOrderKey: (e: React.FormEvent) => Promise<void>;
  handleConfirmRedeem: () => Promise<void>;
  handleCancelRedeem: () => void;
  checkRevocations: () => Promise<void>;
  handleCheckUpdate: (game: OwnedGameItem) => Promise<void>;
  handleRemoveFromSteam: (game: OwnedGameItem) => Promise<void>;
  handleClearGameCache: (game: OwnedGameItem) => Promise<void>;
  handleSyncManifests: (game: OwnedGameItem, silent?: boolean, onProgress?: (percent: number) => void) => Promise<{ success: boolean; count: number }>;
  handleOpenDepotcacheFolder: () => Promise<void>;
  fetchSystemStatusAndConfig: (silent?: boolean) => Promise<void>;
  fetchSystemSpecs: () => Promise<void>;
  handleStartSystemPatch: () => Promise<void>;
  handleUninstallSystemPatch: () => Promise<void>;
  handleLoginSubmit: (e: React.FormEvent) => Promise<void>;
  handleRegisterSubmit: (e: React.FormEvent) => Promise<void>;

  // Option 1 & 2: Favorites
  favorites: string[];
  toggleFavorite: (gameId: string) => void;
  redeemingOrderId: string | null;
  redeemProgressMap: Record<string, number>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Authentication & Layout States
  const [user, setUser] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<'onboarding' | 'login' | 'register' | 'home' | 'library' | 'installed' | 'redeem' | 'system' | 'specs' | 'profile' | 'settings'>('onboarding');
  const [isInitializing, setIsInitializing] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // Form Inputs
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerUsername, setRegisterUsername] = useState('');
  const [registerDisplayName, setRegisterDisplayName] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('');
  const [registerRecoveryCode, setRegisterRecoveryCode] = useState('');

  // Login Slideshow States
  const [slides, setSlides] = useState<Array<{ url: string; game_title: string; game_id: string }>>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  // Feedback Messages
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Content Data
  const [ownedGames, setOwnedGames] = useState<OwnedGameItem[]>([]);
  const [luaExistsMap, setLuaExistsMap] = useState<Record<string, boolean>>({});
  const [isLoadingGames, setIsLoadingGames] = useState(false);
  const [activeMenuGameId, setActiveMenuGameId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number; transformOrigin?: string } | null>(null);
  const [redeemingOrderId, setRedeemingOrderId] = useState<string | null>(null);
  const [redeemProgressMap, setRedeemProgressMap] = useState<Record<string, number>>({});

  // Patch progress modal states
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [patchProgress, setPatchProgress] = useState<{ status: string; progress: number; message: string } | null>(null);
  const [activePatchGame, setActivePatchGame] = useState<OwnedGameItem | null>(null);
  const [currentDlIndex, setCurrentDlIndex] = useState(0);

  // System One-Click Patch States
  const [systemStatus, setSystemStatus] = useState<SystemPatchStatus | null>(null);
  const [systemPatchConfig, setSystemPatchConfig] = useState<{ patch_version: string; patch_url: string } | null>(null);
  const [isLoadingSystemStatus, setIsLoadingSystemStatus] = useState(false);
  const [isSystemPatching, setIsSystemPatching] = useState(false);
  const [systemPatchStep, setSystemPatchStep] = useState<number>(0);
  const [systemPatchProgress, setSystemPatchProgress] = useState<number>(0);
  const [systemPatchMessage, setSystemPatchMessage] = useState<string>('');
  const [systemPatchError, setSystemPatchError] = useState<string | null>(null);
  const [lastSystemCheckTime, setLastSystemCheckTime] = useState<string>('');
  const [isStoreConnected, setIsStoreConnected] = useState<boolean>(true);
  const [isDbConnected, setIsDbConnected] = useState<boolean>(true);

  // System Specs States
  const [systemSpecs, setSystemSpecs] = useState<{ os: string; cpu: string; gpu: string; ram: string } | null>(() => {
    const cached = localStorage.getItem('systemSpecs');
    return cached ? JSON.parse(cached) : null;
  });
  const [isLoadingSpecs, setIsLoadingSpecs] = useState(false);

  // Redeem Tab States
  const [redeemKey, setRedeemKey] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [verifiedGame, setVerifiedGame] = useState<any | null>(null);
  const [showVerifiedUI, setShowVerifiedUI] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);

  // Software Update State
  const [updateInfo, setUpdateInfo] = useState<{
    hasUpdate: boolean;
    latestVersion?: string;
    downloadUrl?: string;
    changelog?: string;
    checkedAt?: string;
  } | null>(null);

  const [isUpdatingApp, setIsUpdatingApp] = useState(false);
  const [updateProgressPct, setUpdateProgressPct] = useState(0);
  const [updateStatusMsg, setUpdateStatusMsg] = useState('');
  const [updateError, setUpdateError] = useState<string | null>(null);


  // Modal State
  const [modal, setModal] = useState<ModalState>({
    isOpen: false,
    isClosing: false,
    title: '',
    message: '',
    type: 'alert'
  });

  // Option 1 & 2: Favorites State & Handlers
  const [favorites, setFavorites] = useState<string[]>(() => {
    const cached = localStorage.getItem('favorites');
    return cached ? JSON.parse(cached) : [];
  });

  const toggleFavorite = (gameId: string) => {
    const isCurrentlyFav = favorites.includes(gameId);
    setFavorites(prev => {
      const next = prev.includes(gameId) ? prev.filter(id => id !== gameId) : [...prev, gameId];
      localStorage.setItem('favorites', JSON.stringify(next));
      return next;
    });

    (window as any).showToast(
      isCurrentlyFav ? 'เลิกปักหมุดเกม' : 'ปักหมุดเป็นเกมโปรด',
      isCurrentlyFav ? 'นำเกมออกจากรายการโปรดแล้ว' : 'เพิ่มเกมเข้าสู่รายการโปรดแล้ว',
      'success'
    );
  };



  // Global showToast definition (bind to window)
  useEffect(() => {
    (window as any).showToast = (titleOrMessage: string, descriptionOrType?: string, typeOrUndefined?: string) => {
      let title = '';
      let description = '';
      let type = 'success';

      const argsLength = [titleOrMessage, descriptionOrType, typeOrUndefined].filter(x => x !== undefined).length;

      if (argsLength === 1) {
        title = titleOrMessage;
        type = 'success';
      } else if (argsLength === 2) {
        const knownTypes = ['success', 'error', 'danger', 'warning', 'info'];
        if (knownTypes.includes(String(descriptionOrType).toLowerCase())) {
          title = titleOrMessage;
          type = descriptionOrType!;
        } else {
          title = titleOrMessage;
          description = descriptionOrType!;
          type = 'success';
        }
      } else if (argsLength >= 3) {
        title = titleOrMessage;
        description = descriptionOrType!;
        type = typeOrUndefined || 'success';
      }

      type = type.toLowerCase();
      if (type === 'danger') type = 'error';

      if (!title && description) {
        title = description;
        description = '';
      }

      if (!title) {
        if (type === 'success') title = 'สำเร็จ';
        else if (type === 'error') title = 'ข้อผิดพลาด';
        else if (type === 'warning') title = 'แจ้งเตือน';
        else if (type === 'info') title = 'ข้อมูล';
      }

      let container = document.getElementById('global-toast-container');
      if (!container) {
        container = document.createElement('div');
        container.id = 'global-toast-container';
        document.body.appendChild(container);
      }

      const toast = document.createElement('div');
      toast.className = `shadcn-toast ${type}`;

      let iconSVG = '';
      if (type === 'success') {
        iconSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
      } else if (type === 'error') {
        iconSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
      } else if (type === 'warning') {
        iconSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;
      } else {
        iconSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
      }

      toast.innerHTML = `
        <div class="shadcn-toast-icon-wrapper">
          ${iconSVG}
        </div>
        <div class="shadcn-toast-content">
          <div class="shadcn-toast-title">${title}</div>
          ${description ? `<div class="shadcn-toast-description">${description}</div>` : ''}
        </div>
        <button type="button" class="shadcn-toast-close" aria-label="Close">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      `;

      const closeBtn = toast.querySelector('.shadcn-toast-close');
      const removeToast = () => {
        if (toast.classList.contains('removing')) return;
        toast.classList.add('removing');

        const slideOut = toast.animate([
          { opacity: 1, transform: 'translateX(0) scale(1)' },
          { opacity: 0, transform: 'translateX(-120%) scale(0.95)' }
        ], {
          duration: 180,
          easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
          fill: 'forwards'
        });

        slideOut.onfinish = () => {
          const siblings = Array.from(container!.querySelectorAll('.shadcn-toast:not(.removing)')) as HTMLElement[];
          const firstTops = siblings.map(t => t.getBoundingClientRect().top);

          toast.remove();
          if (container!.children.length === 0) {
            container!.remove();
            return;
          }

          const lastTops = siblings.map(t => t.getBoundingClientRect().top);

          siblings.forEach((t, i) => {
            const deltaY = firstTops[i] - lastTops[i];
            if (Math.abs(deltaY) > 0.5) {
              t.style.transition = 'none';
              t.style.transform = `translateY(${deltaY}px)`;
            }
          });

          // force browser reflow
          (container as HTMLElement).offsetHeight;

          requestAnimationFrame(() => {
            siblings.forEach(t => {
              t.style.transition = 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
              t.style.transform = 'translateY(0)';
            });
          });
        };
      };

      if (closeBtn) {
        closeBtn.addEventListener('click', removeToast);
      }

      container.appendChild(toast);

      requestAnimationFrame(() => {
        toast.classList.add('active');
      });

      setTimeout(removeToast, 4000);
    };
  }, []);

  const modalCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const closeModalWithTransition = (callback?: () => void) => {
    if (modalCloseTimerRef.current) {
      clearTimeout(modalCloseTimerRef.current);
      modalCloseTimerRef.current = null;
    }
    setModal(prev => ({ ...prev, isClosing: true }));
    modalCloseTimerRef.current = setTimeout(() => {
      setModal(prev => ({ ...prev, isOpen: false, isClosing: false }));
      modalCloseTimerRef.current = null;
      if (callback) callback();
    }, 200);
  };

  const showAlert = (title: string, message: string, gameId?: string, imageUrl?: string): Promise<void> => {
    if (modalCloseTimerRef.current) {
      clearTimeout(modalCloseTimerRef.current);
      modalCloseTimerRef.current = null;
    }
    return new Promise((resolve) => {
      setModal({
        isOpen: true,
        isClosing: false,
        title,
        message,
        type: 'alert',
        gameId,
        imageUrl,
        onConfirm: () => {
          resolve();
        }
      });
    });
  };

  const showConfirm = (title: string, message: string, confirmLabel?: string, cancelLabel?: string, gameId?: string, imageUrl?: string): Promise<boolean> => {
    if (modalCloseTimerRef.current) {
      clearTimeout(modalCloseTimerRef.current);
      modalCloseTimerRef.current = null;
    }
    return new Promise((resolve) => {
      setModal({
        isOpen: true,
        isClosing: false,
        title,
        message,
        type: 'confirm',
        confirmLabel,
        cancelLabel,
        gameId,
        imageUrl,
        onConfirm: () => {
          resolve(true);
        },
        onCancel: () => {
          resolve(false);
        }
      });
    });
  };

  const showPatchChoice = (title: string, message: string, gameId?: string, imageUrl?: string): Promise<'confirm' | 'secondary' | 'cancel'> => {
    if (modalCloseTimerRef.current) {
      clearTimeout(modalCloseTimerRef.current);
      modalCloseTimerRef.current = null;
    }
    return new Promise((resolve) => {
      setModal({
        isOpen: true,
        isClosing: false,
        title,
        message,
        type: 'patch_choice',
        gameId,
        imageUrl,
        onConfirm: () => {
          resolve('confirm');
        },
        onSecondary: () => {
          resolve('secondary');
        },
        onCancel: () => {
          resolve('cancel');
        }
      });
    });
  };

  // Listen to in-app self-update progress from Rust
  useEffect(() => {
    let unlisten: (() => void) | null = null;
    if (isUpdatingApp) {
      listen<{ status: string; progress: number; message: string }>('app-update-progress', (event) => {
        const payload = event.payload;
        setUpdateProgressPct(payload.progress);
        setUpdateStatusMsg(payload.message);
        if (payload.status === 'error') {
          setUpdateError(payload.message);
          setIsUpdatingApp(false);
        }
      }).then((fn) => {
        unlisten = fn;
      });
    }

    return () => {
      if (unlisten) unlisten();
    };
  }, [isUpdatingApp]);

  const handleDownloadAppUpdate = async (url?: string) => {
    const targetUrl = url || updateInfo?.downloadUrl;
    if (!targetUrl || !targetUrl.startsWith('http')) {
      openUrl(API_BASE_URL.replace('/api', ''));
      return;
    }

    setUpdateError(null);
    setIsUpdatingApp(true);
    setUpdateProgressPct(2);
    setUpdateStatusMsg('กำลังเริ่มต้นการดาวน์โหลดและติดตั้งอัปเดต...');

    try {
      await invoke('update_app_executable', { downloadUrl: targetUrl });
    } catch (err: any) {
      console.error('Failed to update app executable:', err);
      const msg = typeof err === 'string' ? err : err?.message || 'เกิดข้อผิดพลาดในการอัปเดตโปรแกรม';
      setUpdateError(msg);
      setIsUpdatingApp(false);
      (window as any).showToast('การอัปเดตล้มเหลว', msg, 'error');
    }
  };



  const showMandatoryUpdateModal = (version: string, changelog: string, downloadUrl: string) => {
    if (modalCloseTimerRef.current) {
      clearTimeout(modalCloseTimerRef.current);
      modalCloseTimerRef.current = null;
    }
    setModal({
      isOpen: true,
      isClosing: false,
      title: `จำเป็นต้องอัปเดตเวอร์ชันใหม่ v${version}`,
      message: changelog || 'พบเวอร์ชันใหม่ กรุณาอัปเดตเพื่อการทำงานที่สมบูรณ์ของโปรแกรม',
      type: 'mandatory_update',
      versionBadge: version,
      downloadUrl,
      isMandatory: true,
      confirmLabel: 'อัปเดตทันที',
      cancelLabel: 'ปิดโปรแกรม',
      onConfirm: () => {
        handleDownloadAppUpdate(downloadUrl);
      },
      onCancel: () => {
        invoke('exit_app').catch(() => {
          invoke('hide_window');
        });
      }
    });
  };

  const checkAppUpdateGlobal = async (opts?: { manual?: boolean; forceModal?: boolean }) => {
    try {
      const res = await fetch(`${API_BASE_URL}/digimanager_settings.php`);
      const data = await res.json();
      if (data.success && data.data) {
        setIsStoreConnected(true);
        const serverVer = data.data.app_version || '0.1.0';
        const isNewer = compareVersions(serverVer, APP_VERSION) > 0;
        const nowTime = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
        
        const info = {
          hasUpdate: isNewer,
          latestVersion: serverVer,
          downloadUrl: data.data.app_url || '',
          changelog: data.data.app_changelog || 'ปรับปรุงประสิทธิภาพและความเสถียรของระบบ',
          checkedAt: nowTime
        };
        setUpdateInfo(info);

        if (isNewer && opts?.forceModal) {
          showMandatoryUpdateModal(serverVer, info.changelog, info.downloadUrl);
        } else if (opts?.manual) {
          if (isNewer) {
            (window as any).showToast('พบเวอร์ชันใหม่!', `พบ DigiManager v${serverVer} พร้อมให้อัปเดต`, 'success');
          } else {
            (window as any).showToast('เวอร์ชันล่าสุดแล้ว', `DigiManager v${APP_VERSION} เป็นเวอร์ชันล่าสุดแล้ว`, 'success');
          }
        }

        return info;
      } else {
        setIsStoreConnected(false);
      }
    } catch (err) {
      console.error('Failed to check app update:', err);
      setIsStoreConnected(false);
      if (opts?.manual) {
        (window as any).showToast('ข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์เพื่อเช็คอัปเดตได้', 'error');
      }
    }
    return null;
  };

  const showPatchNotes = (version: string, changelog: string, onUpdate?: () => void) => {
    if (modalCloseTimerRef.current) {
      clearTimeout(modalCloseTimerRef.current);
      modalCloseTimerRef.current = null;
    }
    setModal({
      isOpen: true,
      isClosing: false,
      title: 'บันทึกการอัปเดต (Patch Notes)',
      message: changelog || '• ปรับปรุงประสิทธิภาพและความเสถียรของระบบ\n• อัปเกรดระบบดาวน์โหลดและติดตั้งอัปเดตอัตโนมัติ\n• ปรับแต่งดีไซน์และการแสดงผลให้ลื่นไหล สวยงามระดับพรีเมียม',
      type: 'patch_notes',
      versionBadge: version || APP_VERSION,
      confirmLabel: onUpdate ? 'อัปเดตทันที' : undefined,
      cancelLabel: undefined,
      onConfirm: onUpdate ? () => {
        if (onUpdate) onUpdate();
      } : undefined,
      onCancel: () => {}
    });
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
    setActiveTab('login');
    setErrorMsg(null);
    setSuccessMsg(null);
    setOwnedGames([]);
    hasInitializedRef.current = false;
  };

  const syncProfile = async (username: string) => {
    setIsSyncing(true);
    try {
      const response = await fetch(`${API_BASE_URL}/get_profile.php?username=${encodeURIComponent(username)}`);
      const data = await response.json();
      if (data.success && data.user) {
        setIsStoreConnected(true);
        setUser(data.user);
        localStorage.setItem('user', JSON.stringify(data.user));
        return data.user;
      } else {
        handleLogout();
      }
    } catch (err) {
      console.error('Failed to sync profile with database:', err);
      setIsStoreConnected(false);
    } finally {
      setIsSyncing(false);
    }
    return null;
  };

  // Lock to ensure only one silent sync queue runs at a time
  const isSilentSyncQueueRunningRef = useRef(false);

  const silentSyncRedeemedGames = async (games: OwnedGameItem[], username: string, currentMap: Record<string, boolean>) => {
    try {
      const activeSteamUser = await invoke<string>('get_steam_user');
      if (!activeSteamUser || activeSteamUser === 'Unknown') return;

      // Filter games redeemed by this Steam user and installed on this machine
      const redeemedGames = games.filter(
        (g) => g.redeemed_by && g.redeemed_by.toLowerCase() === activeSteamUser.toLowerCase() && !!currentMap[g.game_id]
      );

      if (redeemedGames.length === 0) return;

      // Check which games need an update by comparing lightweight hash fingerprints
      const queue: Array<{
        game: OwnedGameItem;
        needLua: boolean;
        needManifest: boolean;
      }> = [];

      for (const game of redeemedGames) {
        let needLua = false;

        // 1. Lua hash check: Only queue if there is an existing hash that CHANGED
        // If cachedLuaHash is null/empty on first run, seed it so we do not flood the network
        if (game.lua_hash) {
          const cachedLuaHash = localStorage.getItem(`lua_hash_${game.order_id}`);
          if (!cachedLuaHash) {
            localStorage.setItem(`lua_hash_${game.order_id}`, game.lua_hash);
          } else if (cachedLuaHash !== game.lua_hash) {
            needLua = true;
          }
        }

        // 2. Manifest hash: Seed hash in localStorage to keep it tracked without heavy background downloading
        if (game.has_manifests && game.manifest_hash) {
          const cachedManifestHash = localStorage.getItem(`manifest_hash_${game.game_id}`);
          if (!cachedManifestHash) {
            localStorage.setItem(`manifest_hash_${game.game_id}`, game.manifest_hash);
          }
        }

        if (needLua) {
          queue.push({ game, needLua: true, needManifest: false });
        }
      }

      // If no lua scripts changed, ZERO network requests and ZERO background load!
      if (queue.length === 0) return;

      // Prevent concurrent queue workers
      if (isSilentSyncQueueRunningRef.current) return;
      isSilentSyncQueueRunningRef.current = true;

      // Process queue sequentially (FIFO: one game at a time)
      for (const item of queue) {
        const game = item.game;

        try {
          setRedeemingOrderId(game.order_id);
          setRedeemProgressMap(prev => ({ ...prev, [game.order_id]: 15 }));

          // Update Lua script if modified on server
          const res = await fetch(
            `${API_BASE_URL}/redeem.php?action=get_lua&key=${encodeURIComponent(game.order_id)}&steamid=${encodeURIComponent(activeSteamUser)}&username=${encodeURIComponent(username)}`,
            { headers: { 'ngrok-skip-browser-warning': 'true' } }
          );
          if (res.ok) {
            const serverLua = await res.text();
            if (!serverLua.startsWith('-- ERROR:')) {
              const writeSuccess = await invoke<boolean>('write_lua_file', {
                gameId: game.game_id,
                content: serverLua
              });
              if (writeSuccess) {
                setLuaExistsMap(prev => ({ ...prev, [game.game_id]: true }));
                if (game.lua_hash) {
                  localStorage.setItem(`lua_hash_${game.order_id}`, game.lua_hash);
                }
              }
            }
          }

          // Step C: Complete progress and transition button back to normal
          setRedeemProgressMap(prev => ({ ...prev, [game.order_id]: 100 }));
          await new Promise(r => setTimeout(r, 400));
        } catch (gameErr) {
          console.error(`Silent update queue error for ${game.title}:`, gameErr);
        } finally {
          setRedeemProgressMap(prev => {
            const next = { ...prev };
            delete next[game.order_id];
            return next;
          });
          setRedeemingOrderId(null);
        }
      }
    } catch (err) {
      console.error('Silent script sync error:', err);
    } finally {
      isSilentSyncQueueRunningRef.current = false;
    }
  };

  const fetchOwnedGames = async (username: string, silent = false) => {
    if (!silent) setIsLoadingGames(true);
    try {
      const response = await fetch(`${API_BASE_URL}/user-library.php?username=${encodeURIComponent(username)}`);
      const data = await response.json();
      if (data.success) {
        const gameIds = data.games.map((g: any) => g.game_id);
        let map: Record<string, boolean> = {};
        try {
          map = await invoke<Record<string, boolean>>('check_lua_files', { gameIds });
        } catch (err) {
          console.error('Failed to batch check lua files:', err);
          data.games.forEach((game: any) => {
            map[game.game_id] = false;
          });
        }

        localStorage.setItem(`ownedGames_${username}`, JSON.stringify(data.games));
        localStorage.setItem(`luaExistsMap_${username}`, JSON.stringify(map));

        setLuaExistsMap(map);
        setOwnedGames(data.games);

        // Run ultra-lightweight background silent auto-update for missing or stale scripts
        silentSyncRedeemedGames(data.games, username, map);
        setIsStoreConnected(true);
      } else {
        setIsStoreConnected(false);
      }
    } catch (err) {
      console.error('Error fetching owned games:', err);
      setIsStoreConnected(false);
    } finally {
      setIsLoadingGames(false);
    }
  };

  const handleRedeem = async (game: OwnedGameItem, playBtnText: string) => {
    if (playBtnText === 'เริ่มเล่นเกม') {
      try {
        await openUrl(`steam://run/${game.game_id}`);
      } catch (err) {
        console.error('Failed to open game via Steam:', err);
        await showAlert('เกิดข้อผิดพลาด', 'เกิดข้อผิดพลาดในการเปิดเกมผ่าน Steam', game.game_id);
      }
      return;
    }

    // Check if system is installed
    if (!systemStatus || !systemStatus.is_installed) {
      const goToSystem = await showConfirm(
        'ยังไม่ได้ติดตั้งระบบ',
        'คุณยังไม่ได้ติดตั้งระบบของ DigiManager\nกรุณาไปติดตั้งระบบก่อนเริ่มทำการรีดีมเกมลง Steam',
        'ไปติดตั้งระบบ',
        'ยกเลิก',
        game.game_id,
        game.hero_image
      );
      if (goToSystem) {
        setActiveTab('system');
      }
      return;
    }

    // Check if system has a pending update
    const hasSystemUpdate = !!(
      systemStatus.installed_version &&
      systemPatchConfig?.patch_version &&
      systemStatus.installed_version !== systemPatchConfig.patch_version
    );

    if (hasSystemUpdate) {
      const goToSystem = await showConfirm(
        'ระบบต้องการการอัปเดต',
        `ระบบของ DigiManager มีเวอร์ชันใหม่ (v${systemPatchConfig?.patch_version})\nกรุณาไปอัปเดตระบบก่อนเริ่มทำการรีดีมเกมลง Steam`,
        'ไปอัปเดตระบบ',
        'ยกเลิก',
        game.game_id,
        game.hero_image
      );
      if (goToSystem) {
        setActiveTab('system');
      }
      return;
    }

    setRedeemingOrderId(game.order_id);
    setIsLoadingGames(true);
    try {
      const activeSteamUser = await invoke<string>('get_steam_user');
      if (!activeSteamUser || activeSteamUser === 'Unknown') {
        setIsLoadingGames(false);
        setRedeemingOrderId(null);
        await showAlert('ระบบความต้องการ', 'กรุณาเข้าสู่ระบบ Steam บนเครื่องนี้ก่อนทำการรีดีม');
        return;
      }
      // Check if another order of the same game was already redeemed by this Steam user
      const alreadyRedeemedOnThisSteamAccount = ownedGames.some(g => 
        g.game_id === game.game_id && 
        g.order_id !== game.order_id && 
        g.redeemed_by && 
        g.redeemed_by.toLowerCase() === activeSteamUser.toLowerCase()
      );

      if (alreadyRedeemedOnThisSteamAccount) {
        setIsLoadingGames(false);
        setRedeemingOrderId(null);
        await showAlert('บัญชีถูกเปิดใช้งานแล้ว', `บัญชี Steam ปัจจุบัน [${activeSteamUser}] ได้เปิดใช้งานเกม [${game.title}] ไปแล้วในออเดอร์อื่น ไม่สามารถนำคีย์อื่นมารีดีมซ้ำซ้อนในบัญชีเดียวกันได้`, game.game_id);
        return;
      }
      if (game.redeemed_by) {
        if (game.redeemed_by.toLowerCase() !== activeSteamUser.toLowerCase()) {
          setIsLoadingGames(false);
          setRedeemingOrderId(null);
          await showAlert('บัญชีไม่ถูกต้อง', `คีย์นี้ถูกเปิดใช้งานโดยบัญชี Steam [${maskId(game.redeemed_by)}] ไปแล้ว ไม่สามารถนำมารีดีมซ้ำกับบัญชีปัจจุบัน [${activeSteamUser}] ได้`, game.game_id);
          return;
        }
        setIsLoadingGames(false);
        setRedeemingOrderId(null);
        const confirm = await showConfirm(
          'คีย์นี้ถูกเปิดใช้งานแล้ว',
          `คุณเคยรีดีมเกม [${game.title}] ด้วยบัญชีนี้แล้ว\n\nต้องการทำรายการต่อเลยหรือไม่?`,
          undefined,
          undefined,
          game.game_id,
          game.hero_image
        );
        if (!confirm) return;
      } else {
        setIsLoadingGames(false);
        setRedeemingOrderId(null);
        const confirm = await showConfirm(
          'ยืนยันการรีดีม',
          `คุณต้องการรีดีมเกม [${game.title}] (${formatEditionName(game.edition)}) หรือไม่?\nการดำเนินการนี้จะผูกคีย์ออเดอร์นี้กับบัญชี [${activeSteamUser}] บน Steam ของคุณ\nและไม่สามารถเปลี่ยนได้ในภายหลัง\n\nต้องการดำเนินการเลยหรือไม่?`,
          undefined,
          undefined,
          game.game_id,
          game.hero_image
        );
        if (!confirm) return;
      }

      setRedeemingOrderId(game.order_id);
      setIsLoadingGames(true);
      const response = await fetch(`${API_BASE_URL}/redeem.php?action=redeem&key=${encodeURIComponent(game.order_id)}&steamid=${encodeURIComponent(activeSteamUser)}&username=${encodeURIComponent(user?.username || '')}`);
      const data = await response.json();

      if (data.success) {
        let manifestSyncOk = true;
        // STEP 1: Sync Manifests FIRST (if game has manifests)
        if (game.has_manifests) {
          setRedeemProgressMap(prev => ({ ...prev, [game.order_id]: 15 }));
          const syncRes = await handleSyncManifests(game, true, (pct) => {
            // Scale manifest progress from 15% to 80%
            const scaledPct = Math.min(85, Math.max(15, Math.round(15 + (pct * 0.7))));
            setRedeemProgressMap(prev => ({ ...prev, [game.order_id]: scaledPct }));
          });
          if (!syncRes.success || syncRes.count === 0) {
            manifestSyncOk = false;
          }
        }

        // STEP 2: Write Lua file at the very end so Steam only detects the game after manifests are in place
        setRedeemProgressMap(prev => ({ ...prev, [game.order_id]: 90 }));
        const writeSuccess = await invoke<boolean>('write_lua_file', {
          gameId: game.game_id,
          content: data.lua_config
        });

        if (writeSuccess) {
          // Optimistically update frontend state immediately
          setOwnedGames(prev => prev.map(g => {
            if (g.order_id === game.order_id) {
              return {
                ...g,
                redeemed_by: activeSteamUser,
                redeemed_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
                status: 'delivered'
              };
            }
            return g;
          }));
          setLuaExistsMap(prev => ({
            ...prev,
            [game.game_id]: true
          }));

          setRedeemProgressMap(prev => ({ ...prev, [game.order_id]: 100 }));
          await new Promise(r => setTimeout(r, 400));
          setRedeemProgressMap(prev => { const n = { ...prev }; delete n[game.order_id]; return n; });

          setIsLoadingGames(false);
          setRedeemingOrderId(null);

          if (game.lua_hash) {
            localStorage.setItem(`lua_hash_${game.order_id}`, game.lua_hash);
          }
          if (game.manifest_hash && manifestSyncOk) {
            localStorage.setItem(`manifest_hash_${game.game_id}`, game.manifest_hash);
          }

          if (manifestSyncOk) {
            await showAlert(
              `รีดีม ${game.title} สำเร็จ!`,
              'คุณสามารถดาวน์โหลดเกมผ่าน Steam ได้ทันที แต่หากพบปัญหา ให้รีสตาร์ท Steam แล้วลองใหม่อีกครั้ง',
              game.game_id,
              game.hero_image
            );
          } else {
            await showAlert(
              `รีดีม ${game.title} สำเร็จ (แต่ดาวน์โหลด Manifest ล้มเหลว)`,
              'เขียนไฟล์สิทธิ์เกมสำเร็จแล้ว แต่การดาวน์โหลดไฟล์ Depot Manifest ไม่สำเร็จ กรุณาคลิกขวาที่การ์ดเกมแล้วเลือก "ล้างแคชและรีเซ็ตเกม" เพื่อลองใหม่อีกครั้ง',
              game.game_id,
              game.hero_image
            );
          }
        } else {
          setIsLoadingGames(false);
          setRedeemingOrderId(null);
          setRedeemProgressMap(prev => { const n = { ...prev }; delete n[game.order_id]; return n; });
          await showAlert('คำเตือน', `เปิดใช้งานสำเร็จบนเซิร์ฟเวอร์หลัก แต่เกิดข้อผิดพลาดในการเขียนไฟล์สิทธิ์ลงเครื่องคอมพิวเตอร์`, game.game_id);
        }

        if (user) {
          fetchOwnedGames(user.username, true);
        }
      } else {
        setIsLoadingGames(false);
        setRedeemingOrderId(null);
        setRedeemProgressMap(prev => { const n = { ...prev }; delete n[game.order_id]; return n; });
        await showAlert('ข้อผิดพลาด', data.message || 'เกิดข้อผิดพลาดในการเปิดใช้งาน CD-Key', game.game_id);
      }
    } catch (err) {
      console.error(err);
      setIsLoadingGames(false);
      setRedeemingOrderId(null);
      setRedeemProgressMap(prev => { const n = { ...prev }; delete n[game.order_id]; return n; });
      await showAlert('ข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อฐานข้อมูลหลักได้ กรุณาตรวจสอบการรัน XAMPP', game.game_id);
    } finally {
      setIsLoadingGames(false);
      setRedeemingOrderId(null);
      setRedeemProgressMap(prev => { const n = { ...prev }; delete n[game.order_id]; return n; });
    }
  };

  const handleCancelPatch = async () => {
    try {
      await invoke('cancel_patch');
    } catch (err) {
      console.error('Failed to cancel patch:', err);
    }
  };

  const handlePatchClick = async (game: OwnedGameItem) => {
    if (!game.patch_download_url && (!game.patch_extra_files || game.patch_extra_files.length === 0)) {
      await showAlert('ข้อผิดพลาด', 'ไม่พบลิงก์ดาวน์โหลด Patch หรือไฟล์เพิ่มเติมสำหรับเกมนี้', game.game_id);
      return;
    }

    const gameFolder = game.patch_game_folder || '';
    if (!gameFolder) {
      await showAlert('ข้อผิดพลาด', 'ไม่พบชื่อโฟลเดอร์เกม (Game Folder Name) ในประวัติข้อมูล สำหรับทำการติดตั้ง Patch', game.game_id);
      return;
    }

    if (game.patch_exe_only) {
      const choice = await showPatchChoice(
        'Patch + .exe only',
        `เกมนี้ต้องมีการลง Patch ก่อนถึงจะเข้าเล่นได้ และจะไม่สามารถกด Play ตรงๆ ที่ Steam ได้ คุณต้องการติดตั้ง Patch และให้เราสร้าง Shortcut ที่ Desktop ด้วยเลยไหม?\n\n(ระบบจะทำการดาวน์โหลด แตกไฟล์ และย้ายไฟล์ไปยังโฟลเดอร์เกมโดยอัตโนมัติ)`,
        game.game_id
      );

      if (choice === 'confirm' || choice === 'secondary') {
        const createShortcut = choice === 'confirm';
        setActivePatchGame(game);
        setCurrentDlIndex(0);
        setPatchProgress({ status: 'preparing', progress: 0, message: 'กำลังเตรียมไฟล์...' });
        setShowProgressModal(true);

        let unlisten: (() => void) | null = null;
        try {
          unlisten = await listen<{ status: string; progress: number; message: string }>('patch-progress', (event) => {
            const payload = event.payload;
            if (payload.status === 'extra_downloading') {
              setCurrentDlIndex(payload.progress);
            }
            setPatchProgress(payload);
          });

          const exeFilename = game.patch_exe_filename || `${game.game_id}.exe`;
          await invoke<string>('install_patch', {
            gameId: game.game_id,
            downloadUrl: game.patch_download_url || '',
            gameFolder: gameFolder,
            exeFilename: exeFilename,
            title: game.title,
            createShortcut: createShortcut,
            extraFiles: game.patch_extra_files || [],
            profileSyncEnabled: game.profile_sync_enabled ?? false,
            profileSyncFile: game.profile_sync_file ?? '',
            profileSyncKey: game.profile_sync_key ?? ''
          });

          setShowProgressModal(false);
          setActivePatchGame(null);
          setPatchProgress(null);
          
          if (createShortcut) {
            const shortcutName = `${game.title.replace(/[^a-zA-Z0-9 ]/g, '')}.lnk`;
            await showAlert(
              'สำเร็จ', 
              `ดำเนินการติดตั้งเสร็จสิ้น คุณสามารถกลับไปที่ Desktop และเริ่มเกม ${game.title} ผ่าน "${shortcutName}" ได้ทันที`,
              game.game_id
            );
          } else {
            await showAlert(
              'สำเร็จ', 
              `ดำเนินการติดตั้งเสร็จสิ้น คุณสามารถเข้าเล่นเกม ${game.title} ได้ทันที`,
              game.game_id
            );
          }
        } catch (err) {
          console.error('Failed to install patch:', err);
          setShowProgressModal(false);
          setActivePatchGame(null);
          setPatchProgress(null);
          await showAlert('การติดตั้งไม่สำเร็จ', String(err), game.game_id);
        } finally {
          if (unlisten) unlisten();
        }
      }
    } else {
      const confirm = await showConfirm(
        'เฉพาะ Patch',
        `เกมนี้ต้องมีการลง Patch ก่อนถึงจะเข้าเล่นได้ แต่ไม่ต้องห่วง คุณแค่ต้องลงเฉพาะเมื่อติดตั้งเกมเสร็จเท่านั้น\n\nต้องการให้ระบบเริ่มดาวน์โหลดและติดตั้ง Patch โดยอัตโนมัติเลยใช่หรือไม่?`,
        'เอาเลย',
        'ยกเลิก',
        game.game_id,
        game.hero_image
      );

      if (confirm) {
        setActivePatchGame(game);
        setCurrentDlIndex(0);
        setPatchProgress({ status: 'preparing', progress: 0, message: 'กำลังเตรียมไฟล์...' });
        setShowProgressModal(true);

        let unlisten: (() => void) | null = null;
        try {
          unlisten = await listen<{ status: string; progress: number; message: string }>('patch-progress', (event) => {
            const payload = event.payload;
            if (payload.status === 'extra_downloading') {
              setCurrentDlIndex(payload.progress);
            }
            setPatchProgress(payload);
          });

          await invoke<string>('install_patch', {
            gameId: game.game_id,
            downloadUrl: game.patch_download_url || '',
            gameFolder: gameFolder,
            exeFilename: '',
            title: game.title,
            createShortcut: false,
            extraFiles: game.patch_extra_files || [],
            profileSyncEnabled: game.profile_sync_enabled ?? false,
            profileSyncFile: game.profile_sync_file ?? '',
            profileSyncKey: game.profile_sync_key ?? ''
          });

          setShowProgressModal(false);
          setActivePatchGame(null);
          setPatchProgress(null);
          await showAlert(
            'สำเร็จ',
            `ดำเนินการติดตั้งเสร็จสิ้น คุณสามารถเข้าเล่นเกม ${game.title} ได้ทันที`,
            game.game_id
          );
        } catch (err) {
          console.error('Failed to install patch:', err);
          setShowProgressModal(false);
          setActivePatchGame(null);
          setPatchProgress(null);
          await showAlert('การติดตั้งไม่สำเร็จ', String(err), game.game_id);
        } finally {
          if (unlisten) unlisten();
        }
      }
    }
  };

  const handleRedeemOrderKey = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanKey = redeemKey.trim();
    if (!cleanKey) {
      await showAlert('ข้อผิดพลาด', 'กรุณากรอกคีย์ออเดอร์');
      return;
    }

    if (!cleanKey.startsWith('DGB-')) {
      await showAlert('รูปแบบคีย์ไม่ถูกต้อง', 'รหัสคีย์ออเดอร์ต้องขึ้นต้นด้วย DGB- (เช่น DGB-XXXXX-XXXXX-XXXXX)');
      return;
    }

    setIsRedeeming(true);
    try {
      const checkRes = await fetch(`${API_BASE_URL}/redeem.php?action=check&key=${encodeURIComponent(cleanKey)}&username=${encodeURIComponent(user?.username || '')}`);
      if (!checkRes.ok) {
        throw new Error('ไม่พบข้อมูลคีย์ในระบบ');
      }
      const checkData = await checkRes.json();

      if (!checkData.success) {
        await showAlert('ข้อผิดพลาด', checkData.message || 'ไม่พบข้อมูลคีย์ออเดอร์นี้');
        setIsRedeeming(false);
        return;
      }

      const { is_redeemed, bound_steamid, game_name, status, edition, game_id, poster_image, has_other_owner } = checkData;

      if (status === 'revoked') {
        await showAlert('คีย์ถูกเพิกถอนสิทธิ์', 'คีย์ออเดอร์นี้ถูกยกเลิกการใช้งานแล้ว', game_id);
        setIsRedeeming(false);
        return;
      }

      if (has_other_owner) {
        await showAlert('คีย์มีเจ้าของแล้ว', 'คีย์ออเดอร์นี้ถูกผูกไว้กับบัญชีอื่นแล้ว ไม่สามารถนำมาใช้ได้', game_id);
        setIsRedeeming(false);
        return;
      }

      setImageLoaded(false);
      setVerifiedGame({
        game_id,
        game_name,
        edition,
        poster_image: poster_image || `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${game_id}/library_600x900.jpg`,
        header_image: checkData.header_image || poster_image,
        hero_image: checkData.hero_image || checkData.header_image || poster_image,
        bound_steamid,
        is_redeemed,
        status
      });
      setShowVerifiedUI(true);

    } catch (err) {
      console.error(err);
      await showAlert('ข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อฐานข้อมูลหลักได้ หรือรูปแบบคีย์ไม่ถูกต้อง กรุณาตรวจสอบการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setIsRedeeming(false);
    }
  };

  const handleConfirmRedeem = async () => {
    if (!verifiedGame) return;
    const cleanKey = redeemKey.trim();

    setIsRedeeming(true);
    try {
      const claimRes = await fetch(`${API_BASE_URL}/redeem.php?action=claim&key=${encodeURIComponent(cleanKey)}&username=${encodeURIComponent(user?.username || '')}`);
      const claimData = await claimRes.json();

      if (claimData.success) {
        const gameName = verifiedGame.game_name;
        const gameId = verifiedGame.game_id;
        const heroImg = verifiedGame.hero_image;

        setRedeemKey('');
        setVerifiedGame(null);
        setImageLoaded(false);
        setShowVerifiedUI(false);

        if (user) {
          await fetchOwnedGames(user.username, true);
          await syncProfile(user.username);
        }

        const message = claimData.already_owned
          ? `เกม [${gameName}] มีอยู่ในบัญชี DigiByte ของคุณเรียบร้อยแล้ว\nคุณสามารถไปรีดีมผ่านหน้า คลังเกม ด้วยตัวเองเพื่อเริ่มติดตั้งเกมบน Steam ของคุณ`
          : `เพิ่มเกม [${gameName}] เข้าบัญชี DigiByte ของคุณเรียบร้อยแล้ว!\nคุณจะต้องไปรีดีมผ่านหน้า คลังเกม ด้วยตัวเองเพื่อเริ่มติดตั้งเกมบน Steam ของคุณ`;

        const goToLibrary = await showConfirm(
          'รีดีมสำเร็จ',
          message,
          'ไปหน้าคลังเกม',
          'ตกลง',
          gameId,
          heroImg
        );

        if (goToLibrary) {
          setActiveTab('library');
        }
      } else {
        await showAlert('เกิดข้อผิดพลาด', claimData.message || 'ไม่สามารถเพิ่มเกมเข้าบัญชีได้', verifiedGame.game_id);
      }
    } catch (err) {
      console.error(err);
      await showAlert('ข้อผิดพลาด', 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsRedeeming(false);
    }
  };

  const handleCancelRedeem = () => {
    setIsCanceling(true);
    setImageLoaded(false);
    setShowVerifiedUI(false);
    setTimeout(() => {
      setVerifiedGame(null);
      setIsCanceling(false);
    }, 350);
  };

  const checkRevocations = async () => {
    try {
      const activeSteamUser = await invoke<string>('get_steam_user');
      if (!activeSteamUser || activeSteamUser === 'Unknown') return;

      const usernameParam = user?.username ? `&username=${encodeURIComponent(user.username)}` : '';
      const response = await fetch(`${API_BASE_URL}/redeem.php?action=check_revoked&steamid=${encodeURIComponent(activeSteamUser)}${usernameParam}`);
      const data = await response.json();

      if (data.success && data.revoked) {
        const revokedGameIds = Object.keys(data.revoked);
        const deletedGames: string[] = [];

        const ackKey = `ack_revoked_${activeSteamUser.toLowerCase()}`;
        const ackList: string[] = JSON.parse(localStorage.getItem(ackKey) || '[]');

        for (const gameId of revokedGameIds) {
          const wasDeleted = await invoke<boolean>('delete_lua_file', { gameId });
          if (wasDeleted && !ackList.includes(gameId)) {
            const gameName = data.revoked[gameId];
            deletedGames.push(gameName);
          }
        }

        if (deletedGames.length > 0) {
          setLuaExistsMap(prev => {
            const next = { ...prev };
            for (const gid of revokedGameIds) {
              next[gid] = false;
            }
            return next;
          });

          const updatedAck = Array.from(new Set([...ackList, ...revokedGameIds]));
          localStorage.setItem(ackKey, JSON.stringify(updatedAck));

          await showAlert(
            '⚠️ สิทธิ์ถูกเพิกถอน',
            `สคริปต์เกมต่อไปนี้ถูกลบออกจากเครื่องของคุณแล้ว เนื่องจากคีย์สิทธิ์ถูกยกเลิกการใช้งาน:\n\n${deletedGames.map(name => `• ${name}`).join('\n')}`
          );

          // Acknowledge directly on the server database so it persists across all computers
          try {
            await fetch(`${API_BASE_URL}/redeem.php?action=ack_revoked&steamid=${encodeURIComponent(activeSteamUser)}${usernameParam}`);
          } catch (ackErr) {
            console.warn('Failed to sync revocation ack to server:', ackErr);
          }

          if (user) {
            fetchOwnedGames(user.username);
          }
        }
      }
    } catch (err) {
      console.error('Failed to run background check for revoked keys:', err);
    }
  };

  const handleCheckUpdate = async (game: OwnedGameItem) => {
    setIsLoadingGames(true);
    try {
      const activeSteamUser = await invoke<string>('get_steam_user');
      if (!activeSteamUser || activeSteamUser === 'Unknown') {
        setIsLoadingGames(false);
        await showAlert('ระบบความต้องการ', 'กรุณาเข้าสู่ระบบ Steam บนเครื่องนี้ก่อนทำการตรวจสอบ');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/redeem.php?action=get_lua&key=${encodeURIComponent(game.order_id)}&steamid=${encodeURIComponent(activeSteamUser)}&username=${encodeURIComponent(user?.username || '')}`);
      if (!response.ok) {
        throw new Error('Failed to fetch LUA from server');
      }
      const serverLua = await response.text();

      if (serverLua.startsWith('-- ERROR:')) {
        setIsLoadingGames(false);
        await showAlert('ข้อผิดพลาด', serverLua.replace('-- ERROR:', '').trim(), game.game_id);
        return;
      }

      const localLua = await invoke<string>('read_lua_file', { gameId: game.game_id });

      const normalizeContent = (str: string) => {
        return str
          .replace(/^\uFEFF/, '')
          .replace(/\r\n/g, '\n')
          .replace(/\r/g, '\n')
          .split('\n')
          .filter(line => !line.trim().startsWith('-- Generated'))
          .map(line => line.trim().replace(/^--\s*setManifestid\(/, 'setManifestid('))
          .join('\n')
          .trim();
      };

      setIsLoadingGames(false);
      if (normalizeContent(localLua) === normalizeContent(serverLua)) {
        await showAlert('เช็คอัพเดท', `สคริปต์เกม [${game.title}] เป็นเวอร์ชันล่าสุดและตรงกับเซิร์ฟเวอร์ร้านค้าแล้ว`, game.game_id, game.hero_image);
      } else {
        const confirm = await showConfirm(
          'พบข้อมูลอัปเดตใหม่',
          `พบเวอร์ชันอัปเดตใหม่สำหรับสคริปต์เกม [${game.title}] บนเซิร์ฟเวอร์ของร้านค้า\n\nต้องการอัปเดตสคริปต์บนเครื่องของคุณให้ตรงกับเซิร์ฟเวอร์เลยหรือไม่?`,
          undefined,
          undefined,
          game.game_id,
          game.hero_image
        );
        if (confirm) {
          setIsLoadingGames(true);
          let manifestMsg = '';
          if (game.has_manifests) {
            const manifestRes = await handleSyncManifests(game, true);
            if (manifestRes && manifestRes.count > 0) {
              manifestMsg = ` และซิงค์ไฟล์ Depot Manifest (${manifestRes.count} ไฟล์)`;
            }
            if (game.manifest_hash) {
              localStorage.setItem(`manifest_hash_${game.game_id}`, game.manifest_hash);
            }
          }

          const writeSuccess = await invoke<boolean>('write_lua_file', {
            gameId: game.game_id,
            content: serverLua
          });
          setIsLoadingGames(false);
          if (writeSuccess) {
            setLuaExistsMap(prev => ({ ...prev, [game.game_id]: true }));
            if (game.lua_hash) {
              localStorage.setItem(`lua_hash_${game.order_id}`, game.lua_hash);
            }
            await showAlert('สำเร็จ', `อัปเดตสคริปต์เกม [${game.title}]${manifestMsg} เป็นเวอร์ชันล่าสุดสำเร็จแล้ว!`, game.game_id, game.hero_image);
          } else {
            await showAlert('ข้อผิดพลาด', 'ไม่สามารถเขียนไฟล์สิทธิ์เวอร์ชันใหม่ลงในระบบได้', game.game_id, game.hero_image);
          }
        }
      }
    } catch (err: any) {
      console.error(err);
      setIsLoadingGames(false);
      await showAlert('ข้อผิดพลาด', `ไม่สามารถตรวจสอบการอัปเดตได้: ${err?.message || err}`, game.game_id, game.hero_image);
    }
  };

  const handleRemoveFromSteam = async (game: OwnedGameItem) => {
    const confirm = await showConfirm(
      'ยืนยันการลบไฟล์สิทธิ์',
      `คุณแน่ใจหรือไม่ที่ต้องการลบเกม [${game.title}] ออกจากหน้าคลัง Steam ของคุณ?\n\nการดำเนินการนี้ไม่ได้ทำให้คุณเสียสิทธิ์จากร้านค้าของเรา คุณสามารถกลับมารีดีมเกมด้วยบัญชีเดิมได้ทุกเมื่อที่ต้องการ`,
      undefined,
      undefined,
      game.game_id,
      game.hero_image
    );
    if (!confirm) return;

    setIsLoadingGames(true);
    try {
      const wasDeleted = await invoke<boolean>('delete_lua_file', { gameId: game.game_id });
      setIsLoadingGames(false);
      if (wasDeleted) {
        setLuaExistsMap(prev => ({ ...prev, [game.game_id]: false }));
        localStorage.removeItem(`lua_hash_${game.order_id}`);
        localStorage.removeItem(`manifest_hash_${game.game_id}`);
        await showAlert('สำเร็จ', `ถอนสิทธิ์การเล่นเกม [${game.title}] ออกแล้ว`, game.game_id, game.hero_image);
      } else {
        await showAlert('แจ้งเตือน', `ไม่พบไฟล์สคริปต์สิทธิ์ของเกม [${game.title}] บนระบบ หรือถูกลบไปแล้ว`, game.game_id, game.hero_image);
      }
    } catch (err) {
      console.error(err);
      setIsLoadingGames(false);
      await showAlert('ข้อผิดพลาด', 'เกิดข้อผิดพลาดในการทำรายการลบไฟล์สิทธิ์', game.game_id, game.hero_image);
    }
  };

  const handleClearGameCache = async (game: OwnedGameItem) => {
    setRedeemingOrderId(game.order_id);
    setRedeemProgressMap(prev => ({ ...prev, [game.order_id]: 10 }));
    setIsLoadingGames(true);
    try {
      // Fetch extra known depots and manifest presence from server
      let extraDepotIds: string[] = [];
      let hasManifestsOnServer = false;
      try {
        const manifestRes = await fetch(`${API_BASE_URL}/manifests.php?action=list&game_id=${encodeURIComponent(game.game_id)}`, {
          headers: { 'ngrok-skip-browser-warning': 'true' }
        });
        if (manifestRes.ok) {
          const manifestData = await manifestRes.json();
          if (manifestData.success) {
            if (Array.isArray(manifestData.manifests)) {
              extraDepotIds = manifestData.manifests
                .map((m: any) => String(m.depot_id || ''))
                .filter((d: string) => d && /^\d+$/.test(d));
            }
            if (manifestData.has_zip || (manifestData.manifests && manifestData.manifests.length > 0)) {
              hasManifestsOnServer = true;
            }
          }
        }
      } catch (e) {
        console.warn('Could not fetch extra depot list from server:', e);
      }

      setRedeemProgressMap(prev => ({ ...prev, [game.order_id]: 25 }));

      await invoke('clear_game_cache', {
        gameId: game.game_id,
        extraDepotIds
      });

      // If game uses manifests, immediately re-extract them so depotcache is not left empty
      let manifestSyncSucceeded = true;
      if (game.has_manifests || hasManifestsOnServer) {
        setRedeemProgressMap(prev => ({ ...prev, [game.order_id]: 40 }));
        try {
          const syncRes = await handleSyncManifests(game, true, (pct) => {
            const mappedPct = Math.round(40 + (pct / 100) * 55);
            setRedeemProgressMap(prev => ({ ...prev, [game.order_id]: mappedPct }));
          });
          if (!syncRes.success || syncRes.count === 0) {
            manifestSyncSucceeded = false;
          }
        } catch (syncErr) {
          console.warn('Auto re-sync manifests after clear cache error:', syncErr);
          manifestSyncSucceeded = false;
        }
      }

      setRedeemProgressMap(prev => ({ ...prev, [game.order_id]: 100 }));
      await new Promise(r => setTimeout(r, 350));
      setRedeemProgressMap(prev => { const n = { ...prev }; delete n[game.order_id]; return n; });
      setRedeemingOrderId(null);
      setIsLoadingGames(false);

      if (!manifestSyncSucceeded) {
        await showAlert(
          'ล้างแคชสำเร็จ (แต่ดาวน์โหลด Manifest ล้มเหลว)',
          `ระบบได้ล้างแคชของเกม [${game.title}] เรียบร้อยแล้ว แต่เกิดปัญหาในการดาวน์โหลดและติดตั้ง Depot Manifest\nกรุณากด "ล้างแคชและรีเซ็ตเกม" ใหม่อีกครั้ง หรือตรวจสอบการเชื่อมต่ออินเทอร์เน็ต`,
          game.game_id,
          game.hero_image
        );
        return;
      }

      const statusMsg = `ดำเนินการลบแคชและรีเซ็ทรีดีมเกม [${game.title}] เสร็จสิ้น\nคุณสามารถกลับไปหน้า Steam เพื่อลองติดตั้งเกมใหม่ได้เลยทันที แต่หากยังพบปัญหา ให้ลองรีสตาร์ท Steam และติดตั้งใหม่อีกครั้ง`;

      const wantRestart = await showConfirm(
        'ดำเนินการเสร็จสิ้น',
        statusMsg,
        'รีสตาร์ทเลย',
        'ไว้ทีหลัง',
        game.game_id,
        game.hero_image
      );

      if (wantRestart) {
        setIsLoadingGames(true);
        try {
          await invoke('restart_steam');
        } catch (steamErr) {
          console.error('Failed to restart steam:', steamErr);
        } finally {
          setIsLoadingGames(false);
        }
      }
    } catch (err: any) {
      console.error('Failed to clear game cache:', err);
      setRedeemProgressMap(prev => { const n = { ...prev }; delete n[game.order_id]; return n; });
      setRedeemingOrderId(null);
      setIsLoadingGames(false);
      await showAlert('ข้อผิดพลาด', `ไม่สามารถล้างแคชเกมได้: ${err?.message || err}`, game.game_id, game.hero_image);
    }
  };

  const handleSyncManifests = async (
    game: OwnedGameItem,
    silent = false,
    onProgress?: (percent: number) => void
  ): Promise<{ success: boolean; count: number }> => {
    try {
      if (!silent) {
        setRedeemingOrderId(game.order_id);
      }
      if (onProgress) {
        onProgress(5);
      } else {
        setRedeemProgressMap(prev => ({ ...prev, [game.order_id]: 5 }));
      }

      const listRes = await fetch(
        `${API_BASE_URL}/manifests.php?action=list&app_id=${encodeURIComponent(game.game_id)}&game_id=${encodeURIComponent(game.game_id)}`,
        { headers: { 'ngrok-skip-browser-warning': 'true' } }
      );
      const listData = await listRes.json();

      if (!listData.success || (!listData.manifests && !listData.has_zip) || (listData.manifests?.length === 0 && !listData.has_zip)) {
        if (!silent) {
          setRedeemingOrderId(null);
          setRedeemProgressMap(prev => { const n = { ...prev }; delete n[game.order_id]; return n; });
          await showAlert('ไฟล์ Manifest', `ไม่พบไฟล์ Depot Manifest สำหรับเกม [${game.title}] บนเซิร์ฟเวอร์`, game.game_id, game.hero_image);
        }
        return { success: false, count: 0 };
      }

      let downloadedCount = 0;

      // Method 1: Download single ZIP package bundle (Instant & ultra-fast)
      if (listData.has_zip) {
        if (onProgress) {
          onProgress(25);
        } else {
          setRedeemProgressMap(prev => ({ ...prev, [game.order_id]: 25 }));
        }

        let targetDownloadUrl = listData.zip_download_url || listData.manifest_zip_url;
        const serverFallbackUrl = `${API_BASE_URL}/manifests.php?action=download_zip&app_id=${encodeURIComponent(game.game_id)}&game_id=${encodeURIComponent(game.game_id)}`;

        if (!targetDownloadUrl) {
          targetDownloadUrl = serverFallbackUrl;
        } else if (targetDownloadUrl.startsWith('api/') || targetDownloadUrl.startsWith('../api/')) {
          targetDownloadUrl = `${API_BASE_URL}/${targetDownloadUrl.replace(/^(\.\.\/)+/, '').replace(/^api\//, '')}`;
        }

        if (onProgress) {
          onProgress(50);
        } else {
          setRedeemProgressMap(prev => ({ ...prev, [game.order_id]: 50 }));
        }

        try {
          // Primary: Rust native download & extract directly to Steam depotcache with auto-fallback
          const extractedCount = await invoke<number>('download_and_extract_manifest_zip', {
            url: targetDownloadUrl,
            fallbackUrl: serverFallbackUrl
          });
          downloadedCount = extractedCount || listData.count || 1;
        } catch (nativeErr) {
          console.warn('download_and_extract_manifest_zip error, falling back to web fetch:', nativeErr);
          const dlRes = await fetch(targetDownloadUrl, {
            headers: { 'ngrok-skip-browser-warning': 'true' }
          });

          if (!dlRes.ok) {
            throw new Error('ดาวน์โหลดไฟล์แพ็กเกจ Manifests ล้มเหลว');
          }

          if (onProgress) {
            onProgress(75);
          } else {
            setRedeemProgressMap(prev => ({ ...prev, [game.order_id]: 75 }));
          }

          const arrayBuf = await dlRes.arrayBuffer();
          const bytes = Array.from(new Uint8Array(arrayBuf));
          const extractedCount = await invoke<number>('extract_manifest_zip', { bytes });
          downloadedCount = extractedCount || listData.count || 1;
        }

        if (onProgress) {
          onProgress(92);
        } else {
          setRedeemProgressMap(prev => ({ ...prev, [game.order_id]: 92 }));
        }
      } else {
        // Method 2 Fallback: Download manifests sequentially if server has no zip
        const totalManifests = listData.manifests.length;
        for (let i = 0; i < totalManifests; i++) {
          const m = listData.manifests[i];
          try {
            const dlRes = await fetch(
              `${API_BASE_URL}/manifests.php?action=download&app_id=${encodeURIComponent(game.game_id)}&game_id=${encodeURIComponent(game.game_id)}&filename=${encodeURIComponent(m.filename)}&file=${encodeURIComponent(m.filename)}`,
              { headers: { 'ngrok-skip-browser-warning': 'true' } }
            );
            if (!dlRes.ok) {
              console.warn(`Failed to download manifest: ${m.filename}`);
              continue;
            }
            const arrayBuf = await dlRes.arrayBuffer();
            const bytes = Array.from(new Uint8Array(arrayBuf));

            await invoke('write_manifest_file', {
              filename: m.filename,
              bytes
            });
            downloadedCount++;

            // Progress from 10% to 92%
            const pct = Math.round(10 + ((i + 1) / totalManifests) * 82);
            if (onProgress) {
              onProgress(pct);
            } else {
              setRedeemProgressMap(prev => ({ ...prev, [game.order_id]: pct }));
            }
          } catch (mErr) {
            console.error(`Error saving manifest ${m.filename}:`, mErr);
          }
        }
      }

      if (onProgress) {
        onProgress(100);
      } else {
        setRedeemProgressMap(prev => ({ ...prev, [game.order_id]: 100 }));
      }

      await new Promise(r => setTimeout(r, 400));

      if (!silent) {
        setRedeemingOrderId(null);
        setRedeemProgressMap(prev => { const n = { ...prev }; delete n[game.order_id]; return n; });
        const wantRestart = await showConfirm(
          'ซิงค์ไฟล์สำเร็จ',
          `ติดตั้งและซิงค์ไฟล์ Depot Manifest จำนวน ${downloadedCount} ไฟล์เรียบร้อยแล้ว!\n\nคุณต้องการรีสตาร์ท Steam เพื่อให้มีผลทันทีหรือไม่?`,
          'รีสตาร์ทเลย',
          'ไว้ทีหลัง',
          game.game_id,
          game.hero_image
        );
        if (wantRestart) {
          setIsLoadingGames(true);
          try {
            await invoke('restart_steam');
          } catch (restartErr) {
            console.warn('restart_steam error:', restartErr);
          } finally {
            setIsLoadingGames(false);
          }
        }
      }

      return { success: true, count: downloadedCount };
    } catch (err: any) {
      console.error('Error syncing manifests:', err);
      if (!silent) {
        setRedeemingOrderId(null);
        setRedeemProgressMap(prev => { const n = { ...prev }; delete n[game.order_id]; return n; });
        await showAlert('ข้อผิดพลาด', `ไม่สามารถซิงค์ไฟล์ Manifest ได้: ${err?.message || err}`, game.game_id, game.hero_image);
      }
      return { success: false, count: 0 };
    } finally {
      if (!silent) {
        setRedeemingOrderId(null);
        setRedeemProgressMap(prev => { const n = { ...prev }; delete n[game.order_id]; return n; });
      }
    }
  };

  const handleOpenDepotcacheFolder = async () => {
    try {
      await invoke('open_depotcache_folder');
    } catch (err: any) {
      console.error('Failed to open depotcache folder:', err);
      await showAlert('ข้อผิดพลาด', `ไม่สามารถเปิดโฟลเดอร์ depotcache ได้: ${err?.message || err}`);
    }
  };

  const fetchSystemStatusAndConfig = async (silent = false) => {
    if (!silent) setIsLoadingSystemStatus(true);
    try {
      const status = await invoke<SystemPatchStatus>('get_system_patch_status');
      setSystemStatus(status);
      setLastSystemCheckTime(new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.');
    } catch (err) {
      console.error('Failed to get system patch status:', err);
    }

    try {
      const res = await fetch(`${API_BASE_URL}/digimanager_settings.php`);
      const data = await res.json();
      if (data.success && data.data) {
        setSystemPatchConfig(data.data);
        setIsStoreConnected(true);
        setIsDbConnected(true);
      } else {
        setIsStoreConnected(false);
        setIsDbConnected(false);
      }
    } catch (err) {
      console.error('Failed to fetch patch config:', err);
      setIsStoreConnected(false);
      setIsDbConnected(false);
    } finally {
      setIsLoadingSystemStatus(false);
    }
  };

  const fetchSystemSpecs = async () => {
    setIsLoadingSpecs(true);
    try {
      const specs = await invoke<{ os: string; cpu: string; gpu: string; ram: string }>('get_system_specs');
      let cleanOs = specs.os || '';
      if (cleanOs.toLowerCase().includes('windows 11')) {
        cleanOs = 'Windows 11';
      } else if (cleanOs.toLowerCase().includes('windows 10')) {
        cleanOs = 'Windows 10';
      } else if (cleanOs.toLowerCase().includes('windows 8.1')) {
        cleanOs = 'Windows 8.1';
      } else if (cleanOs.toLowerCase().includes('windows 8')) {
        cleanOs = 'Windows 8';
      } else if (cleanOs.toLowerCase().includes('windows 7')) {
        cleanOs = 'Windows 7';
      }

      const cleanSpecs = {
        ...specs,
        os: cleanOs
      };

      setSystemSpecs(cleanSpecs);
      localStorage.setItem('systemSpecs', JSON.stringify(cleanSpecs));

      if (user && user.username) {
        let mappedOs = 'other';
        let osScore = 0;
        const osLower = cleanOs.toLowerCase();
        if (osLower.includes('11')) {
          mappedOs = 'win11';
          osScore = 11;
        } else if (osLower.includes('10')) {
          mappedOs = 'win10';
          osScore = 10;
        } else if (osLower.includes('7') || osLower.includes('8')) {
          mappedOs = 'win7';
          osScore = 7;
        }

        const ramInt = parseInt((specs.ram || '').replace(/\D/g, '')) || 8;
        let mappedRam = '8';
        if (ramInt >= 32) mappedRam = '32';
        else if (ramInt >= 16) mappedRam = '16';
        else if (ramInt >= 12) mappedRam = '12';
        else if (ramInt >= 8) mappedRam = '8';
        else mappedRam = '4';
        const ramScore = parseInt(mappedRam);

        const specToSync = {
          os: cleanOs || mappedOs,
          osKey: mappedOs,
          osScore: osScore,
          cpu: specs.cpu,
          cpuScore: 0,
          gpu: specs.gpu,
          gpuScore: 0,
          ram: mappedRam,
          ramScore: ramScore,
          storage: 'ssd',
          storageScore: 2
        };

        const res = await fetch(`${API_BASE_URL}/update-specs.php`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            username: user.username,
            spec: specToSync
          })
        });
        const syncResult = await res.json();
        if (!syncResult.success) {
          console.error('Failed to sync specs to server:', syncResult.message);
        }
      }
    } catch (err) {
      console.error('Failed to get or sync system specs:', err);
    } finally {
      setIsLoadingSpecs(false);
    }
  };

  const handleStartSystemPatch = async () => {
    const downloadUrl = systemPatchConfig?.patch_url || 'https://github.com/DigiByte-PC/DigiCore/releases/download/v1.0.4/DigiByte-v1.0.4-Release.zip';
    const version = systemPatchConfig?.patch_version || '1.0.4';

    const confirmed = await showConfirm(
      'ยืนยันการติดตั้ง Patch ระบบ',
      `ระบบจะทำการปิดโปรแกรม Steam ชั่วคราว และติดตั้ง Patch (v${version}) พร้อมสร้างการตั้งค่าให้โดยอัตโนมัติ เมื่อเสร็จแล้วโปรแกรมจะเปิด Steam ขึ้นมาใหม่อีกครั้ง`,
      'เริ่ม Patch ทันที',
      'ยกเลิก'
    );
    if (!confirmed) return;

    setIsSystemPatching(true);
    setSystemPatchStep(1);
    setSystemPatchProgress(10);
    setSystemPatchMessage('กำลังเตรียมการติดตั้ง...');
    setSystemPatchError(null);

    try {
      await invoke('install_system_patch', {
        downloadUrl,
        version
      });
    } catch (err: any) {
      console.error('Failed to install system patch:', err);
      setSystemPatchError(typeof err === 'string' ? err : 'เกิดข้อผิดพลาดในการติดตั้ง Patch');
      setIsSystemPatching(false);
    }
  };

  const handleUninstallSystemPatch = async () => {
    const confirmed = await showConfirm(
      'ยืนยันการถอนการติดตั้งระบบ Patch',
      'คุณต้องการถอนการติดตั้งไฟล์ Patch ของระบบและคืนค่าโปรแกรม Steam หรือไม่?',
      'ถอนการติดตั้ง',
      'ยกเลิก'
    );
    if (!confirmed) return;

    try {
      setIsLoadingSystemStatus(true);
      await invoke('uninstall_system_patch');
      await fetchSystemStatusAndConfig();
      setSystemPatchStep(0);
      setSystemPatchProgress(0);
      setSystemPatchMessage('');
      await showAlert('ถอนการติดตั้งสำเร็จ', 'ระบบได้นำไฟล์ Patch ออกจากโฟลเดอร์ Steam เรียบร้อยแล้ว');
    } catch (err: any) {
      console.error('Failed to uninstall system patch:', err);
      await showAlert('เกิดข้อผิดพลาด', `ไม่สามารถถอนการติดตั้งได้: ${typeof err === 'string' ? err : err?.message || err}`);
    } finally {
      setIsLoadingSystemStatus(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginUsername || !loginPassword) {
      setErrorMsg('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }
    setErrorMsg(null);
    setIsInitializing(true);

    try {
      const response = await fetch(`${API_BASE_URL}/login.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUsername, password: loginPassword })
      });
      const data = await response.json();

      if (data.success && data.user) {
        setUser(data.user);
        localStorage.setItem('user', JSON.stringify(data.user));
        setLoginUsername('');
        setLoginPassword('');
        
        // โหลดแคชทันทีหากเคยบันทึกไว้
        const cachedGames = localStorage.getItem(`ownedGames_${data.user.username}`);
        const cachedLuaMap = localStorage.getItem(`luaExistsMap_${data.user.username}`);
        if (cachedGames) setOwnedGames(JSON.parse(cachedGames));
        if (cachedLuaMap) setLuaExistsMap(JSON.parse(cachedLuaMap));

        setActiveTab('home');
      } else {
        setErrorMsg(data.message || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาติดต่อแอดมินเพื่อดำเนินการแก้ไข');
    } finally {
      setIsInitializing(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerUsername || !registerDisplayName || !registerPassword || !registerConfirmPassword) {
      setErrorMsg('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }
    if (registerPassword !== registerConfirmPassword) {
      setErrorMsg('รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน');
      return;
    }
    setErrorMsg(null);
    setIsInitializing(true);

    try {
      const response = await fetch(`${API_BASE_URL}/register.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: registerUsername,
          display_name: registerDisplayName,
          name: registerDisplayName,
          password: registerPassword,
          recovery_code: registerRecoveryCode
        })
      });
      const data = await response.json();

      if (data.success) {
        setRegisterUsername('');
        setRegisterDisplayName('');
        setRegisterPassword('');
        setRegisterConfirmPassword('');
        setRegisterRecoveryCode('');
        await showAlert('สมัครสมาชิกสำเร็จ', 'คุณสามารถเข้าสู่ระบบด้วยบัญชีใหม่ได้ทันที');
        setActiveTab('login');
      } else {
        setErrorMsg(data.message || 'เกิดข้อผิดพลาดในการสมัครสมาชิก');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาติดต่อแอดมินเพื่อดำเนินการแก้ไข');
    } finally {
      setIsInitializing(false);
    }
  };

  const hasInitializedRef = useRef(false);

  // ตรวจสอบสถานะการเชื่อมต่อระบบร้านค้าทันทีที่เริ่มแอป
  useEffect(() => {
    fetchSystemStatusAndConfig(true);
  }, []);

  // เรียกใช้งานระบบสแกนคีย์หมดอายุ/เพิกถอนสิทธิ์แบบรันอัตโนมัติและดึงสถานะระบบเมื่อเริ่มต้น
  useEffect(() => {
    if (!user || hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    checkRevocations();
    fetchSystemStatusAndConfig();

    const interval = setInterval(() => {
      checkRevocations();
      if (user?.username) {
        fetchOwnedGames(user.username, true);
      }
    }, 300000); // รันเช็คสิทธิ์โดนเพิกถอนและซิงค์อัปเดตแบบเงียบๆ ทุก 5 นาที

    return () => clearInterval(interval);
  }, [user]);

  return (
    <AppContext.Provider value={{
      user, setUser,
      activeTab, setActiveTab,
      ownedGames, setOwnedGames,
      luaExistsMap, setLuaExistsMap,
      isLoadingGames, setIsLoadingGames,
      activeMenuGameId, setActiveMenuGameId,
      menuPosition, setMenuPosition,
      showProgressModal, setShowProgressModal,
      patchProgress, setPatchProgress,
      activePatchGame, setActivePatchGame,
      currentDlIndex, setCurrentDlIndex,
      systemStatus, setSystemStatus,
      systemPatchConfig, setSystemPatchConfig,
      isLoadingSystemStatus, setIsLoadingSystemStatus,
      isSystemPatching, setIsSystemPatching,
      systemPatchStep, setSystemPatchStep,
      systemPatchProgress, setSystemPatchProgress,
      systemPatchMessage, setSystemPatchMessage,
      systemPatchError, setSystemPatchError,
      lastSystemCheckTime, setLastSystemCheckTime,
      isStoreConnected, setIsStoreConnected,
      isDbConnected, setIsDbConnected,
      systemSpecs, setSystemSpecs,
      isLoadingSpecs, setIsLoadingSpecs,
      modal, setModal,
      errorMsg, setErrorMsg,
      successMsg, setSuccessMsg,
      slides, setSlides,
      currentSlideIndex, setCurrentSlideIndex,
      loginUsername, setLoginUsername,
      loginPassword, setLoginPassword,
      registerUsername, setRegisterUsername,
      registerDisplayName, setRegisterDisplayName,
      registerPassword, setRegisterPassword,
      registerConfirmPassword, setRegisterConfirmPassword,
      registerRecoveryCode, setRegisterRecoveryCode,
      isInitializing, setIsInitializing,
      isSyncing, setIsSyncing,
      redeemKey, setRedeemKey,
      isRedeeming, setIsRedeeming,
      verifiedGame, setVerifiedGame,
      showVerifiedUI, setShowVerifiedUI,
      imageLoaded, setImageLoaded,
      isCanceling, setIsCanceling,

      favorites,
      toggleFavorite,
      redeemingOrderId,
      redeemProgressMap,

      // Software Update States & Handlers
      updateInfo, setUpdateInfo,
      isUpdatingApp, setIsUpdatingApp,
      updateProgressPct, setUpdateProgressPct,
      updateStatusMsg, setUpdateStatusMsg,
      updateError, setUpdateError,
      handleDownloadAppUpdate,
      showMandatoryUpdateModal,
      checkAppUpdateGlobal,


      closeModalWithTransition,
      showToast: (titleOrMessage: string, descriptionOrType?: string, typeOrUndefined?: string) => {
        if ((window as any).showToast) {
          (window as any).showToast(titleOrMessage, descriptionOrType, typeOrUndefined);
        }
      },
      showAlert,
      showConfirm,
      showPatchChoice,
      showPatchNotes,
      handleLogout,
      syncProfile,
      fetchOwnedGames,
      handleRedeem,
      handleCancelPatch,
      handlePatchClick,
      handleRedeemOrderKey,
      handleConfirmRedeem,
      handleCancelRedeem,
      checkRevocations,
      handleCheckUpdate,
      handleRemoveFromSteam,
      handleClearGameCache,
      handleSyncManifests,
      handleOpenDepotcacheFolder,
      fetchSystemStatusAndConfig,
      fetchSystemSpecs,
      handleStartSystemPatch,
      handleUninstallSystemPatch,
      handleLoginSubmit,
      handleRegisterSubmit
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
