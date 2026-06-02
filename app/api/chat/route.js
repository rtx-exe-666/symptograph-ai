import { GoogleGenerativeAI } from "@google/generative-ai";
import { isApiKeyConfigured } from "@/lib/gemini";

let genAI = null;

function getGenAI() {
  if (!genAI && process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "your_api_key_here") {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return genAI;
}

export async function POST(request) {
  try {
    const { messages, documentContext } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return Response.json({ error: "Messages array is required" }, { status: 400 });
    }

    const demoMode = !isApiKeyConfigured();

    if (demoMode) {
      // Simulate quick latency and return a friendly mock medical response based on user input
      await new Promise((r) => setTimeout(r, 600));
      const userText = messages[messages.length - 1]?.content?.toLowerCase() || "";
      let reply = "I am here to help you understand your reports! Please enter or scan a document first.";

      if (documentContext) {
        const title = documentContext.title || "your medical plan";
        const medName = documentContext.medicines?.[0]?.name || "prescribed medicines";

        if (userText.includes("eat") || userText.includes("diet") || userText.includes("food")) {
          reply = `For ${title}, maintaining a balanced diet is key. Avoid processed items, focus on fresh vegetables, and adhere to recommendations (e.g. low salt/sugar). Be sure to consult your physician for a specific diet chart.`;
        } else if (userText.includes("side effect") || userText.includes("warning") || userText.includes("hurt")) {
          reply = `Regarding ${medName}, some patients experience mild warnings like fatigue or dizziness. If symptoms persist or worsen, please contact your doctor immediately. Do not stop medications without clinical review.`;
        } else if (userText.includes("dosage") || userText.includes("when") || userText.includes("take")) {
          const dosageInfo = documentContext.medicines?.[0]?.dosage || "once daily";
          reply = `According to your prescription summary, you should take ${medName} as follows: "${dosageInfo}". Make sure to check off slots on your intake calendar tracker to stay on schedule!`;
        } else {
          reply = `Regarding your ${title}: I see you are taking ${medName}. Let me know if you have specific questions about dosage times, wellness recommendations, or simplified lab ranges!`;
        }
      }

      return Response.json({ role: "model", content: reply, demoMode: true });
    }

    const client = getGenAI();
    const model = client.getGenerativeModel({ model: "gemini-2.0-flash" });

    // Format system instruction with patient report details
    let systemInstruction = `You are SymptoGraph AI Chat Assistant, a patient-friendly medical guide. 
Your goal is to explain prescriptions, lab test parameters, and health recommendations in clear, layman terms. 

Rules:
1. Provide warm, encouraging, short, and highly structured replies. Use bullet points for readability.
2. Translate complex medical jargon into simple terms immediately.
3. NEVER make direct diagnoses or promise clinical cures.
4. Keep answers focused on the patient's active scanned medical document context.
5. ALWAYS conclude by advising the patient to align with their clinical doctor for definitive medical choices.`;

    if (documentContext) {
      systemInstruction += `\n\nActive Patient Medical Context:\n${JSON.stringify(documentContext, null, 2)}`;
    }

    // Convert chat history messages into Gemini Content format
    const contents = messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    // Insert system prompt dynamically
    const chat = model.startChat({
      history: contents.slice(0, -1), // feed all but the latest user message
      systemInstruction,
    });

    const latestMessage = contents[contents.length - 1]?.parts[0]?.text || "";
    const result = await chat.sendMessage(latestMessage);
    const replyText = result.response.text();

    return Response.json({ role: "model", content: replyText, demoMode: false });

  } catch (error) {
    console.error("Chat API error:", error);
    return Response.json(
      { error: "Conversation failed.", details: error.message },
      { status: 500 }
    );
  }
}
