import { isSarvamConfigured, translateText } from '@/lib/sarvam';

export async function POST(request) {
  try {
    const { text, texts, targetLang } = await request.json();

    if (!isSarvamConfigured()) {
      if (texts) {
        return Response.json({ translatedTexts: texts, sarvam: false, note: 'Sarvam not configured' });
      }
      return Response.json({ translatedText: text, sarvam: false, note: 'Sarvam not configured' });
    }

    if (targetLang === 'en-IN' || targetLang === 'en') {
      if (texts) return Response.json({ translatedTexts: texts, sarvam: true });
      return Response.json({ translatedText: text, sarvam: true });
    }

    // Handle batch translations
    if (texts && Array.isArray(texts)) {
      if (texts.length === 0) {
        return Response.json({ translatedTexts: [], sarvam: true });
      }

      // Join with unique token
      const delimiter = " ||| ";
      const joinedText = texts.join(delimiter);
      
      const translatedJoined = await translateText(joinedText, targetLang);
      
      // Split by delimiter (handling spacing variations from translation)
      let splitTexts = translatedJoined.split(/\s*\|\|\|\s*/);

      // Validate split length. If it doesn't match, fall back to individual translation runs
      if (splitTexts.length !== texts.length) {
        console.warn("Delimiter alignment failed. Performing individual translations.", splitTexts.length, texts.length);
        const individualTranslations = [];
        for (const t of texts) {
          if (!t || t.trim() === "") {
            individualTranslations.push(t);
          } else {
            const trans = await translateText(t, targetLang);
            individualTranslations.push(trans);
          }
        }
        return Response.json({ translatedTexts: individualTranslations, sarvam: true, note: 'Aligned individually' });
      }

      return Response.json({ translatedTexts: splitTexts, sarvam: true });
    }

    // Handle single translation
    if (!text) return Response.json({ error: 'No text provided' }, { status: 400 });
    const translatedText = await translateText(text, targetLang);
    return Response.json({ translatedText, sarvam: true });

  } catch (err) {
    console.error('Translate error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
