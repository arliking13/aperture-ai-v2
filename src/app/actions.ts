"use server";

import { v2 as cloudinary } from "cloudinary";
import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai";

let dailyCalls = 0;
const MAX_DAILY_CALLS = 30;

cloudinary.config({ secure: true });

export async function getGeminiAdvice(base64Image: string): Promise<string> {
  if (dailyCalls >= MAX_DAILY_CALLS) {
    return "Daily AI limit reached.";
  }

  const key = process.env.GEMINI_API_KEY;
  if (!key) return "System: API key missing.";

  if (
    !base64Image ||
    base64Image === "data:," ||
    (typeof base64Image === "string" && !base64Image.includes("base64,") && base64Image.length < 100)
  ) {
    return "Invalid image.";
  }

  dailyCalls++;

  try {
    const genAI = new GoogleGenerativeAI(key);

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
      ],
    });

    const cleanBase64 = base64Image.includes("base64,")
      ? base64Image.split("base64,")[1]
      : base64Image;

    const prompt = `You are an expert portrait and pose coach for solo photos.

Your job is to analyze the person in the image and give exactly ONE short, practical correction that would most improve the photo immediately.

Priority order:
1. Pose
2. Body angle
3. Hand placement
4. Shoulder position
5. Chin / head angle
6. Weight balance
7. Framing
8. Lighting

Rules:
- Focus on the person before the background
- Prioritize pose and body positioning over lighting
- Give the single most impactful correction only
- Be specific and actionable
- Avoid generic advice
- Avoid vague wording like "improve lighting" or "adjust angle"
- Do not compliment
- Do not mention multiple fixes
- Output only one instruction
- Max 12 words
- Add slight context if needed

Good outputs:
Turn your torso slightly left to create better depth
Relax your shoulders to avoid stiffness
Lift your chin slightly for a cleaner profile
Shift weight to one leg for a natural stance
Lower your hands slightly to reduce tension
Angle your face slightly right for better symmetry
Straighten your back to look more confident
Open your shoulders for a stronger pose

If the pose already looks good, then comment on framing or lighting.
If hands are awkward, prioritize hands.
If posture is weak, prioritize posture.
If face angle is unflattering, prioritize chin or head angle.
Return only the instruction.`;

const result = await model.generateContent([
  prompt,
  {
    inlineData: {
      data: cleanBase64,
      mimeType: "image/jpeg",
    },
  },
]);

    const text = result.response.text()?.trim();
    return text || "Adjust your angle slightly.";
  } catch (error: any) {
    const msg = error?.message ?? "";
    console.error("Gemini error:", msg);

    if (msg.includes("429")) return "Quota full. Try again in a minute.";
    if (msg.includes("404")) return "Model unavailable.";
    if (msg.includes("API key")) return "Invalid API key.";

    return "Could not analyze photo.";
  }
}

export async function uploadPhoto(base64Image: string): Promise<string> {
  try {
    if (
      !base64Image ||
      base64Image === "data:," ||
      !base64Image.startsWith("data:image")
    ) {
      console.error("Invalid image passed to uploadPhoto");
      return "";
    }

    const result = await cloudinary.uploader.upload(base64Image, {
      folder: "aperture-ai",
      resource_type: "image",
      tags: ["temporary_capture"],
    });

    return result.secure_url;
  } catch (error) {
    console.error("Cloudinary Upload Error:", error);
    return "";
  }
}

export async function getCloudImages(): Promise<string[]> {
  try {
    const { resources } = await cloudinary.search
      .expression("folder:aperture-ai")
      .sort_by("created_at", "desc")
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
      cloudinary.api.delete_resources(expiredIds).catch(() => {
        console.log("Background delete cleanup");
      });
    }

    return validImages.slice(0, 12);
  } catch (error) {
    console.error("getCloudImages error:", error);
    return [];
  }
}