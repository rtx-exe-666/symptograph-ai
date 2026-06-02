import { GoogleGenerativeAI } from "@google/generative-ai";

const SYSTEM_PROMPT = `You are a professional medical assistant and patient-oriented translator. 
Analyze the given medical prescription or lab report (handwritten or typed) and translate the medical jargon into extremely simple, patient-friendly layman terms.

You must respond with ONLY a valid JSON object (no markdown, no code blocks) in exactly this format:
{
  "title": "A summary title of the report or prescription (e.g. General Health Checkup, Cardiac Prescription)",
  "type": "Prescription | Lab Report",
  "confidence": <integer 0-100>,
  "summary": "A warm, patient-friendly 2-3 sentence overview of this document.",
  "medicines": [
    {
      "name": "Name of the drug (e.g. Metformin 500mg)",
      "purpose": "Layman description of what this medicine treats (e.g. Lowers blood sugar)",
      "dosage": "Clear instruction (e.g. 1 tablet twice daily after meals)",
      "duration": "e.g. 15 days",
      "warning": "Any side effect or precaution (e.g. Avoid alcohol, check kidney levels)"
    }
  ],
  "vitals": [
    {
      "name": "Name of vital/indicator (e.g. HbA1c, Systolic Blood Pressure)",
      "value": "Value in report (e.g. 7.2%)",
      "range": "Normal Reference Range (e.g. 4.0% - 5.6%)",
      "status": "Nominal | High | Low",
      "explanation": "What this indicator actually means in simple terms (e.g. Average blood sugar over 3 months)"
    }
  ],
  "general_recommendations": ["recommendation1", "recommendation2", "recommendation3"],
  "warning_triggers": ["warning1", "warning2"]
}

If the uploaded file is a prescription, leave the "vitals" array empty. If it is a lab report, populate the "vitals" array and leave the "medicines" array empty (unless medications are mentioned).`;

let genAI = null;

function getGenAI() {
  if (!genAI && process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "your_api_key_here") {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return genAI;
}

export function isApiKeyConfigured() {
  return !!(
    process.env.GEMINI_API_KEY &&
    process.env.GEMINI_API_KEY !== "your_api_key_here" &&
    process.env.GEMINI_API_KEY.length > 10
  );
}

export async function parseMedicalDocumentText(textInput) {
  const client = getGenAI();
  if (!client) throw new Error("API key not configured");

  const model = client.getGenerativeModel({ model: "gemini-2.0-flash" });
  const prompt = `${SYSTEM_PROMPT}\n\nParse this medical request: "${textInput}"`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();

  const cleaned = text.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
  return JSON.parse(cleaned);
}

export async function parseMedicalDocumentImage(base64Image, mimeType = "image/jpeg") {
  const client = getGenAI();
  if (!client) throw new Error("API key not configured");

  const model = client.getGenerativeModel({ model: "gemini-2.0-flash" });

  const prompt = `${SYSTEM_PROMPT}\n\nLook at this medical document image, extract all text, interpret prescriptions and lab values, and map them into the requested schema.`;

  const result = await model.generateContent([
    prompt,
    {
      inlineData: {
        data: base64Image,
        mimeType: mimeType,
      },
    },
  ]);

  const text = result.response.text().trim();
  const cleaned = text.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
  return JSON.parse(cleaned);
}
