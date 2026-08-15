import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const cars = await prisma.car.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(cars);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const car = await prisma.car.create({
    data: {
      name: body.name,
      brand: body.brand,
      licensePlate: body.licensePlate,
      pricePerDay: Number(body.pricePerDay),
      photoUrl: body.photoUrl || null,
      source: body.source ?? "OWN",
      status: body.status ?? "AVAILABLE",
    },
  });

  return NextResponse.json(car);
}
