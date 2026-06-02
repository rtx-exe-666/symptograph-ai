import { isSarvamConfigured, textToSpeech } from '@/lib/sarvam';

export async function POST(request) {
  try {
    const { text, targetLang } = await request.json();
    if (!text) return Response.json({ error: 'No text provided' }, { status: 400 });

    if (!isSarvamConfigured()) {
      return Response.json({ audio: null, sarvam: false, note: 'Sarvam not configured — use browser TTS' });
    }

    const audio = await textToSpeech(text, targetLang || 'en-IN');
    return Response.json({ audio: audio ?? null, sarvam: audio !== null });
  } catch (err) {
    console.error('TTS route error:', err);
    return Response.json({ audio: null, sarvam: false, error: err.message });
  }
}
