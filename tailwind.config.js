/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                // กำหนดให้ Geist เป็นหลักสำหรับ EN และ Noto Sans Thai สำหรับ TH
                sans: ['Geist', 'Noto Sans Thai', 'sans-serif'],
            },
        },
    },
    plugins: [],
}