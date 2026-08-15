import Link from "next/link";
import Image from "next/image";

type CarCardProps = {
  car: {
    id: string;
    name: string;
    brand: string;
    pricePerDay: number;
    photoUrl: string | null;
    source: string;
    licensePlate: string;
  };
};

export default function CarCard({ car }: CarCardProps) {
  return (
    <div className="group bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col hover:shadow-lg hover:shadow-slate-200/60 hover:-translate-y-0.5 transition-all duration-200">
      <div className="relative w-full aspect-[4/3] bg-slate-100 overflow-hidden">
        {car.photoUrl ? (
          <Image
            src={car.photoUrl}
            alt={`${car.brand} ${car.name}`}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            unoptimized
          />
        ) : (
          <div className="w-full h-full grid place-items-center text-slate-300">
            <svg viewBox="0 0 24 24" fill="none" className="w-12 h-12">
              <path
                d="M5 11l1.5-4.5A2 2 0 018.4 5h7.2a2 2 0 011.9 1.5L19 11m-14 0h14m-14 0a1 1 0 00-1 1v4h2m13-5a1 1 0 011 1v4h-2m0 0H7"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        )}

        {car.source === "PARTNER" && (
          <span className="absolute top-3 left-3 text-[11px] font-medium px-2 py-1 rounded-full bg-white/95 text-slate-700 shadow-sm">
            รถพาร์ทเนอร์
          </span>
        )}
      </div>

      <div className="p-5 flex flex-col flex-1">
        <p className="text-xs text-slate-500 mb-0.5">{car.brand}</p>
        <h3 className="font-semibold text-slate-900 text-lg leading-snug">{car.name}</h3>

        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-slate-400">
              <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
            </svg>
            รับรถได้ทันที
          </span>
          <span className="inline-flex items-center gap-1.5">
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-slate-400">
              <path
                d="M9 12l2 2 4-4"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
            </svg>
            ประกันชั้น 1
          </span>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-100 flex items-end justify-between gap-3">
          <div>
            <span className="text-2xl font-bold text-slate-900">
              {car.pricePerDay.toLocaleString()}
            </span>
            <span className="text-sm text-slate-500"> ฿/วัน</span>
          </div>
          <Link
            href={`/cars/${car.id}/book`}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm shadow-blue-600/25 transition-colors"
          >
            จองรถ
          </Link>
        </div>
      </div>
    </div>
  );
}
