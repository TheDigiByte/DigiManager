import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowRight, 
  ArrowLeft,
  Download,
  RefreshCw,
  Lock, 
  User, 
  Sparkles, 
  ExternalLink, 
  AlertTriangle, 
  CheckCircle2,
  Check,
  KeyRound,
  Info,
  AlertCircle,
  X,
  ShieldCheck
} from 'lucide-react';
import { openUrl } from '@tauri-apps/plugin-opener';
import { useAppContext } from '../context/AppContext';
import { getApiBaseUrl } from '../config';
import { Tooltip, InfoTooltip } from './Tooltip';

export const LoginScreen: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    setUser,
    setOwnedGames,
    setLuaExistsMap,
    showAlert,
    showToast
  } = useAppContext();

  const [onboardingStep, setOnboardingStep] = useState(0);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerUsername, setRegisterUsername] = useState('');
  const [registerDisplayName, setRegisterDisplayName] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('');
  const [registerRecoveryCode, setRegisterRecoveryCode] = useState('');
  const [registerPinSlots, setRegisterPinSlots] = useState(['', '', '', '', '', '']);

  // Field level validation errors & touched states
  const [fieldErrors, setFieldErrors] = useState<{
    username?: string;
    displayName?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const [touchedFields, setTouchedFields] = useState<{
    username?: boolean;
    displayName?: boolean;
    password?: boolean;
    confirmPassword?: boolean;
  }>({});

  const validateSingleField = (name: 'username' | 'displayName' | 'password' | 'confirmPassword', val: string) => {
    let err = '';
    if (name === 'username') {
      if (!val.trim()) err = 'กรุณากรอกชื่อผู้ใช้ (Username)';
      else if (val.length < 3) err = 'ชื่อผู้ใช้ต้องมีความยาวอย่างน้อย 3 ตัวอักษร';
      else if (/\s/.test(val)) err = 'ชื่อผู้ใช้ห้ามมีช่องว่าง';
      else if (/[A-Z]/.test(val)) err = 'ชื่อผู้ใช้ต้องใช้ตัวพิมพ์เล็กเท่านั้น (ห้ามมีตัวพิมพ์ใหญ่)';
      else if (!/^[a-z0-9_.\-!@#$%^&*()+=~`{}[\]:;"'<>,.?/|\\]+$/.test(val)) err = 'ใช้ได้เฉพาะตัวอักษรพิมพ์เล็ก ตัวเลข และสัญลักษณ์';
    } else if (name === 'displayName') {
      if (!val.trim()) err = 'กรุณากรอกชื่อแสดงบนโปรไฟล์';
      else if (val.trim().length < 2) err = 'ชื่อแสดงบนโปรไฟล์ต้องมีความยาวอย่างน้อย 2 ตัวอักษร';
      else if (/[\u0E00-\u0E7F]/.test(val)) err = 'ชื่อแสดงบนโปรไฟล์ห้ามใช้ภาษาไทย (เช่น "Clint Eston")';
    } else if (name === 'password') {
      if (!val) err = 'กรุณากรอกรหัสผ่าน';
      else if (val.length < 8) err = 'รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร';
      else if (!/[a-zA-Z]/.test(val)) err = 'รหัสผ่านต้องมีตัวอักษรภาษาอังกฤษอย่างน้อย 1 ตัว';
      else if (!/[0-9]/.test(val)) err = 'รหัสผ่านต้องมีตัวเลขอย่างน้อย 1 ตัว';
      else if (!/[^a-zA-Z0-9\s]/.test(val)) err = 'รหัสผ่านต้องมีสัญลักษณ์พิเศษอย่างน้อย 1 ตัว (เช่น !@#$%^&*_)';
    } else if (name === 'confirmPassword') {
      if (!val) err = 'กรุณายืนยันรหัสผ่าน';
      else if (val !== registerPassword) err = 'รหัสผ่านทั้งสองช่องไม่ตรงกัน';
    }
    setFieldErrors(prev => ({ ...prev, [name]: err }));
    return err;
  };

  const handleBlurField = (name: 'username' | 'displayName' | 'password' | 'confirmPassword', val: string) => {
    setTouchedFields(prev => ({ ...prev, [name]: true }));
    validateSingleField(name, val);
  };

  const handleChangeField = (name: 'username' | 'displayName' | 'password' | 'confirmPassword', val: string, setter: (v: string) => void) => {
    setter(val);
    if (touchedFields[name]) {
      validateSingleField(name, val);
    }
  };
  const pinInputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  const handlePinChange = (index: number, val: string) => {
    const clean = val.replace(/\D/g, '');
    const char = clean ? clean[clean.length - 1] : '';
    const newSlots = [...registerPinSlots];
    newSlots[index] = char;
    setRegisterPinSlots(newSlots);
    setRegisterRecoveryCode(newSlots.join(''));

    if (char && index < 5) {
      pinInputRefs[index + 1].current?.focus();
      pinInputRefs[index + 1].current?.select();
    }
  };

  const handlePinKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !registerPinSlots[index] && index > 0) {
      const newSlots = [...registerPinSlots];
      newSlots[index - 1] = '';
      setRegisterPinSlots(newSlots);
      setRegisterRecoveryCode(newSlots.join(''));
      pinInputRefs[index - 1].current?.focus();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      pinInputRefs[index - 1].current?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      pinInputRefs[index + 1].current?.focus();
    }
  };

  const handlePinPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (text) {
      const newSlots = ['', '', '', '', '', ''];
      for (let i = 0; i < text.length; i++) {
        newSlots[i] = text[i];
      }
      setRegisterPinSlots(newSlots);
      setRegisterRecoveryCode(newSlots.join(''));
      const targetIdx = Math.min(text.length, 5);
      pinInputRefs[targetIdx].current?.focus();
    }
  };

  // Forgot Password Modal States (Global Modal Structure)
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [isForgotModalClosing, setIsForgotModalClosing] = useState(false);
  const [forgotStep, setForgotStep] = useState<1 | 2>(1);
  const [forgotUsername, setForgotUsername] = useState('');
  const [forgotRecoveryCode, setForgotRecoveryCode] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  // Field validation states for forgot password step 2
  const [forgotFieldErrors, setForgotFieldErrors] = useState<{
    newPassword?: string;
    confirmPassword?: string;
  }>({});

  const [forgotTouchedFields, setForgotTouchedFields] = useState<{
    newPassword?: boolean;
    confirmPassword?: boolean;
  }>({});

  const validateForgotField = (name: 'newPassword' | 'confirmPassword', val: string) => {
    let err = '';
    if (name === 'newPassword') {
      if (!val) err = 'กรุณากรอกรหัสผ่านใหม่';
      else if (val.length < 8) err = 'รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 8 ตัวอักษร';
      else if (!/[a-zA-Z]/.test(val)) err = 'รหัสผ่านใหม่ต้องมีตัวอักษรภาษาอังกฤษอย่างน้อย 1 ตัว';
      else if (!/[0-9]/.test(val)) err = 'รหัสผ่านใหม่ต้องมีตัวเลขอย่างน้อย 1 ตัว';
      else if (!/[^a-zA-Z0-9\s]/.test(val)) err = 'รหัสผ่านใหม่ต้องมีสัญลักษณ์พิเศษอย่างน้อย 1 ตัว (เช่น !@#$%^&*_)';
    } else if (name === 'confirmPassword') {
      if (!val) err = 'กรุณายืนยันรหัสผ่านใหม่';
      else if (val !== forgotNewPassword) err = 'รหัสผ่านทั้งสองช่องไม่ตรงกัน';
    }
    setForgotFieldErrors(prev => ({ ...prev, [name]: err }));
    return err;
  };

  const handleBlurForgotField = (name: 'newPassword' | 'confirmPassword', val: string) => {
    setForgotTouchedFields(prev => ({ ...prev, [name]: true }));
    validateForgotField(name, val);
  };

  const handleChangeForgotField = (name: 'newPassword' | 'confirmPassword', val: string, setter: (v: string) => void) => {
    setter(val);
    if (val) {
      setForgotTouchedFields(prev => ({ ...prev, [name]: true }));
    }
    if (name === 'newPassword') {
      validateForgotField('newPassword', val);
      if (forgotTouchedFields.confirmPassword) {
        if (forgotConfirmPassword && val !== forgotConfirmPassword) {
          setForgotFieldErrors(prev => ({ ...prev, confirmPassword: 'รหัสผ่านทั้งสองช่องไม่ตรงกัน' }));
        } else if (forgotConfirmPassword && val === forgotConfirmPassword) {
          setForgotFieldErrors(prev => ({ ...prev, confirmPassword: '' }));
        }
      }
    } else if (name === 'confirmPassword') {
      validateForgotField('confirmPassword', val);
    }
  };

  const renderPasswordCriteria = (pwd: string) => {
    const hasLen = pwd.length >= 8;
    const hasLetter = /[a-zA-Z]/.test(pwd);
    const hasNumber = /[0-9]/.test(pwd);
    const hasSymbol = /[^a-zA-Z0-9\s]/.test(pwd);

    return (
      <div className="text-left min-w-[215px]">
        <div className="font-semibold text-zinc-200 text-xs mb-1.5 pb-1 border-b border-zinc-800/80">
          รหัสผ่านต้องมีเงื่อนไขดังนี้:
        </div>
        <div className="space-y-1">
          <div className={`flex items-center gap-1.5 ${hasLen ? 'text-emerald-400' : 'text-rose-400'}`}>
            {hasLen ? <Check className="w-3.5 h-3.5 stroke-[2.5]" /> : <X className="w-3.5 h-3.5 stroke-[2.5]" />}
            <span>ความยาวอย่างน้อย 8 ตัวอักษร</span>
          </div>
          <div className={`flex items-center gap-1.5 ${hasLetter ? 'text-emerald-400' : 'text-rose-400'}`}>
            {hasLetter ? <Check className="w-3.5 h-3.5 stroke-[2.5]" /> : <X className="w-3.5 h-3.5 stroke-[2.5]" />}
            <span>มีอักษรภาษาอังกฤษอย่างน้อย 1 ตัว</span>
          </div>
          <div className={`flex items-center gap-1.5 ${hasNumber ? 'text-emerald-400' : 'text-rose-400'}`}>
            {hasNumber ? <Check className="w-3.5 h-3.5 stroke-[2.5]" /> : <X className="w-3.5 h-3.5 stroke-[2.5]" />}
            <span>มีตัวเลขอย่างน้อย 1 ตัว</span>
          </div>
          <div className={`flex items-center gap-1.5 ${hasSymbol ? 'text-emerald-400' : 'text-rose-400'}`}>
            {hasSymbol ? <Check className="w-3.5 h-3.5 stroke-[2.5]" /> : <X className="w-3.5 h-3.5 stroke-[2.5]" />}
            <span>มีสัญลักษณ์พิเศษอย่างน้อย 1 ตัว (เช่น !@#$%^&*_)</span>
          </div>
        </div>
      </div>
    );
  };

  const renderConfirmPasswordCriteria = (pwd: string, confirmPwd: string) => {
    const isMatch = Boolean(pwd && confirmPwd && confirmPwd === pwd);
    return (
      <div className="text-left min-w-[205px]">
        <div className="font-semibold text-zinc-200 text-xs mb-1.5 pb-1 border-b border-zinc-800/80">
          การยืนยันรหัสผ่าน:
        </div>
        <div className="space-y-1">
          <div className={`flex items-center gap-1.5 ${isMatch ? 'text-emerald-400' : 'text-rose-400'}`}>
            {isMatch ? <Check className="w-3.5 h-3.5 stroke-[2.5]" /> : <X className="w-3.5 h-3.5 stroke-[2.5]" />}
            <span>รหัสผ่านทั้งสองช่องตรงกัน</span>
          </div>
        </div>
      </div>
    );
  };

  const [forgotPinSlots, setForgotPinSlots] = useState<string[]>(['', '', '', '', '', '']);

  const forgotPinInputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  const handleForgotPinChange = (index: number, val: string) => {
    const clean = val.replace(/\D/g, '');
    const char = clean ? clean[clean.length - 1] : '';
    const newSlots = [...forgotPinSlots];
    newSlots[index] = char;
    setForgotPinSlots(newSlots);
    setForgotRecoveryCode(newSlots.join(''));

    if (char && index < 5) {
      forgotPinInputRefs[index + 1].current?.focus();
      forgotPinInputRefs[index + 1].current?.select();
    }
  };

  const handleForgotPinKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !forgotPinSlots[index] && index > 0) {
      const newSlots = [...forgotPinSlots];
      newSlots[index - 1] = '';
      setForgotPinSlots(newSlots);
      setForgotRecoveryCode(newSlots.join(''));
      forgotPinInputRefs[index - 1].current?.focus();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      forgotPinInputRefs[index - 1].current?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      forgotPinInputRefs[index + 1].current?.focus();
    }
  };

  const handleForgotPinPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (text) {
      const newSlots = ['', '', '', '', '', ''];
      for (let i = 0; i < text.length; i++) {
        newSlots[i] = text[i];
      }
      setForgotPinSlots(newSlots);
      setForgotRecoveryCode(newSlots.join(''));
      const targetIdx = Math.min(text.length, 5);
      forgotPinInputRefs[targetIdx].current?.focus();
    }
  };

  const openForgotModal = (initialUsername = '') => {
    setForgotStep(1);
    setForgotUsername(initialUsername);
    setForgotRecoveryCode('');
    setForgotPinSlots(['', '', '', '', '', '']);
    setForgotNewPassword('');
    setForgotConfirmPassword('');
    setForgotFieldErrors({});
    setForgotTouchedFields({});
    setIsForgotModalClosing(false);
    setShowForgotModal(true);
  };

  const closeForgotModalWithTransition = (callback?: () => void) => {
    setIsForgotModalClosing(true);
    setTimeout(() => {
      setShowForgotModal(false);
      setIsForgotModalClosing(false);
      setForgotStep(1);
      setForgotUsername('');
      setForgotRecoveryCode('');
      setForgotPinSlots(['', '', '', '', '', '']);
      setForgotNewPassword('');
      setForgotConfirmPassword('');
      setForgotFieldErrors({});
      setForgotTouchedFields({});
      if (callback) callback();
    }, 180);
  };

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 2FA Pending States
  const [is2FaPending, setIs2FaPending] = useState(false);
  const [twoFaUsername, setTwoFaUsername] = useState('');
  const [twoFaMethod, setTwoFaMethod] = useState<'otp' | 'recovery'>('otp');
  const [twoFaPinSlots, setTwoFaPinSlots] = useState(['', '', '', '', '', '']);
  const [twoFaRecoveryInput, setTwoFaRecoveryInput] = useState('');
  const [is2FaSubmitting, setIs2FaSubmitting] = useState(false);
  const [twoFaErrorMsg, setTwoFaErrorMsg] = useState<string | null>(null);

  const twoFaPinInputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  // Slideshow States
  const [slides, setSlides] = useState<Array<{ url: string; game_title: string; game_id: string }>>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  // Fetch slideshow screenshots dynamically
  useEffect(() => {
    if (activeTab !== 'login' && activeTab !== 'register') return;

    let isMounted = true;
    const fetchSlides = async () => {
      try {
        const response = await fetch(`${getApiBaseUrl()}/get_login_slideshow.php`);
        const data = await response.json();
        if (isMounted && data && data.success && Array.isArray(data.screenshots) && data.screenshots.length > 0) {
          setSlides(data.screenshots);
          setCurrentSlideIndex(0);
        }
      } catch (err) {
        console.error("Failed to fetch login slideshow screenshots:", err);
        if (isMounted) {
          setSlides([
            {
              url: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1091500/ss_8e2cc45b08709e99a4c8eb6cb5de7b93a0b73c24.1920x1080.jpg?t=1721034458',
              game_title: 'Cyberpunk 2077',
              game_id: ''
            }
          ]);
        }
      }
    };

    fetchSlides();
    return () => {
      isMounted = false;
    };
  }, [activeTab]);

  // Slideshow auto-rotation timer (10 seconds)
  useEffect(() => {
    if (slides.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentSlideIndex((prev) => (prev + 1) % slides.length);
    }, 10000);

    return () => clearInterval(interval);
  }, [slides]);

  // Image preloading to prevent flickering
  useEffect(() => {
    slides.forEach((slide) => {
      const img = new Image();
      img.src = slide.url;
    });
  }, [slides]);

  // 2FA Handlers
  const submitTwoFa = async (codeToVerify?: string) => {
    const code = (codeToVerify !== undefined ? codeToVerify : (twoFaMethod === 'otp' ? twoFaPinSlots.join('') : twoFaRecoveryInput)).trim();
    
    if (twoFaMethod === 'otp') {
      if (!code || code.length < 6) {
        const msg = 'กรุณากรอกรหัส OTP ให้ครบทั้ง 6 หลัก';
        setTwoFaErrorMsg(msg);
        showToast('กรอกข้อมูลไม่ครบถ้วน', msg, 'warning');
        const emptyIdx = codeToVerify ? codeToVerify.length : twoFaPinSlots.findIndex(s => !s.trim());
        const focusIdx = emptyIdx >= 0 && emptyIdx < 6 ? emptyIdx : 0;
        twoFaPinInputRefs[focusIdx].current?.focus();
        return;
      }
    } else {
      if (!code) {
        const msg = 'กรุณากรอกรหัสสำรองความปลอดภัย (Backup Recovery Code)';
        setTwoFaErrorMsg(msg);
        showToast('แจ้งเตือน', msg, 'warning');
        return;
      }
    }

    setIs2FaSubmitting(true);
    setTwoFaErrorMsg(null);

    try {
      const response = await fetch(`${getApiBaseUrl()}/login.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify_2fa',
          username: twoFaUsername,
          code: code
        })
      });
      const data = await response.json();

      if (data.success && data.user) {
        setUser(data.user);
        localStorage.setItem('user', JSON.stringify(data.user));

        setLoginUsername('');
        setLoginPassword('');
        setIs2FaPending(false);
        setTwoFaUsername('');
        setTwoFaPinSlots(['', '', '', '', '', '']);
        setTwoFaRecoveryInput('');

        // Restore cached ownedGames and LUA map instantly on login if present
        const cachedGames = localStorage.getItem(`ownedGames_${data.user.username}`);
        const cachedLuaMap = localStorage.getItem(`luaExistsMap_${data.user.username}`);
        if (cachedGames) setOwnedGames(JSON.parse(cachedGames));
        if (cachedLuaMap) setLuaExistsMap(JSON.parse(cachedLuaMap));

        showToast('เข้าสู่ระบบสำเร็จ', 'ยืนยันตัวตนสำเร็จ ยินดีต้อนรับกลับ @' + (data.user.name || data.user.username), 'success');
        setActiveTab('home');
      } else {
        const errorText = data.message || (twoFaMethod === 'otp' 
          ? 'รหัสยืนยัน 2FA ไม่ถูกต้อง หรือหมดอายุแล้ว กรุณาลองใหม่อีกครั้ง' 
          : 'รหัสสำรองไม่ถูกต้อง หรือถูกใช้งานไปแล้ว');
        setTwoFaErrorMsg(errorText);
        showToast(twoFaMethod === 'otp' ? 'ยืนยันตัวตนไม่สำเร็จ' : 'รหัสสำรองไม่ถูกต้อง', errorText, 'error');
        if (twoFaMethod === 'otp') {
          setTwoFaPinSlots(['', '', '', '', '', '']);
          setTimeout(() => twoFaPinInputRefs[0].current?.focus(), 50);
        }
      }
    } catch (err) {
      console.error(err);
      const connErr = 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาติดต่อแอดมินเพื่อดำเนินการแก้ไข';
      setTwoFaErrorMsg(connErr);
      showToast('ข้อผิดพลาดการเชื่อมต่อ', connErr, 'error');
    } finally {
      setIs2FaSubmitting(false);
    }
  };

  const handleTwoFaPinChange = (index: number, val: string) => {
    const clean = val.replace(/\D/g, '');
    const char = clean ? clean[clean.length - 1] : '';
    const newSlots = [...twoFaPinSlots];
    newSlots[index] = char;
    setTwoFaPinSlots(newSlots);
    setTwoFaErrorMsg(null);

    if (char && index < 5) {
      twoFaPinInputRefs[index + 1].current?.focus();
      twoFaPinInputRefs[index + 1].current?.select();
    }

    const fullCode = newSlots.join('');
    if (fullCode.length === 6 && !newSlots.includes('')) {
      submitTwoFa(fullCode);
    }
  };

  const handleTwoFaPinKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !twoFaPinSlots[index] && index > 0) {
      const newSlots = [...twoFaPinSlots];
      newSlots[index - 1] = '';
      setTwoFaPinSlots(newSlots);
      twoFaPinInputRefs[index - 1].current?.focus();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      twoFaPinInputRefs[index - 1].current?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      twoFaPinInputRefs[index + 1].current?.focus();
    }
  };

  const handleTwoFaPinPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (text) {
      const newSlots = ['', '', '', '', '', ''];
      for (let i = 0; i < text.length; i++) {
        newSlots[i] = text[i];
      }
      setTwoFaPinSlots(newSlots);
      setTwoFaErrorMsg(null);
      const targetIdx = Math.min(text.length, 5);
      twoFaPinInputRefs[targetIdx].current?.focus();

      if (text.length === 6) {
        submitTwoFa(text);
      }
    }
  };

  // Handle Login Form Submission
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!loginUsername.trim() || !loginPassword) {
      const msg = 'กรุณากรอกชื่อผู้ใช้และรหัสผ่านให้ครบถ้วน';
      setErrorMsg(msg);
      showToast('กรอกข้อมูลไม่ครบถ้วน', msg, 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${getApiBaseUrl()}/login.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUsername.trim(), password: loginPassword })
      });
      const data = await response.json();

      if (data.success) {
        if (data.require_2fa) {
          setTwoFaUsername(data.username || loginUsername.trim());
          setIs2FaPending(true);
          setTwoFaMethod('otp');
          setTwoFaPinSlots(['', '', '', '', '', '']);
          setTwoFaRecoveryInput('');
          setTwoFaErrorMsg(null);
          showToast('ยืนยันตัวตน 2FA', 'บัญชีนี้เปิดใช้งาน 2FA กรุณากรอกรหัสจากแอป Authenticator', 'info');
          setTimeout(() => {
            twoFaPinInputRefs[0].current?.focus();
          }, 150);
          return;
        }

        if (data.user) {
          setUser(data.user);
          localStorage.setItem('user', JSON.stringify(data.user));
          setLoginUsername('');
          setLoginPassword('');

          // Restore cached ownedGames and LUA map instantly on login if present
          const cachedGames = localStorage.getItem(`ownedGames_${data.user.username}`);
          const cachedLuaMap = localStorage.getItem(`luaExistsMap_${data.user.username}`);
          if (cachedGames) setOwnedGames(JSON.parse(cachedGames));
          if (cachedLuaMap) setLuaExistsMap(JSON.parse(cachedLuaMap));

          showToast('เข้าสู่ระบบสำเร็จ', 'ยินดีต้อนรับกลับ @' + (data.user.name || data.user.username), 'success');
          setActiveTab('home');
        } else {
          setErrorMsg(data.message || 'เกิดข้อผิดพลาดในการโหลดโปรไฟล์ผู้ใช้งาน');
        }
      } else {
        setErrorMsg(data.message || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
      }
    } catch (err) {
      console.error(err);
      const connErr = 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาติดต่อแอดมินเพื่อดำเนินการแก้ไข';
      setErrorMsg(connErr);
      showToast('ข้อผิดพลาดการเชื่อมต่อ', connErr, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Registration Form Submission
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    // Validation: Username
    if (!registerUsername.trim()) {
      setErrorMsg('กรุณากรอกชื่อผู้ใช้งาน (Username)');
      return;
    }
    if (registerUsername.length < 3) {
      setErrorMsg('ชื่อผู้ใช้ (Username) ต้องมีความยาวอย่างน้อย 3 ตัวอักษร');
      return;
    }
    if (/\s/.test(registerUsername)) {
      setErrorMsg('ชื่อผู้ใช้ (Username) ห้ามมีช่องว่าง');
      return;
    }
    if (/[A-Z]/.test(registerUsername)) {
      setErrorMsg('ชื่อผู้ใช้ (Username) ต้องใช้ตัวอักษรพิมพ์เล็กเท่านั้น (ห้ามมีตัวพิมพ์ใหญ่)');
      return;
    }
    if (!/^[a-z0-9_.\-!@#$%^&*()+=~`{}[\]:;"'<>,.?/|\\]+$/.test(registerUsername)) {
      setErrorMsg('ชื่อผู้ใช้ (Username) ใช้ได้เฉพาะตัวอักษรพิมพ์เล็ก ตัวเลข และสัญลักษณ์');
      return;
    }

    // Validation: Display Name (No Thai)
    if (!registerDisplayName.trim()) {
      setErrorMsg('กรุณากรอกชื่อแสดงตัวตน (Display Name)');
      return;
    }
    if (registerDisplayName.trim().length < 2) {
      setErrorMsg('ชื่อแสดงตัวตนต้องมีความยาวอย่างน้อย 2 ตัวอักษร');
      return;
    }
    if (/[\u0E00-\u0E7F]/.test(registerDisplayName)) {
      setErrorMsg('ชื่อแสดงตัวตน (Display Name) ห้ามใช้ภาษาไทย (เช่น "Clint Eston")');
      return;
    }

    // Validation: Password (>= 8 chars, 1 english, 1 digit, 1 symbol)
    if (registerPassword.length < 8) {
      setErrorMsg('รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร');
      return;
    }
    if (!/[a-zA-Z]/.test(registerPassword)) {
      setErrorMsg('รหัสผ่านต้องมีตัวอักษรภาษาอังกฤษอย่างน้อย 1 ตัว');
      return;
    }
    if (!/[0-9]/.test(registerPassword)) {
      setErrorMsg('รหัสผ่านต้องมีตัวเลขอย่างน้อย 1 ตัว');
      return;
    }
    if (!/[^a-zA-Z0-9\s]/.test(registerPassword)) {
      setErrorMsg('รหัสผ่านต้องมีสัญลักษณ์พิเศษอย่างน้อย 1 ตัว (เช่น !@#$%^&*_)');
      return;
    }

    if (registerPassword !== registerConfirmPassword) {
      setErrorMsg('รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน');
      return;
    }

    // Validation: PIN (6 digits)
    if (registerRecoveryCode.length !== 6 || !/^\d{6}$/.test(registerRecoveryCode)) {
      setErrorMsg('PIN กู้คืนรหัสผ่านต้องเป็นตัวเลข 6 หลัก');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${getApiBaseUrl()}/register.php`, {
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
      const connErr = 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาติดต่อแอดมินเพื่อดำเนินการแก้ไข';
      setErrorMsg(connErr);
      showToast('ข้อผิดพลาดการเชื่อมต่อ', connErr, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyRecoveryCode = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!forgotUsername.trim() || !forgotRecoveryCode.trim()) {
      showToast('แจ้งเตือน', 'กรุณากรอกชื่อผู้ใช้และโค้ดยืนยันให้ครบถ้วน', 'warning');
      return;
    }

    setIsResetting(true);
    try {
      const response = await fetch(`${getApiBaseUrl()}/verify_recovery.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: forgotUsername.trim(),
          recovery_code: forgotRecoveryCode.trim()
        })
      });
      const data = await response.json();

      if (data.success) {
        setForgotStep(2);
        showToast('ตรวจสอบสำเร็จ', 'พบข้อมูลผู้ใช้งาน: @' + (data.username || forgotUsername.trim()), 'success');
      } else {
        const msg = data.message || 'ไม่พบข้อมูลดังกล่าวหรือไม่ถูกต้อง กรุณาตรวจสอบใหม่อีกครั้ง';
        showToast('ตรวจสอบไม่สำเร็จ', msg, 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('ข้อผิดพลาดการเชื่อมต่อ', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาติดต่อแอดมินเพื่อดำเนินการแก้ไข', 'error');
    } finally {
      setIsResetting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    setForgotTouchedFields({ newPassword: true, confirmPassword: true });
    validateForgotField('newPassword', forgotNewPassword);
    validateForgotField('confirmPassword', forgotConfirmPassword);

    if (!forgotNewPassword || !forgotConfirmPassword) {
      showToast('แจ้งเตือน', 'กรุณากรอกรหัสผ่านใหม่ให้ครบถ้วน', 'warning');
      return;
    }

    if (forgotNewPassword !== forgotConfirmPassword) {
      showToast('แจ้งเตือน', 'รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน', 'warning');
      return;
    }

    if (forgotNewPassword.length < 8) {
      showToast('แจ้งเตือน', 'รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 8 ตัวอักษร', 'warning');
      return;
    }

    if (!/[a-zA-Z]/.test(forgotNewPassword)) {
      showToast('แจ้งเตือน', 'รหัสผ่านใหม่ต้องมีตัวอักษรภาษาอังกฤษอย่างน้อย 1 ตัว', 'warning');
      return;
    }

    if (!/[0-9]/.test(forgotNewPassword)) {
      showToast('แจ้งเตือน', 'รหัสผ่านใหม่ต้องมีตัวเลขอย่างน้อย 1 ตัว', 'warning');
      return;
    }

    if (!/[^a-zA-Z0-9\s]/.test(forgotNewPassword)) {
      showToast('แจ้งเตือน', 'รหัสผ่านใหม่ต้องมีสัญลักษณ์พิเศษอย่างน้อย 1 ตัว (เช่น !@#$%^&*_)', 'warning');
      return;
    }

    setIsResetting(true);
    try {
      const response = await fetch(`${getApiBaseUrl()}/reset_password.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: forgotUsername.trim(),
          recovery_code: forgotRecoveryCode.trim(),
          new_password: forgotNewPassword,
          confirm_password: forgotConfirmPassword
        })
      });
      const data = await response.json();

      if (data.success) {
        closeForgotModalWithTransition(() => {
          setLoginUsername(forgotUsername.trim());
          showToast('ตั้งรหัสผ่านสำเร็จ', data.message || 'คุณสามารถเข้าสู่ระบบด้วยรหัสผ่านใหม่ได้ทันที', 'success');
        });
      } else {
        const msg = data.message || 'เกิดข้อผิดพลาดในการตั้งรหัสผ่านใหม่';
        showToast('บันทึกไม่สำเร็จ', msg, 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('ข้อผิดพลาดการเชื่อมต่อ', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาติดต่อแอดมินเพื่อดำเนินการแก้ไข', 'error');
    } finally {
      setIsResetting(false);
    }
  };

  const handleFinishOnboarding = () => {
    localStorage.setItem('hasSeenOnboarding', 'true');
    setActiveTab('login');
  };


  if (activeTab === 'onboarding') {
    const onboardingSlides = [
      {
        id: 'step-1',
        icon: (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-12 h-12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="6" y1="12" x2="10" y2="12"></line>
            <line x1="8" y1="10" x2="8" y2="14"></line>
            <line x1="15" y1="13" x2="15.01" y2="13"></line>
            <line x1="18" y1="11" x2="18.01" y2="11"></line>
            <rect x="2" y="6" width="20" height="12" rx="3" ry="3"></rect>
          </svg>
        ),
        title: 'DigiManager',
        description: 'จัดการคลังเกมในบัญชี DigiByte ของคุณได้ง่ายๆ กว่าที่เคยเป็น เพียงไม่กี่คลิก'
      },
      {
        id: 'step-2',
        icon: <Download className="w-11 h-11 stroke-[2.2]" />,
        title: 'ติดตั้งระบบง่ายๆ',
        description: 'ไม่ว่าจะติดตั้งระบบ อัพเดท หรือถอนการติดตั้งก็ทำได้แค่คลิกเดียว'
      },
      {
        id: 'step-3',
        icon: <RefreshCw className="w-10 h-10 stroke-[2.2]" />,
        title: 'ซื้อแล้วซิงค์',
        description: 'เกมที่ซื้อจะได้รับการซิงค์กับหน้าโปรแกรม รีดีมให้ถูกบัญชี และติดตั้งได้เลย'
      }
    ];

    const currentSlide = onboardingSlides[onboardingStep] || onboardingSlides[0];
    const isLastStep = onboardingStep === onboardingSlides.length - 1;

    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-zinc-950 text-zinc-100 font-sans p-6 text-center select-none relative overflow-hidden">
        {/* Decorative ambient glowing backgrounds */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-zinc-900/10 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-zinc-900/15 blur-[150px] pointer-events-none" />

        {/* Skip button top-right */}
        {!isLastStep && (
          <button
            onClick={handleFinishOnboarding}
            className="absolute top-6 right-8 text-xs font-semibold text-zinc-500 hover:text-zinc-300 transition-colors z-20 py-1.5 px-3 rounded-lg hover:bg-zinc-900/60"
          >
            ข้าม
          </button>
        )}

        <div className="max-w-2xl w-full flex flex-col items-center space-y-6 z-10 px-4">
          {/* Feature Icon Container */}
          <div
            key={`icon-${onboardingStep}`}
            className="w-20 h-20 rounded-2xl bg-zinc-100 text-zinc-950 flex items-center justify-center shadow-2xl shadow-white/10 animate-fade-slide-up flex-shrink-0"
          >
            {currentSlide.icon}
          </div>

          {/* Texts Section */}
          <div key={`text-${onboardingStep}`} className="space-y-2.5 animate-fade-slide-up min-h-[64px] flex flex-col items-center justify-center">
            <h1 className="text-3xl font-extrabold tracking-tight text-white leading-tight">
              {currentSlide.title}
            </h1>
            <p className="text-zinc-400 text-sm md:text-base leading-relaxed max-w-xl">
              {currentSlide.description}
            </p>
          </div>

          {/* Pagination dots */}
          <div className="flex items-center justify-center gap-2 pt-1">
            {onboardingSlides.map((slide, idx) => (
              <button
                key={slide.id}
                onClick={() => setOnboardingStep(idx)}
                aria-label={`ไปยังหน้าที่ ${idx + 1}`}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === onboardingStep
                    ? 'w-6 bg-zinc-100'
                    : 'w-1.5 bg-zinc-800 hover:bg-zinc-700'
                }`}
              />
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-center pt-2">
            {/* Back Button with smooth expand/collapse */}
            <div
              className={`overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                onboardingStep > 0 ? 'w-10 opacity-100 scale-100 mr-3' : 'w-0 opacity-0 scale-75 mr-0 pointer-events-none'
              }`}
            >
              <button
                onClick={() => setOnboardingStep(prev => Math.max(0, prev - 1))}
                className="w-10 h-10 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 rounded-xl flex items-center justify-center transition-all shadow-sm active:scale-95 flex-shrink-0"
                aria-label="ย้อนกลับ"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            </div>

            {/* Persistent Morphing Next / Finish Button */}
            <button
              onClick={() => {
                if (isLastStep) {
                  handleFinishOnboarding();
                } else {
                  setOnboardingStep(prev => prev + 1);
                }
              }}
              aria-label={isLastStep ? 'เริ่มต้นใช้งาน' : 'ถัดไป'}
              className={`h-10 bg-zinc-50 hover:bg-zinc-200 text-zinc-950 font-semibold rounded-xl flex items-center justify-center transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] shadow-sm active:scale-95 overflow-hidden ${
                isLastStep ? 'w-36 px-4' : 'w-10 px-0'
              }`}
            >
              <div className="flex items-center justify-center whitespace-nowrap">
                <span
                  className={`overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] text-xs font-semibold ${
                    isLastStep
                      ? 'max-w-[100px] opacity-100 mr-1.5 translate-x-0'
                      : 'max-w-0 opacity-0 mr-0 -translate-x-2'
                  }`}
                >
                  เริ่มต้นใช้งาน
                </span>
                <ArrowRight className="w-4 h-4 flex-shrink-0 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]" />
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex bg-zinc-950 text-zinc-100 font-sans relative">
      {/* Left panel: Carousel (hidden on mobile, shown on lg screens) */}
      <div className="hidden lg:flex flex-1 relative flex-col justify-end p-12 overflow-hidden bg-zinc-900 border-r border-zinc-800">
        <div className="absolute inset-0 w-full h-full overflow-hidden">
          {slides.map((slide, index) => (
            <div
              key={slide.url + '-' + index}
              className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ease-in-out ${
                index === currentSlideIndex ? 'opacity-100' : 'opacity-0'
              }`}
              style={{ backgroundImage: `url(${slide.url})` }}
            />
          ))}
        </div>

        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10 z-1 pointer-events-none" />

        {slides[currentSlideIndex] && (
          <div className="relative z-10 text-left max-w-[80%] animate-fade-slide-up">
            <span className="block text-sm text-zinc-400 font-medium mb-1 opacity-70">ภาพจาก</span>
            <h3 className="text-3xl font-extrabold text-white mb-2 leading-tight tracking-tight drop-shadow-md truncate">
              {slides[currentSlideIndex].game_title}
            </h3>
            {slides[currentSlideIndex].game_id ? (
              <button
                onClick={() => openUrl(`${getApiBaseUrl().replace('/api', '')}/details.php?id=${slides[currentSlideIndex].game_id}`)}
                className="inline-flex items-center gap-1.5 text-sm text-zinc-300 hover:text-white hover:underline transition-all duration-200"
              >
                <span>ดูรายละเอียด</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            ) : (
              <span className="text-sm text-zinc-400 opacity-60">
                ยินดีต้อนรับ
              </span>
            )}
          </div>
        )}

        {slides.length > 1 && (
          <div
            key={`progress-${currentSlideIndex}`}
            className="absolute bottom-0 left-0 h-1 bg-zinc-50 z-10"
            style={{
              animation: 'progressFlow 10000ms linear forwards'
            }}
          />
        )}
      </div>

      {/* Right panel: sliding login / register form */}
      <div className="w-full lg:w-[380px] h-full flex flex-col justify-center bg-[#0c0c0e]/95 border-l border-zinc-800 flex-shrink-0 relative overflow-hidden select-none">
        {!is2FaPending && (
          <button
            onClick={() => setActiveTab('onboarding')}
            className="absolute top-6 left-8 z-20 inline-flex items-center gap-2 text-xs font-semibold text-zinc-500 hover:text-zinc-300 transition-colors duration-200"
          >
            <ArrowRight className="w-3.5 h-3.5 rotate-180" />
            <span>กลับหน้าต้อนรับ</span>
          </button>
        )}

        <div
          className="flex w-[200%] h-full transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
          style={{
            transform: activeTab === 'register' ? 'translateX(-50%)' : 'translateX(0%)'
          }}
        >
          {/* LOGIN / 2FA FORM */}
          <div className="w-1/2 h-full flex flex-col justify-center px-8 relative overflow-y-auto">
            {is2FaPending ? (
              <div className="max-w-[324px] mx-auto w-full space-y-5 py-12 animate-fade-slide-up">
                <div className="flex flex-col items-center mb-1">
                  <div className="mb-2 text-emerald-400">
                    <ShieldCheck className="w-10 h-10 stroke-[1.75]" />
                  </div>
                  <h2 className="text-xl font-bold tracking-tight text-white text-center">ยืนยันตัวตน 2FA</h2>
                  <p className="text-zinc-500 text-xs text-center mt-1.5 leading-relaxed">
                    {twoFaMethod === 'otp'
                      ? 'กรอกรหัสยืนยัน 6 หลักจากแอป Authenticator'
                      : 'กรอกรหัสสำรองความปลอดภัย (Backup Recovery Code)'}
                  </p>
                </div>

                {twoFaErrorMsg && (
                  <div className="p-3 bg-rose-500/15 border border-rose-500/25 rounded-xl text-rose-400 text-xs font-semibold leading-relaxed animate-fade-slide-up flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{twoFaErrorMsg}</span>
                  </div>
                )}

                <form noValidate onSubmit={(e) => { e.preventDefault(); submitTwoFa(); }} className="space-y-4">
                  {twoFaMethod === 'otp' ? (
                    <div>
                      <div className="mb-2">
                        <label className="block text-xs font-medium text-zinc-400 text-center">
                          รหัส OTP 6 หลัก
                        </label>
                      </div>
                      <div className="flex items-center justify-center gap-1.5">
                        {twoFaPinSlots.map((digit, idx) => (
                          <React.Fragment key={idx}>
                            {idx === 3 && <span className="text-zinc-600 font-bold select-none">&ndash;</span>}
                            <input
                              ref={twoFaPinInputRefs[idx]}
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              maxLength={1}
                              value={digit}
                              onChange={(e) => handleTwoFaPinChange(idx, e.target.value)}
                              onKeyDown={(e) => handleTwoFaPinKeyDown(idx, e)}
                              onPaste={handleTwoFaPinPaste}
                              onFocus={(e) => e.target.select()}
                              className="w-10 h-11 text-center text-sm font-bold bg-zinc-950/80 border border-zinc-800 focus:border-zinc-500 rounded-xl text-zinc-100 placeholder-zinc-700 focus:outline-none transition-all"
                            />
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                        รหัสสำรอง (Backup Code)
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-500 pointer-events-none">
                          <KeyRound className="w-4 h-4" />
                        </span>
                        <input
                          type="text"
                          placeholder="เช่น A1B2-C3D4"
                          value={twoFaRecoveryInput}
                          onChange={(e) => {
                            setTwoFaRecoveryInput(e.target.value.toUpperCase());
                            setTwoFaErrorMsg(null);
                          }}
                          className="w-full pl-10 pr-4 py-2.5 bg-zinc-950/60 border border-zinc-800 focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700/50 rounded-xl text-zinc-200 placeholder-zinc-700 focus:outline-none transition-all text-xs font-mono tracking-wider"
                          autoFocus
                        />
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={is2FaSubmitting}
                    className="w-full py-2.5 bg-zinc-50 hover:bg-zinc-200 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-950 font-bold rounded-xl shadow-sm transition-all hover:translate-y-[-1px] active:translate-y-[0px] flex items-center justify-center gap-2 mt-4 text-xs"
                  >
                    {is2FaSubmitting ? 'กำลังตรวจสอบรหัส...' : 'ยืนยันและเข้าสู่ระบบ'}
                    {!is2FaSubmitting && <ArrowRight className="w-3.5 h-3.5" />}
                  </button>

                  {/* Switch method */}
                  <div className="pt-1 text-center">
                    {twoFaMethod === 'otp' ? (
                      <button
                        type="button"
                        onClick={() => {
                          setTwoFaMethod('recovery');
                          setTwoFaErrorMsg(null);
                        }}
                        className="text-[11px] text-zinc-400 hover:text-zinc-200 underline transition-colors"
                      >
                        ไม่สามารถเข้าถึงแอป? ใช้รหัสสำรอง (Backup Code)
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setTwoFaMethod('otp');
                          setTwoFaErrorMsg(null);
                        }}
                        className="text-[11px] text-zinc-400 hover:text-zinc-200 underline transition-colors"
                      >
                        ใช้รหัสจากแอป Authenticator (OTP 6 หลัก)
                      </button>
                    )}
                  </div>

                  <div className="pt-3 border-t border-zinc-800/40 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setIs2FaPending(false);
                        setTwoFaErrorMsg(null);
                        setErrorMsg(null);
                      }}
                      className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 font-medium transition-colors"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>ยกเลิกและกลับไปหน้าล็อกอิน</span>
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="max-w-[324px] mx-auto w-full space-y-6 py-12">
                <div className="flex flex-col items-center mb-2">
                  <div className="w-12 h-12 rounded-xl bg-zinc-100 text-zinc-950 flex items-center justify-center shadow-md mb-3 flex-shrink-0">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-7 h-7"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.3"
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
                  <h2 className="text-xl font-semibold tracking-tight text-white text-center">เข้าสู่ระบบ</h2>
                  <p className="text-zinc-500 text-xs text-center mt-1">ใช้บัญชีเข้าสู่ระบบเดียวกันกับหน้าร้านค้าเว็บ</p>
                </div>

                {activeTab === 'login' && errorMsg && (
                  <div className="p-3 bg-rose-500/15 border border-rose-500/25 rounded-xl text-rose-400 text-xs font-medium leading-relaxed animate-fade-slide-up flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <form noValidate onSubmit={handleLoginSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                      ชื่อผู้ใช้
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-500">
                        <User className="w-4 h-4" />
                      </span>
                      <input
                        type="text"
                        placeholder="ชื่อผู้ใช้งานของคุณ"
                        value={loginUsername}
                        onChange={(e) => setLoginUsername(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-zinc-950/60 border border-zinc-800 focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700/50 rounded-xl text-zinc-200 placeholder-zinc-700 focus:outline-none transition-all text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                      รหัสผ่าน
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-500">
                        <Lock className="w-4 h-4" />
                      </span>
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-zinc-950/60 border border-zinc-800 focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700/50 rounded-xl text-zinc-200 placeholder-zinc-700 focus:outline-none transition-all text-xs"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2.5 bg-zinc-50 hover:bg-zinc-200 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-950 font-semibold rounded-xl shadow-sm transition-all hover:translate-y-[-1px] active:translate-y-[0px] flex items-center justify-center gap-2 mt-6 text-xs"
                  >
                    {isSubmitting ? 'กำลังตรวจสอบสิทธิ์...' : 'เข้าสู่ระบบ'}
                    {!isSubmitting && <ArrowRight className="w-3.5 h-3.5" />}
                  </button>
                </form>

                <div className="pt-4 border-t border-zinc-800/40 text-center space-y-2">
                  <p className="text-zinc-500 text-xs">
                    ยังไม่มีบัญชีใช่หรือไม่?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setIs2FaPending(false);
                        setActiveTab('register');
                        setErrorMsg(null);
                        setSuccessMsg(null);
                      }}
                      className="text-zinc-300 hover:text-zinc-100 font-semibold transition-colors"
                    >
                      สมัครสมาชิกใหม่ที่นี่
                    </button>
                  </p>
                  <div>
                    <button
                      type="button"
                      onClick={() => openForgotModal(loginUsername)}
                      className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                      ลืมรหัสผ่าน?
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* REGISTER FORM */}
          <div className="w-1/2 h-full flex flex-col justify-center px-8 relative overflow-y-auto">
            <div className="max-w-[324px] mx-auto w-full space-y-5 py-12">
              <div className="flex flex-col items-center mb-2">
                <div className="w-12 h-12 rounded-xl bg-zinc-100 text-zinc-950 flex items-center justify-center shadow-md mb-3 flex-shrink-0">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-7 h-7"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.3"
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
                <h2 className="text-xl font-semibold tracking-tight text-white text-center">สมัครสมาชิกใหม่</h2>
                <p className="text-zinc-500 text-xs text-center mt-1">ข้อมูลบัญชีนี้จะล็อกอินบนหน้าร้านค้าเว็บได้เช่นกัน</p>
              </div>

              {activeTab === 'register' && errorMsg && (
                <div className="p-3 bg-rose-500/15 border border-rose-500/25 rounded-xl text-rose-400 text-xs font-semibold leading-relaxed animate-fade-slide-up flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {activeTab === 'register' && successMsg && (
                <div className="p-3 bg-emerald-500/15 border border-emerald-500/25 rounded-xl text-emerald-400 text-xs font-semibold leading-relaxed animate-fade-slide-up flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-400" />
                  <span>{successMsg}</span>
                </div>
              )}

              <form noValidate onSubmit={handleRegisterSubmit} className="space-y-3">
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <label className="block text-xs font-medium text-zinc-400">
                      ชื่อผู้ใช้ (Username)
                    </label>
                    <InfoTooltip
                      content="ใส่ชื่อผู้ใช้ที่ต้องการ นำไปใช้ล็อคอินและอ้างอิงได้ ไม่สามารถซ้ำกับบัญชีอื่นได้ และไม่สามารถเปลี่ยนได้ในภายหลัง"
                      side="top"
                      align="center"
                    />
                  </div>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-500 pointer-events-none">
                      <User className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      placeholder="ชื่อผู้ใช้ ไม่สามารถเปลี่ยนได้ภายหลัง"
                      value={registerUsername}
                      onChange={(e) => handleChangeField('username', e.target.value, setRegisterUsername)}
                      onBlur={() => handleBlurField('username', registerUsername)}
                      className={`w-full pl-10 pr-9 py-2 bg-zinc-950/60 border ${fieldErrors.username && touchedFields.username ? 'border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500/50' : 'border-zinc-800 focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700/50'} rounded-xl text-zinc-200 placeholder-zinc-700 focus:outline-none transition-all text-xs`}
                    />
                    {fieldErrors.username && touchedFields.username && (
                      <div className="absolute right-2.5 inset-y-0 flex items-center z-10">
                        <Tooltip
                          content={fieldErrors.username}
                          side="top"
                          align="end"
                          className="text-rose-300 border-rose-900/50"
                        >
                          <div className="text-red-500 hover:text-red-400 cursor-help transition-colors">
                            <AlertCircle className="w-3.5 h-3.5" />
                          </div>
                        </Tooltip>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <label className="block text-xs font-medium text-zinc-400">
                      ชื่อที่ใช้แสดง
                    </label>
                    <InfoTooltip
                      content="เป็นชื่อที่ใช้แสดงสำหรับบัญชีของคุณเท่านั้น ไม่มีผลกับอย่างอื่น สามารถใช้ช่องว่างได้ ใช้ภาษาไทยไม่ได้"
                      side="top"
                      align="center"
                    />
                  </div>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-500 pointer-events-none">
                      <Sparkles className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      placeholder="เว้นวรรคได้ ใช้ภาษาไทยไม่ได้"
                      value={registerDisplayName}
                      onChange={(e) => handleChangeField('displayName', e.target.value, setRegisterDisplayName)}
                      onBlur={() => handleBlurField('displayName', registerDisplayName)}
                      className={`w-full pl-10 pr-9 py-2 bg-zinc-950/60 border ${fieldErrors.displayName && touchedFields.displayName ? 'border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500/50' : 'border-zinc-800 focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700/50'} rounded-xl text-zinc-200 placeholder-zinc-700 focus:outline-none transition-all text-xs`}
                    />
                    {fieldErrors.displayName && touchedFields.displayName && (
                      <div className="absolute right-2.5 inset-y-0 flex items-center z-10">
                        <Tooltip
                          content={fieldErrors.displayName}
                          side="top"
                          align="end"
                          className="text-rose-300 border-rose-900/50"
                        >
                          <div className="text-red-500 hover:text-red-400 cursor-help transition-colors">
                            <AlertCircle className="w-3.5 h-3.5" />
                          </div>
                        </Tooltip>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <div className="flex items-center gap-1 mb-1">
                      <label className="block text-xs font-medium text-zinc-400">
                        รหัสผ่าน
                      </label>
                      <InfoTooltip
                        content={renderPasswordCriteria(registerPassword)}
                        side="top"
                        align="center"
                      />
                    </div>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-500 pointer-events-none">
                        <Lock className="w-3.5 h-3.5" />
                      </span>
                      <input
                        type="password"
                        placeholder="รหัสผ่านที่ต้องการ"
                        value={registerPassword}
                        onChange={(e) => handleChangeField('password', e.target.value, setRegisterPassword)}
                        onBlur={() => handleBlurField('password', registerPassword)}
                        className={`w-full pl-8 pr-8 py-2 bg-zinc-950/60 border ${fieldErrors.password && touchedFields.password ? 'border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500/50' : 'border-zinc-800 focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700/50'} rounded-xl text-zinc-200 placeholder-zinc-700 focus:outline-none transition-all text-xs`}
                      />
                      {fieldErrors.password && touchedFields.password && (
                        <div className="absolute right-2 inset-y-0 flex items-center z-10">
                          <Tooltip content={renderPasswordCriteria(registerPassword)} side="top" align="end">
                            <div className="text-red-500 hover:text-red-400 cursor-help transition-colors">
                              <AlertCircle className="w-3.5 h-3.5" />
                            </div>
                          </Tooltip>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-1 mb-1">
                      <label className="block text-xs font-medium text-zinc-400">
                        ยืนยันรหัสผ่าน
                      </label>
                      <InfoTooltip
                        content={renderConfirmPasswordCriteria(registerPassword, registerConfirmPassword)}
                        side="top"
                        align="center"
                      />
                    </div>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-500 pointer-events-none">
                        <Lock className="w-3.5 h-3.5" />
                      </span>
                      <input
                        type="password"
                        placeholder="ยืนยันรหัสผ่านอีกครั้ง"
                        value={registerConfirmPassword}
                        onChange={(e) => handleChangeField('confirmPassword', e.target.value, setRegisterConfirmPassword)}
                        onBlur={() => handleBlurField('confirmPassword', registerConfirmPassword)}
                        className={`w-full pl-8 pr-8 py-2 bg-zinc-950/60 border ${fieldErrors.confirmPassword && touchedFields.confirmPassword ? 'border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500/50' : 'border-zinc-800 focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700/50'} rounded-xl text-zinc-200 placeholder-zinc-700 focus:outline-none transition-all text-xs`}
                      />
                      {fieldErrors.confirmPassword && touchedFields.confirmPassword && (
                        <div className="absolute right-2 inset-y-0 flex items-center z-10">
                          <Tooltip
                            content={renderConfirmPasswordCriteria(registerPassword, registerConfirmPassword)}
                            side="top"
                            align="end"
                            className="text-rose-300 border-rose-900/50"
                          >
                            <div className="text-red-500 hover:text-red-400 cursor-help transition-colors">
                              <AlertCircle className="w-3.5 h-3.5" />
                            </div>
                          </Tooltip>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5 text-center">
                    PIN กู้คืนรหัสผ่าน (ตัวเลข 6 หลัก)
                  </label>
                  <div className="flex items-center justify-center gap-1.5">
                    {registerPinSlots.map((digit, idx) => (
                      <React.Fragment key={idx}>
                        {idx === 3 && <span className="text-zinc-600 font-bold select-none">&ndash;</span>}
                        <input
                          ref={pinInputRefs[idx]}
                          type="password"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={1}
                          autoComplete="off"
                          value={digit}
                          onChange={(e) => handlePinChange(idx, e.target.value)}
                          onKeyDown={(e) => handlePinKeyDown(idx, e)}
                          onPaste={handlePinPaste}
                          onFocus={(e) => e.target.select()}
                          className="pin-mask-circle w-10 h-11 text-center text-lg font-bold bg-zinc-950/80 border border-zinc-800 focus:border-zinc-500 rounded-xl text-zinc-100 placeholder-zinc-700 focus:outline-none transition-all"
                        />
                      </React.Fragment>
                    ))}
                  </div>
                  <div className="flex items-center justify-center gap-1 mt-1.5 text-[9.5px] text-zinc-500 text-center leading-tight">
                    <Info className="w-3 h-3 flex-shrink-0 opacity-70" />
                    <span>กำหนด PIN ตัวเลข 6 หลัก สำหรับใช้กู้คืนรหัสผ่านด้วยตัวเองเมื่อลืมรหัส</span>
                  </div>
                </div>


                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 bg-zinc-50 hover:bg-zinc-200 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-950 font-bold rounded-xl shadow-sm transition-all hover:translate-y-[-1px] active:translate-y-[0px] flex items-center justify-center gap-2 mt-5 text-xs"
                >
                  {isSubmitting ? 'กำลังบันทึกข้อมูล...' : 'สมัครสมาชิกและเข้าใช้'}
                  {!isSubmitting && <ArrowRight className="w-3.5 h-3.5" />}
                </button>
              </form>

              <div className="pt-4 border-t border-zinc-800/40 text-center">
                <p className="text-zinc-500 text-xs">
                  มีบัญชีอยู่แล้วใช่ไหม?{' '}
                  <button
                    onClick={() => {
                      setActiveTab('login');
                      setErrorMsg(null);
                      setSuccessMsg(null);
                    }}
                    className="text-zinc-300 hover:text-zinc-100 font-semibold transition-colors"
                  >
                    เข้าสู่ระบบตรงนี้
                  </button>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Forgot Password Reset Modal (Global Modal Structure & Smooth Transitions) */}
      {showForgotModal && (
        <div 
          className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs ${isForgotModalClosing ? 'animate-backdrop-out' : 'animate-backdrop-in'}`}
        >
          <div 
            className={`max-w-sm w-full bg-zinc-950/95 border border-zinc-800/80 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl mx-4 transition-all duration-300 flex flex-col font-sans relative ${isForgotModalClosing ? 'animate-modal-out' : 'animate-modal-in'}`} 
          >
            {/* Close Button */}
            <button
              onClick={() => closeForgotModalWithTransition()}
              className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-300 p-1.5 rounded-lg hover:bg-zinc-800/60 transition-colors z-10 cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Centered Header with Shadcn Zinc Icon */}
            <div className="pt-6 pb-2 px-6 text-center">
              <div className="w-11 h-11 mx-auto mb-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 flex items-center justify-center shadow-sm">
                <KeyRound className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-zinc-100 tracking-tight mb-1">กู้คืนรหัสผ่าน</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                {forgotStep === 1
                  ? 'กรอก Username และโค้ดยืนยันที่คุณตั้งไว้ตอนสมัคร'
                  : `กำหนดรหัสผ่านใหม่สำหรับ @${forgotUsername}`}
              </p>
            </div>

            {/* Minimalist 1 - 2 Stepper Bar */}
            <div className="w-24 mx-auto my-2 flex items-center justify-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${forgotStep === 1 ? 'bg-zinc-100 text-zinc-950' : 'bg-zinc-800 text-zinc-100'}`}>
                {forgotStep === 2 ? <Check className="w-3.5 h-3.5 stroke-[2.5]" /> : '1'}
              </div>
              <div className={`flex-1 h-[2px] rounded-full transition-all ${forgotStep === 2 ? 'bg-zinc-600' : 'bg-zinc-800'}`} />
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${forgotStep === 2 ? 'bg-zinc-100 text-zinc-950' : 'bg-zinc-900 border border-zinc-800 text-zinc-600'}`}>
                2
              </div>
            </div>

            {/* STEP 1: Verify Username & Recovery Code */}
            {forgotStep === 1 && (
              <form noValidate onSubmit={handleVerifyRecoveryCode} className="p-6 pt-2 space-y-3.5 animate-fade-slide-up">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                    ชื่อผู้ใช้งาน (Username)
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-500">
                      <User className="w-3.5 h-3.5" />
                    </span>
                    <input
                      type="text"
                      placeholder="เช่น gamer01"
                      value={forgotUsername}
                      onChange={(e) => setForgotUsername(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 bg-zinc-950/80 border border-zinc-800 focus:border-zinc-600 rounded-xl text-zinc-200 placeholder-zinc-600 text-xs focus:outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5 text-center">
                    PIN กู้คืนรหัสผ่าน (ตัวเลข 6 หลัก)
                  </label>
                  <div className="flex items-center justify-center gap-1.5">
                    {forgotPinSlots.map((digit, idx) => (
                      <React.Fragment key={idx}>
                        {idx === 3 && <span className="text-zinc-600 font-bold select-none">&ndash;</span>}
                        <input
                          ref={forgotPinInputRefs[idx]}
                          type="password"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={1}
                          autoComplete="off"
                          value={digit}
                          onChange={(e) => handleForgotPinChange(idx, e.target.value)}
                          onKeyDown={(e) => handleForgotPinKeyDown(idx, e)}
                          onPaste={handleForgotPinPaste}
                          onFocus={(e) => e.target.select()}
                          className="pin-mask-circle w-10 h-11 text-center text-lg font-bold bg-zinc-950/80 border border-zinc-800 focus:border-zinc-500 rounded-xl text-zinc-100 placeholder-zinc-700 focus:outline-none transition-all"
                        />
                      </React.Fragment>
                    ))}
                  </div>
                  <p className="text-[10px] text-zinc-400 text-center mt-1.5 leading-normal">
                    ใช้สำหรับยืนยันตัวตนเพื่อกู้คืนบัญชีเมื่อลืมรหัสผ่าน
                  </p>
                </div>

                <div className="pt-2 flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => closeForgotModalWithTransition()}
                    className="flex-1 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-semibold rounded-xl text-xs transition-colors border border-zinc-800 cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={isResetting}
                    className="flex-[1.25] py-2.5 bg-zinc-50 hover:bg-zinc-200 text-zinc-950 font-bold rounded-xl text-xs transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                  >
                    {isResetting ? 'กำลังตรวจสอบ...' : 'ตรวจสอบข้อมูล'}
                  </button>
                </div>
              </form>
            )}

            {/* STEP 2: Set New Password */}
            {forgotStep === 2 && (
              <form noValidate onSubmit={handleResetPassword} className="p-6 pt-2 space-y-3.5 animate-fade-slide-up">
                <div>
                  <div className="flex items-center gap-1 mb-1">
                    <label className="block text-xs font-medium text-zinc-400">
                      รหัสผ่านใหม่ (New Password)
                    </label>
                    <InfoTooltip
                      content={renderPasswordCriteria(forgotNewPassword)}
                      side="top"
                      align="center"
                    />
                  </div>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-500 pointer-events-none">
                      <Lock className="w-3.5 h-3.5" />
                    </span>
                    <input
                      type="password"
                      placeholder="รหัสผ่านที่ต้องการ"
                      value={forgotNewPassword}
                      onChange={(e) => handleChangeForgotField('newPassword', e.target.value, setForgotNewPassword)}
                      onBlur={() => handleBlurForgotField('newPassword', forgotNewPassword)}
                      className={`w-full pl-8 pr-8 py-2 bg-zinc-950/80 border ${forgotFieldErrors.newPassword && forgotTouchedFields.newPassword ? 'border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500/50' : 'border-zinc-800 focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700/50'} rounded-xl text-zinc-200 placeholder-zinc-600 text-xs focus:outline-none transition-all`}
                      autoFocus
                    />
                    {forgotFieldErrors.newPassword && forgotTouchedFields.newPassword && (
                      <div className="absolute right-2 inset-y-0 flex items-center z-10">
                        <Tooltip content={renderPasswordCriteria(forgotNewPassword)} side="top" align="end">
                          <div className="text-red-500 hover:text-red-400 cursor-help transition-colors">
                            <AlertCircle className="w-3.5 h-3.5" />
                          </div>
                        </Tooltip>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-1 mb-1">
                    <label className="block text-xs font-medium text-zinc-400">
                      ยืนยันรหัสผ่านใหม่ (Confirm New Password)
                    </label>
                    <InfoTooltip
                      content={renderConfirmPasswordCriteria(forgotNewPassword, forgotConfirmPassword)}
                      side="top"
                      align="center"
                    />
                  </div>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-500 pointer-events-none">
                      <Lock className="w-3.5 h-3.5" />
                    </span>
                    <input
                      type="password"
                      placeholder="ยืนยันรหัสผ่านใหม่อีกครั้ง"
                      value={forgotConfirmPassword}
                      onChange={(e) => handleChangeForgotField('confirmPassword', e.target.value, setForgotConfirmPassword)}
                      onBlur={() => handleBlurForgotField('confirmPassword', forgotConfirmPassword)}
                      className={`w-full pl-8 pr-8 py-2 bg-zinc-950/80 border ${forgotFieldErrors.confirmPassword && forgotTouchedFields.confirmPassword ? 'border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500/50' : 'border-zinc-800 focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700/50'} rounded-xl text-zinc-200 placeholder-zinc-600 text-xs focus:outline-none transition-all`}
                    />
                    {forgotFieldErrors.confirmPassword && forgotTouchedFields.confirmPassword && (
                      <div className="absolute right-2 inset-y-0 flex items-center z-10">
                        <Tooltip
                          content={renderConfirmPasswordCriteria(forgotNewPassword, forgotConfirmPassword)}
                          side="top"
                          align="end"
                          className="text-rose-300 border-rose-900/50"
                        >
                          <div className="text-red-500 hover:text-red-400 cursor-help transition-colors">
                            <AlertCircle className="w-3.5 h-3.5" />
                          </div>
                        </Tooltip>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2 flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => closeForgotModalWithTransition()}
                    className="flex-1 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-semibold rounded-xl text-xs transition-colors border border-zinc-800 cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={isResetting}
                    className="flex-[1.25] py-2.5 bg-zinc-50 hover:bg-zinc-200 text-zinc-950 font-bold rounded-xl text-xs transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                  >
                    {isResetting ? 'กำลังบันทึก...' : 'บันทึกรหัสผ่านใหม่'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
