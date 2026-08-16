export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import LiffLinker from "./LiffLinker";

export default async function LineLinkPage({
  searchParams,
}: {
  searchParams: Promise<{ booking?: string }>;
}) {
  const { booking } = await searchParams;
  if (!booking) notFound();

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <LiffLinker
          bookingId={booking}
          liffId={process.env.NEXT_PUBLIC_LIFF_ID ?? ""}
        />
      </div>
    </div>
  );
}
