"use server";
import { v2 as cloudinary } from 'cloudinary';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

cloudinary.config({ secure: true });

// --- RATE LIMITER: не более 1 запроса в 15 секунд глобально ---
let lastGeminiCallTime = 0;
const GEMINI_COOLDOWN_MS = 15000;

export async function getGeminiAdvice(base64Image: string): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return "System: API Key Missing";

  // Проверка cooldown на сервере — не зависит от клиента
  const now = Date.now();
  const timeSinceLast = now - lastGeminiCallTime;
  if (timeSinceLast < GEMINI_COOLDOWN_MS) {
    const waitSec = Math.ceil((GEMINI_COOLDOWN_MS - timeSinceLast) / 1000);
    return `Please wait ${waitSec}s before analyzing again.`;
  }
  lastGeminiCallTime = now;

  try {
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
      ]
    });

    const cleanBase64 = base64Image.includes("base64,")
      ? base64Image.split("base64,")[1]
      : base64Image;

    const prompt = `Act as a photography coach. Analyze this photo. Give ONE specific instruction to improve the pose, angle, or lighting. Max 10 words.`;

    const result = await model.generateContent([
      prompt,
      { inlineData: { data: cleanBase64, mimeType: "image/jpeg" } }
    ]);

    return result.response.text() || "Adjust your angle.";

  } catch (error: any) {
    const msg = error?.message ?? "";
    if (msg.includes("429")) {
      lastGeminiCallTime = now + 60000; // штрафной cooldown 60с после 429
      return "Quota full. Wait 60s.";
    }
    console.error("Gemini error:", msg);
    return "Could not analyze photo.";
  }
}

export async function uploadPhoto(base64Image: string): Promise<string> {
  try {
    const result = await cloudinary.uploader.upload(base64Image, {
      folder: 'aperture-ai',
      resource_type: 'image',
      tags: ['temporary_capture']
    });
    return result.secure_url;
  } catch (error) {
    console.error("Cloudinary Upload Error:", error);
    return "";
  }
}

// --- STRICT FILTERING LOGIC ---
export async function getCloudImages(): Promise<string[]> {
  try {
    const { resources } = await cloudinary.search
      .expression('folder:aperture-ai')
      .sort_by('created_at', 'desc')
      .max_results(30)
      .execute();

    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;
    const validImages: string[] = [];
    const expiredIds: string[] = [];

    resources.forEach((file: any) => {
      const createdAt = new Date(file.created_at).getTime();
      if (now - createdAt > fiveMinutes) {
        expiredIds.push(file.public_id);
      } else {
        validImages.push(file.secure_url);
      }
    });

    if (expiredIds.length > 0) {
      cloudinary.api.delete_resources(expiredIds).catch(() =>
        console.log("Background delete cleanup")
      );
    }

    return validImages.slice(0, 12);
  } catch (error) {
    return [];
  }
}