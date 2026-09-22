import React, { useEffect } from 'react';
import { 
  Monitor, 
  Cpu, 
  Gamepad2, 
  Server, 
  RefreshCw, 
  Copy, 
  AlertTriangle 
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';

export const SpecsTab: React.FC = () => {
  const {
    user,
    systemSpecs,
    isLoadingSpecs,
    fetchSystemSpecs,
    showAlert
  } = useAppContext();

  // Trigger auto spec scanning on first mount if not already scanned
  useEffect(() => {
    if (!systemSpecs && !isLoadingSpecs) {
      fetchSystemSpecs();
    }
  }, [systemSpecs]);

  if (!user) return null;

  return (
    <div className="w-full max-w-2xl mx-auto min-h-[calc(100vh-150px)] flex flex-col pt-1 pb-10">
      
      {/* Page Header */}
      <div className="text-center space-y-2 mb-6 flex-shrink-0">
        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">System Properties</span>
        <h2 className="text-2xl font-extrabold tracking-tight text-white font-sans">ข้อมูลสเปคคอมพิวเตอร์</h2>
        <p className="text-xs text-zinc-400 max-w-md mx-auto">รายละเอียดระบบปฏิบัติการและฮาร์ดแวร์หลักที่ติดตั้งในเครื่องของคุณ</p>
      </div>

      {isLoadingSpecs ? (
        <div className="flex-grow flex-1 flex flex-col items-center justify-center gap-3">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-zinc-400 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-25" />
            <path fill="currentColor" d="M12 2a10 10 0 0 1 10 10h-2a8 8 0 0 0-8-8z" className="opacity-75" />
          </svg>
          <p className="text-xs text-zinc-500 font-semibold animate-pulse">กำลังสแกนและอ่านข้อมูลฮาร์ดแวร์...</p>
        </div>
      ) : systemSpecs ? (
        <div className="space-y-4">
          {/* Flat Row Specs Layout */}
          <div className="divide-y divide-zinc-800/85">
            
            {/* OS Row */}
            <div className="py-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-zinc-800/20 rounded-xl flex items-center justify-center text-zinc-400">
                  <Monitor className="w-6 h-6" />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-sm text-zinc-200">ระบบปฏิบัติการ</span>
                  <span className="text-xs text-zinc-500">Operation System</span>
                </div>
              </div>
              <div className="text-right">
                <span className="font-bold text-sm text-white select-all block leading-tight">
                  {systemSpecs.os || 'Windows (ไม่ระบุ)'}
                </span>
              </div>
            </div>

            {/* CPU Row */}
            <div className="py-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-zinc-800/20 rounded-xl flex items-center justify-center text-zinc-400">
                  <Cpu className="w-6 h-6" />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-sm text-zinc-200">หน่วยประมวลผล</span>
                  <span className="text-xs text-zinc-500">CPU</span>
                </div>
              </div>
              <div className="text-right max-w-[65%]">
                <span className="font-bold text-sm text-white select-all block leading-tight">
                  {systemSpecs.cpu}
                </span>
              </div>
            </div>

            {/* GPU Row */}
            <div className="py-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-zinc-800/20 rounded-xl flex items-center justify-center text-zinc-400">
                  <Gamepad2 className="w-6 h-6" />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-sm text-zinc-200">การ์ดจอ</span>
                  <span className="text-xs text-zinc-500">Graphic Card</span>
                </div>
              </div>
              <div className="text-right max-w-[65%]">
                <span className="font-bold text-sm text-white select-all block leading-tight">
                  {systemSpecs.gpu || 'Intel / AMD Integrated Graphics'}
                </span>
              </div>
            </div>

            {/* RAM Row */}
            <div className="py-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-zinc-800/20 rounded-xl flex items-center justify-center text-zinc-400">
                  <Server className="w-6 h-6" />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-sm text-zinc-200">หน่วยความจำ</span>
                  <span className="text-xs text-zinc-500">Ram</span>
                </div>
              </div>
              <div className="text-right">
                <span className="font-bold text-sm text-white select-all block leading-tight">
                  {systemSpecs.ram}
                </span>
              </div>
            </div>

          </div>

          {/* Actions Row */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={fetchSystemSpecs}
              disabled={isLoadingSpecs}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-850 hover:text-white text-zinc-300 text-xs font-semibold transition-all duration-200 active:scale-95 disabled:opacity-50"
            >
              {isLoadingSpecs ? (
                <svg xmlns="http://www.w3.org/2500/svg" className="w-3.5 h-3.5 text-zinc-400 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-25" />
                  <path fill="currentColor" d="M12 2a10 10 0 0 1 10 10h-2a8 8 0 0 0-8-8z" className="opacity-75" />
                </svg>
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              <span>สแกนสเปคใหม่</span>
            </button>
            <button
              onClick={() => {
                const copyText = `OS: ${systemSpecs.os}\nCPU: ${systemSpecs.cpu}\nGPU: ${systemSpecs.gpu}\nRAM: ${systemSpecs.ram}`;
                navigator.clipboard.writeText(copyText);
                showAlert('คัดลอกสำเร็จ', 'ข้อมูลสเปคของคุณถูกบันทึกไปยังคลิปบอร์ดแล้ว', '');
              }}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-50 hover:bg-zinc-200 text-zinc-950 text-xs font-bold transition-all duration-200 shadow-sm active:scale-95"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>คัดลอกสเปคคอม</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-grow flex-1 flex flex-col items-center justify-center text-center gap-3">
          <div className="p-3.5 bg-zinc-900 border border-zinc-800/80 rounded-2xl text-zinc-400">
            <AlertTriangle className="w-8 h-8 text-zinc-500" />
          </div>
          <p className="text-sm text-zinc-400 font-semibold">ไม่พบข้อมูลสเปคเครื่อง</p>
        </div>
      )}

    </div>
  );
};
