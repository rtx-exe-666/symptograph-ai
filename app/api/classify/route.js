import { parseMedicalDocumentText, parseMedicalDocumentImage, isApiKeyConfigured } from "@/lib/gemini";
import { getMockMedicalResponse } from "@/lib/mockMedicalData";

export async function POST(request) {
  try {
    const body = await request.json();
    const { type, text, image, mimeType, detectedItem } = body;

    const demoMode = !isApiKeyConfigured();

    if (type === "text") {
      if (!text || text.trim().length === 0) {
        return Response.json({ error: "No query provided" }, { status: 400 });
      }

      if (demoMode) {
        await new Promise((r) => setTimeout(r, 800 + Math.random() * 600));
        const result = getMockMedicalResponse(text.trim());
        return Response.json({ ...result, demoMode: true });
      }

      const result = await parseMedicalDocumentText(text.trim());
      return Response.json({ ...result, demoMode: false });
    }

    if (type === "image") {
      if (!image) {
        return Response.json({ error: "No image provided" }, { status: 400 });
      }

      if (demoMode) {
        await new Promise((r) => setTimeout(r, 1200 + Math.random() * 500));
        const result = getMockMedicalResponse(detectedItem || "report-blood");
        return Response.json({ ...result, demoMode: true, imageAnalyzed: true });
      }

      const result = await parseMedicalDocumentImage(image, mimeType || "image/jpeg");
      return Response.json({ ...result, demoMode: false, imageAnalyzed: true });
    }

    return Response.json({ error: "Invalid request type" }, { status: 400 });
  } catch (error) {
    console.error("Classification error:", error);
    return Response.json(
      { error: "Analysis failed. Please verify your file or query.", details: error.message },
      { status: 500 }
    );
  }
}
