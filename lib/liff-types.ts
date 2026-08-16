/** ชนิดข้อมูลของ LIFF SDK ที่เราใช้ — ประกาศไว้ที่เดียวกันทุกหน้า */
export type Liff = {
  init: (config: { liffId: string }) => Promise<void>;
  isLoggedIn: () => boolean;
  login: (config?: { redirectUri?: string }) => void;
  getIDToken: () => string | null;
  closeWindow: () => void;
  isInClient: () => boolean;
};

declare global {
  interface Window {
    liff?: Liff;
  }
}
