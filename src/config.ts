/**
 * DigiManager Launcher Configuration File
 *
 * ไฟล์นี้รองรับทั้ง Default URL, Caching ในเครื่อง และการดึง URL ล่าสุดจาก GitHub Raw / Remote Pointer
 * ทำให้แอดมินสามารถเปลี่ยน Domain / Tunnel URL ผ่านหน้าเว็บ Admin ได้โดยผู้ใช้ไม่ต้องโหลดบิลด์ใหม่
 */

// 1. Fallback URL ค่าเริ่มต้น (หากยังไม่เคยต่อเน็ตหรืออ่านจากคลาวด์ไม่ได้)
export const DEFAULT_API_BASE_URL = 'https://old-leu-pharmacology-excited.trycloudflare.com/D/api';

// 2. URL สำหรับชี้เป้า API จาก GitHub Raw (Zero-Rebuild Dynamic Resolution)
export const REMOTE_ENDPOINT_URL = 'https://raw.githubusercontent.com/DigiByte-PC/DigiManager/main/endpoint.json';
export const REMOTE_ENDPOINT_FALLBACK = 'https://raw.githubusercontent.com/TheDigiByte/DigiManager/main/endpoint.json';

// Local Storage Key สำหรับบันทึก URL ปัจจุบัน
const STORAGE_KEY = 'digimanager_api_url';

/**
 * ดึงค่า URL เริ่มต้นจาก localStorage หรือค่า Default
 */
function getInitialApiBaseUrl(): string {
  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached && typeof cached === 'string' && cached.startsWith('http')) {
      return cached.trim().replace(/\/+$/, '');
    }
  } catch {}
  return DEFAULT_API_BASE_URL;
}

// Active dynamic API Base URL
export let API_BASE_URL = getInitialApiBaseUrl();

// เวอร์ชันปัจจุบันของโปรแกรมเดสก์ท็อป DigiManager
export const APP_VERSION = '0.2';

/**
 * ดึง API Base URL ที่กำลังใช้งานอยู่
 */
export function getApiBaseUrl(): string {
  return API_BASE_URL;
}

/**
 * กำหนดและบันทึก API Base URL ลงใน Local Storage
 */
export function setApiBaseUrl(newUrl: string): string {
  const clean = (newUrl || '').trim().replace(/\/+$/, '');
  if (clean && clean.startsWith('http')) {
    API_BASE_URL = clean;
    try {
      localStorage.setItem(STORAGE_KEY, clean);
    } catch {}
  }
  return API_BASE_URL;
}

/**
 * ฟังก์ชันดึง Server Endpoint จาก GitHub Raw / Cloud อัตโนมัติเมื่อเปิดโปรแกรม
 * มี Timeout สั้นๆ เพื่อไม่ให้หน่วงหน้าจอ และเซฟลงแคชทันที
 */
export async function resolveApiEndpoint(): Promise<string> {
  const urlsToTry = [REMOTE_ENDPOINT_URL, REMOTE_ENDPOINT_FALLBACK];

  for (const targetUrl of urlsToTry) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 วินาที

      const res = await fetch(`${targetUrl}?_t=${Date.now()}`, {
        signal: controller.signal,
        cache: 'no-store'
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data && typeof data.api_url === 'string' && data.api_url.startsWith('http')) {
          const resolved = data.api_url.trim().replace(/\/+$/, '');
          if (resolved) {
            setApiBaseUrl(resolved);
            console.log(`[DigiManager] Auto-resolved API URL: ${resolved}`);
            return resolved;
          }
        }
      }
    } catch (e) {
      // ข้ามไปลอง URL ถัดไปหรือใช้แคช
    }
  }

  return API_BASE_URL;
}
