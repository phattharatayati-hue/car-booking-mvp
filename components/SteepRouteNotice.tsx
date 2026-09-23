import type { TripPlaceView } from "@/lib/trip-plans";

/**
 * ประกาศบนหน้าจองของรถที่ห้ามขึ้นเส้นทางชันมาก — ขึ้นทุกครั้ง ไม่ต้องรอลูกค้าเลือกสถานที่
 * เพราะลูกค้าบางคนไม่กรอกตรง ๆ แต่ต้องรู้ก่อนว่าถ้าแอบไปจะโดนปรับ
 */
export default function SteepRouteNotice({
  places,
  penalty,
}: {
  places: TripPlaceView[];
  penalty: number;
}) {
  const steep = places.filter((p) => p.steep);
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 leading-relaxed">
      <p className="font-semibold">⛔ รถคันนี้ห้ามขึ้นดอยและเส้นทางชันมาก</p>
      {steep.length > 0 && <p className="mt-1">ได้แก่ {steep.map((p) => p.name).join(" · ")}</p>}
      <p className="mt-1">
        หากต้องการไปเส้นทางเหล่านี้ กรุณาเลือกรถคันอื่น · หากจองแล้วนำรถไปเส้นทางชัน
        มีค่าปรับ <b>{penalty.toLocaleString()} บาท</b>
      </p>
    </div>
  );
}
