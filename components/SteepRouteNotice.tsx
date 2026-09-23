import { bannedPlacesForCar, type CarRouteRule, type TripPlaceView } from "@/lib/trip-plans";

/**
 * ประกาศบนหน้าจอง — รายชื่อสถานที่ที่รถคันนี้ห้ามไป พร้อมค่าปรับ
 * ขึ้นทุกครั้งที่รถมีข้อห้าม ไม่ต้องรอลูกค้าเลือกสถานที่
 * เพราะลูกค้าบางคนไม่กรอกตรง ๆ แต่ต้องรู้ก่อนว่าถ้าแอบไปจะโดนปรับ
 */
export default function SteepRouteNotice({
  places,
  car,
  penalty,
}: {
  places: TripPlaceView[];
  car: CarRouteRule;
  penalty: number;
}) {
  const banned = bannedPlacesForCar(places, car);
  if (banned.length === 0) return null;
  const strict = Boolean(car.noSteepRoutes);
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 leading-relaxed">
      <p className="font-semibold">
        ⛔ {strict ? "รถคันนี้ห้ามขึ้นดอยและเส้นทางชันมาก" : "รถคันนี้ห้ามไปเส้นทางที่ต้องใช้รถยกสูง"}
      </p>
      <p className="mt-1">ได้แก่ {banned.map((p) => p.name).join(" · ")}</p>
      <p className="mt-1">
        หากต้องการไปเส้นทางเหล่านี้ กรุณาเลือกรถคันอื่น · หากจองแล้วนำรถไปเส้นทางดังกล่าว
        มีค่าปรับ <b>{penalty.toLocaleString()} บาท</b>
      </p>
    </div>
  );
}
