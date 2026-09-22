/**
 * DigiManager Launcher Configuration File
 * 
 * ไฟล์นี้ใช้สำหรับการตั้งค่าและปรับเปลี่ยน URL เชื่อมต่อของระบบ API ฝั่งเว็บไซต์หลัก
 * แก้ไขค่าในไฟล์นี้ให้ถูกต้องก่อนทำการ Compile ตัวโปรแกรมเดสก์ท็อป (npm run build / tauri build)
 */

// 1. URL ของ API บนเว็บไซต์หลัก (สำหรับใช้ติดต่อระบบฐานข้อมูลล็อกอิน ซิงค์ข้อมูล และคลังเกม)
// - ช่วงพัฒนาโปรแกรม (Local XAMPP): 'http://localhost/D/api'
// - ตอนขึ้นเซิร์ฟเวอร์จริง (Production): 'https://yourwebsite.com/api' (เปลี่ยนเป็นโดเมนของคุณ)
export const API_BASE_URL = 'https://deeanna-benchless-roxie.ngrok-free.dev/D/api';

// เวอร์ชันปัจจุบันของโปรแกรมเดสก์ท็อป DigiManager
export const APP_VERSION = '0.2';


