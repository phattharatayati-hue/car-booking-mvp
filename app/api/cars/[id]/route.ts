import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();

  const car = await prisma.car.update({
    where: { id },
    data: {
      name: body.name,
      brand: body.brand,
      licensePlate: body.licensePlate,
      pricePerDay: body.pricePerDay !== undefined ? Number(body.pricePerDay) : undefined,
      photoUrl: body.photoUrl,
      source: body.source,
      status: body.status,
    },
  });

  return NextResponse.json(car);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await prisma.car.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
