import { isSarvamConfigured, speechToText } from '@/lib/sarvam';

export async function POST(request) {
  try {
    if (!isSarvamConfigured()) {
      return Response.json({ transcript: '', sarvam: false, note: 'Sarvam not configured — use browser STT' });
    }

    const formData = await request.formData();
    const audioFile = formData.get('file');
    const langCode  = formData.get('language_code') || 'hi-IN';

    if (!audioFile) return Response.json({ error: 'No audio file' }, { status: 400 });

    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const transcript = await speechToText(buffer, audioFile.type || 'audio/webm', langCode);

    return Response.json({ transcript, sarvam: true });
  } catch (err) {
    console.error('STT error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
