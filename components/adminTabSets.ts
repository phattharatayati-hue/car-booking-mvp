import type { TabItem } from "@/components/AdminTabs";

/** รถและเจ้าของรถ — รถพาร์ทเนอร์โผล่ทั้งสองหน้า จึงต้องเดินไปมาได้ */
export const FLEET_TABS: TabItem[] = [
  { href: "/admin/cars", label: "รถทั้งหมด" },
  { href: "/admin/partners", label: "เจ้าของรถพาร์ทเนอร์" },
];

/** ราคาและเงื่อนไข — ตั้งครั้งเดียวแล้วแทบไม่แตะอีก จึงไม่ควรกินเมนูหลักสามช่อง */
export const SETTINGS_TABS: TabItem[] = [
  { href: "/admin/settings", label: "ตั้งค่าระบบ" },
  { href: "/admin/pickup-points", label: "จุดรับ-ส่งรถ" },
  { href: "/admin/after-hours", label: "ค่าบริการนอกเวลา" },
];
