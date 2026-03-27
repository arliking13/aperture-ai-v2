import { NextRequest, NextResponse } from 'next/server';
import { getGeminiAdvice } from '@/app/actions'; // путь поправь если надо

export async function POST(req: NextRequest) {
  try {
    const { image } = await req.json();

    const tip = await getGeminiAdvice(image);

    return NextResponse.json({ tip });
  } catch (e) {
    return NextResponse.json({ tip: "Server error" }, { status: 500 });
  }
}