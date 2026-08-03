import { NextResponse } from "next/server";
import { auth } from "@/auth";

export async function GET(request: Request) {
  try {
    const session = await auth();
    return NextResponse.json({ session });
  } catch (err: any) {
    return NextResponse.json({ error: err.message });
  }
}
