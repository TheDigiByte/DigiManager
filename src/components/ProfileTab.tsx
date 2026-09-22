import React from 'react';
import { Coins, Gamepad2, ArrowRight, User, Shield, LogOut } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Tooltip } from './Tooltip';

export const ProfileTab: React.FC = () => {
  const { user, ownedGames, setActiveTab, handleLogout } = useAppContext();

  if (!user) return null;

  const isAdmin = user.role === 99;

  // Calculate stats
  const redeemedCount = ownedGames.filter(
    game => !!game.redeemed_by && game.redeemed_by.trim() !== '' && game.redeemed_by.trim() !== '-'
  ).length;

  const notRedeemedCount = ownedGames.length - redeemedCount;

  return (
    <div className="space-y-6 font-sans pb-8 select-none">
      {/* Title */}
      <div className="flex flex-col gap-1.5">
        <span className="text-xs text-zinc-550 font-bold tracking-widest uppercase">Profile Settings</span>
        <h2 className="text-3xl font-bold tracking-tight text-white">
          บัญชีผู้ใช้
        </h2>
        <p className="text-zinc-400 text-sm">
          จัดการข้อมูลส่วนตัว ตรวจสอบเครดิตสะสม และสถานะการเชื่อมต่อของคุณ
        </p>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        {/* Left Column: User Profile Summary Card */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 flex flex-col items-center justify-between text-center h-full shadow-sm">
          <div className="flex flex-col items-center space-y-6 w-full">
            {/* Avatar Section */}
            <div className="relative">
              <div className="w-24 h-24 bg-zinc-900 border border-zinc-800 rounded-full flex items-center justify-center text-zinc-300 shadow-inner">
                <User className="w-12 h-12 text-zinc-400" />
              </div>
              {isAdmin && (
                <Tooltip
                  content="ผู้ดูแลระบบ (Administrator)"
                  side="top"
                  containerClassName="absolute bottom-0 right-0 z-10"
                >
                  <span className="p-1.5 bg-rose-950 border border-rose-800 text-rose-450 rounded-full shadow-md cursor-help flex items-center justify-center">
                    <Shield className="w-4 h-4" />
                  </span>
                </Tooltip>
              )}
            </div>

            {/* User Names */}
            <div className="space-y-0.5 w-full">
              <h3 className="text-xl font-bold text-zinc-150 truncate">
                {user.name}
              </h3>
              <p className="text-xs text-zinc-500 font-sans">
                @{user.username.toLowerCase()}
              </p>
            </div>
          </div>

          {/* Integrated Logout Button */}
          <div className="w-full pt-6">
            <button
              onClick={handleLogout}
              className="w-full py-2.5 px-4 bg-transparent hover:bg-rose-950/20 border border-zinc-800 hover:border-rose-900/40 text-zinc-400 hover:text-rose-400 font-bold rounded-lg text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>ออกจากระบบบัญชี</span>
            </button>
          </div>
        </div>

        {/* Right Column: Stats 2x2 Grid */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Credit Balance Card */}
          <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-xl flex flex-col justify-between space-y-6 shadow-sm relative overflow-hidden group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-400 tracking-wider uppercase">เครดิตสะสมในบัญชี</span>
              <Coins className="w-5 h-5 text-zinc-500" />
            </div>
            <div className="space-y-1">
              <div className="text-4xl font-extrabold tracking-tight text-white">
                {Math.floor(user.credit || 0)}
              </div>
            </div>
          </div>

          {/* Owned Games Count Card */}
          <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-xl flex flex-col justify-between space-y-6 shadow-sm relative overflow-hidden group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-400 tracking-wider uppercase">คลังเกมของฉัน</span>
              <Gamepad2 className="w-5 h-5 text-zinc-500" />
            </div>
            <div className="flex items-end justify-between">
              <div className="text-4xl font-extrabold tracking-tight text-white leading-none">
                {ownedGames.length} <span className="text-lg font-medium text-zinc-400">เกม</span>
              </div>
              <button
                onClick={() => setActiveTab('library')}
                className="text-xs text-zinc-300 hover:text-white font-semibold flex items-center gap-1 transition-colors group/btn"
              >
                <span>ดูทั้งหมด</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover/btn:translate-x-0.5" />
              </button>
            </div>
          </div>

          {/* Redeemed Count Card */}
          <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-xl flex items-center justify-between shadow-sm">
            <span className="text-sm font-bold text-zinc-300">รีดีมแล้ว</span>
            <div className="text-3xl font-extrabold text-white">
              {redeemedCount} <span className="text-xs font-medium text-zinc-400">เกม</span>
            </div>
          </div>

          {/* Not Redeemed Count Card */}
          <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-xl flex items-center justify-between shadow-sm">
            <span className="text-sm font-bold text-zinc-300">ยังไม่รีดีม</span>
            <div className="text-3xl font-extrabold text-white">
              {notRedeemedCount} <span className="text-xs font-medium text-zinc-400">เกม</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
