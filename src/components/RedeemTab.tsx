import React from 'react';
import { Key, ArrowRight } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

export const RedeemTab: React.FC = () => {
  const {
    user,
    redeemKey,
    setRedeemKey,
    isRedeeming,
    verifiedGame,
    showVerifiedUI,
    imageLoaded,
    setImageLoaded,
    isCanceling,
    handleRedeemOrderKey,
    handleCancelRedeem,
    handleConfirmRedeem
  } = useAppContext();

  if (!user) return null;

  return (
    <div className="h-full flex flex-col items-center justify-center animate-fade-in pb-10">
      <div className="max-w-lg w-full flex flex-col items-center space-y-8 py-4">
        {/* Big Key / Poster Card */}
        <div className="w-56 aspect-[2/3] bg-zinc-900/40 border border-zinc-800/80 rounded-3xl flex items-center justify-center overflow-hidden shadow-2xl relative">
          {verifiedGame ? (
            <>
              {!imageLoaded && !isCanceling && (
                <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/20 backdrop-blur-sm z-10 animate-fade-in">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-zinc-400" viewBox="0 0 24 24">
                    <g stroke="currentColor">
                      <circle cx="12" cy="12" r="9.5" fill="none" strokeLinecap="round" strokeWidth="3">
                        <animate attributeName="stroke-dasharray" calcMode="spline" dur="1.5s" keySplines="0.42,0,0.58,1;0.42,0,0.58,1;0.42,0,0.58,1" keyTimes="0;0.475;0.95;1" repeatCount="indefinite" values="0 150;42 150;42 150;42 150"/>
                        <animate attributeName="stroke-dashoffset" calcMode="spline" dur="1.5s" keySplines="0.42,0,0.58,1;0.42,0,0.58,1;0.42,0,0.58,1" keyTimes="0;0.475;0.95;1" repeatCount="indefinite" values="0;-16;-59;-59"/>
                      </circle>
                      <animateTransform attributeName="transform" dur="2s" repeatCount="indefinite" type="rotate" values="0 12 12;360 12 12"/>
                    </g>
                  </svg>
                </div>
              )}
              <img
                src={verifiedGame.poster_image}
                alt={verifiedGame.game_name}
                onLoad={() => setImageLoaded(true)}
                className="w-full h-full object-cover rounded-3xl animate-fade-in"
                style={{
                  transition: 'opacity 350ms cubic-bezier(0.16, 1, 0.3, 1)',
                  opacity: imageLoaded ? 1 : 0
                }}
              />
            </>
          ) : (
            <div className="flex flex-col items-center justify-center">
              <Key className="w-20 h-20 text-zinc-600 stroke-[1.2] -rotate-45 transform animate-pulse" />
            </div>
          )}
        </div>

        {/* Header Title & Subtitle */}
        <div className="grid grid-cols-1 grid-rows-1 text-center max-w-lg w-full font-sans">
          {/* Initial State Text */}
          <div 
            className="col-start-1 row-start-1 flex flex-col items-center justify-center w-full space-y-2"
            style={{
              transition: 'opacity 350ms cubic-bezier(0.16, 1, 0.3, 1), filter 350ms cubic-bezier(0.16, 1, 0.3, 1)',
              opacity: !showVerifiedUI ? 1 : 0,
              filter: !showVerifiedUI ? 'blur(0px)' : 'blur(4px)',
              pointerEvents: !showVerifiedUI ? 'auto' : 'none'
            }}
          >
            <h2 className="text-xl font-bold tracking-tight text-white">
              รีดีมคีย์ออเดอร์
            </h2>
            <p className="text-zinc-400 text-xs px-2 leading-relaxed whitespace-pre-line md:whitespace-nowrap">
              กรอกรหัสคีย์ออเดอร์เพื่อรับเกมเข้าบัญชี DigiByte ของคุณ
            </p>
          </div>

          {/* Verified State Text */}
          <div 
            className="col-start-1 row-start-1 flex flex-col items-center justify-center w-full space-y-2"
            style={{
              transition: 'opacity 350ms cubic-bezier(0.16, 1, 0.3, 1), filter 350ms cubic-bezier(0.16, 1, 0.3, 1)',
              opacity: verifiedGame && showVerifiedUI ? 1 : 0,
              filter: verifiedGame && showVerifiedUI ? 'blur(0px)' : 'blur(4px)',
              pointerEvents: verifiedGame && showVerifiedUI ? 'auto' : 'none'
            }}
          >
            <h2 className="text-xl font-bold tracking-tight text-white">
              รีดีม {verifiedGame ? verifiedGame.game_name : ''}
            </h2>
            <p className="text-zinc-400 text-xs px-2 leading-relaxed whitespace-pre-line text-center">
              คุณต้องการรับเกม {verifiedGame ? verifiedGame.game_name : ''} เข้าบัญชี DigiByte ของคุณหรือไม่?{'\n'}
              การรีดีมจะแสดงบนประวัติการสั่งซื้อของคุณบนบัญชี DigiByte ด้วย
            </p>
          </div>
        </div>

        {/* Input & Form Area */}
        <div className="w-72 space-y-4">
          <form onSubmit={handleRedeemOrderKey} className="space-y-4">
            {/* Unified input & button group */}
            <div className="flex items-center bg-zinc-900/60 border border-zinc-800/80 rounded-xl focus-within:border-zinc-700 focus-within:ring-1 focus-within:ring-zinc-700/50 p-1 pl-3 w-full transition-all">
              <input
                type="text"
                placeholder="DGB..."
                value={redeemKey}
                onChange={(e) => setRedeemKey(e.target.value.toUpperCase())}
                disabled={isRedeeming || showVerifiedUI}
                className="flex-1 bg-transparent border-0 focus:ring-0 focus:outline-none p-0 py-2.5 text-zinc-100 disabled:text-zinc-500 placeholder-zinc-700 tracking-wider text-xs disabled:cursor-not-allowed transition-all duration-350 ease-out font-sans"
                required
              />

              <button
                type="submit"
                disabled={isRedeeming || !redeemKey.trim() || showVerifiedUI}
                className="h-[34px] w-[34px] bg-zinc-950/80 hover:bg-zinc-900 text-zinc-200 hover:text-white active:scale-95 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{
                  transition: 'opacity 350ms cubic-bezier(0.16, 1, 0.3, 1), transform 350ms cubic-bezier(0.16, 1, 0.3, 1)',
                  opacity: showVerifiedUI ? 0 : (isRedeeming || !redeemKey.trim() ? 0.5 : 1),
                  transform: showVerifiedUI ? 'scale(0.8)' : 'scale(1)',
                  pointerEvents: showVerifiedUI ? 'none' : 'auto'
                }}
              >
                {isRedeeming ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-zinc-400" viewBox="0 0 24 24">
                    <g stroke="currentColor">
                      <circle cx="12" cy="12" r="9.5" fill="none" strokeLinecap="round" strokeWidth="3">
                        <animate attributeName="stroke-dasharray" calcMode="spline" dur="1.5s" keySplines="0.42,0,0.58,1;0.42,0,0.58,1;0.42,0,0.58,1" keyTimes="0;0.475;0.95;1" repeatCount="indefinite" values="0 150;42 150;42 150;42 150"/>
                        <animate attributeName="stroke-dashoffset" calcMode="spline" dur="1.5s" keySplines="0.42,0,0.58,1;0.42,0,0.58,1;0.42,0,0.58,1" keyTimes="0;0.475;0.95;1" repeatCount="indefinite" values="0;-16;-59;-59"/>
                      </circle>
                      <animateTransform attributeName="transform" dur="2s" repeatCount="indefinite" type="rotate" values="0 12 12;360 12 12"/>
                    </g>
                  </svg>
                ) : (
                  <ArrowRight className="w-4 h-4" />
                )}
              </button>
            </div>

            <div className={`transition-grid-row ${verifiedGame && showVerifiedUI ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none'}`}>
              <div className="min-h-0">
                <div 
                  className="flex items-center gap-3 w-full pt-4 font-sans"
                  style={{
                    transition: 'opacity 350ms cubic-bezier(0.16, 1, 0.3, 1), transform 350ms cubic-bezier(0.16, 1, 0.3, 1)',
                    opacity: verifiedGame && showVerifiedUI ? 1 : 0,
                    transform: verifiedGame && showVerifiedUI ? 'translateY(0)' : 'translateY(12px)',
                    pointerEvents: verifiedGame && showVerifiedUI ? 'auto' : 'none'
                  }}
                >
                  <button
                    type="button"
                    onClick={handleCancelRedeem}
                    disabled={isRedeeming}
                    className="flex-1 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmRedeem}
                    disabled={isRedeeming}
                    className="flex-1 py-2.5 bg-zinc-50 hover:bg-zinc-200 text-zinc-950 font-bold rounded-xl text-xs transition-all hover:translate-y-[-1px] active:translate-y-[0px] flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                  >
                    {isRedeeming ? (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-zinc-950 mr-1" viewBox="0 0 24 24">
                          <g stroke="currentColor">
                            <circle cx="12" cy="12" r="9.5" fill="none" strokeLinecap="round" strokeWidth="3">
                              <animate attributeName="stroke-dasharray" calcMode="spline" dur="1.5s" keySplines="0.42,0,0.58,1;0.42,0,0.58,1;0.42,0,0.58,1" keyTimes="0;0.475;0.95;1" repeatCount="indefinite" values="0 150;42 150;42 150;42 150"/>
                              <animate attributeName="stroke-dashoffset" calcMode="spline" dur="1.5s" keySplines="0.42,0,0.58,1;0.42,0,0.58,1;0.42,0,0.58,1" keyTimes="0;0.475;0.95;1" repeatCount="indefinite" values="0;-16;-59;-59"/>
                            </circle>
                            <animateTransform attributeName="transform" dur="2s" repeatCount="indefinite" type="rotate" values="0 12 12;360 12 12"/>
                          </g>
                        </svg>
                        <span>กำลังรีดีม...</span>
                      </>
                    ) : (
                      <span>ยืนยันการรีดีม</span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
