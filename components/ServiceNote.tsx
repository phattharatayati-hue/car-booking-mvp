/**
 * เงื่อนไขการให้บริการที่แอดมินตั้งเองได้ในหลังบ้าน
 * ไม่แสดงอะไรเลยถ้าแอดมินเว้นว่างไว้
 */
export default function ServiceNote({
  note,
  className = "",
}: {
  note: string;
  className?: string;
}) {
  const text = note.trim();
  if (!text) return null;

  return (
    <div
      className={`flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5 ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="w-5 h-5 text-amber-600 shrink-0 mt-0.5"
        aria-hidden="true"
      >
        <path
          d="M12 8v5m0 3.5h.01M10.3 3.9L2.6 17.1A2 2 0 004.3 20h15.4a2 2 0 001.7-2.9L13.7 3.9a2 2 0 00-3.4 0z"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <p className="text-sm text-amber-900 leading-relaxed whitespace-pre-line">{text}</p>
    </div>
  );
}
