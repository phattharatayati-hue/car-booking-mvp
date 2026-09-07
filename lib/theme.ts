/**
 * โหมดสว่าง/มืด
 *
 * มีสองค่าเท่านั้น — สว่าง กับ มืด
 * ครั้งแรกที่เข้าเว็บจะดูการตั้งค่าเครื่องให้ว่ามืดหรือสว่าง แล้วใช้ค่านั้น
 * พอผู้ใช้กดปุ่มเอง ถือเป็นการเลือกเด็ดขาด จำไว้ในเครื่องนั้นและไม่ตามเครื่องอีก
 *
 * เก็บใน localStorage ของเบราว์เซอร์ ไม่เก็บลงฐานข้อมูล
 * เพราะเป็นความชอบต่อเครื่อง ไม่ใช่ข้อมูลบัญชี
 */
export type ThemeChoice = "light" | "dark";

export const THEME_KEY = "phuping-theme";

/** สคริปต์ที่ต้องรันก่อนหน้าเว็บวาด ไม่งั้นจะเห็นหน้าขาวแวบก่อนเป็นสีมืด */
export const THEME_INIT_SCRIPT = `
(function(){
  var v;
  try{ v = localStorage.getItem('${THEME_KEY}'); }catch(e){}
  if (v !== 'light' && v !== 'dark') {
    // ยังไม่เคยเลือก — ดูการตั้งค่าเครื่องเป็นค่าเริ่มต้น
    try{
      v = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }catch(e){ v = 'light'; }
  }
  document.documentElement.setAttribute('data-theme', v);
  // เปิด transition หลังตั้งค่าเสร็จ กันสีไล่ตอนโหลดหน้าแรก
  requestAnimationFrame(function(){
    document.documentElement.classList.add('theme-ready');
  });
})();
`;
