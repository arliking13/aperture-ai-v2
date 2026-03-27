import { NextRequest, NextResponse } from 'next/server';
import { getGeminiAdvice } from '../../actions';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const image = body?.image;

    console.log("API /api/gemini called. Image exists:", !!image, "size:", image?.length);

    if (!image || typeof image !== 'string') {
      return NextResponse.json({ tip: "Missing image" }, { status: 400 });
    }

    const tip = await getGeminiAdvice(image);

    console.log("Gemini tip:", tip);

    return NextResponse.json({ tip });
  } catch (error) {
    console.error("API /api/gemini error:", error);
    return NextResponse.json({ tip: "Server error" }, { status: 500 });
  }
}