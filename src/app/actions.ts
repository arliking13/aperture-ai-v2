"use server";

import { v2 as cloudinary } from "cloudinary";
import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai";

cloudinary.config({ secure: true });

export async function getGeminiAdvice(base64Image: string): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return "System: API key missing.";

  if (
    !base64Image ||
    base64Image === "data:," ||
    (typeof base64Image === "string" && !base64Image.includes("base64,") && base64Image.length < 100)
  ) {
    return "Invalid image.";
  }

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

    const result = await model.generateContent([
      "Act as a photography coach. Analyze this photo. Give ONE short specific instruction to improve pose, angle, framing, or lighting. Max 10 words.",
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