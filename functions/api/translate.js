// functions/api/translate.js

export async function onRequestPost(context) {
  try {
    // 1. Get the key safely from Cloudflare environment variables
    const apiKey = context.env.GEMINI_API_KEY;
    
    // 2. Parse the incoming JSON from your website
    // (Cloudflare uses standard Request objects)
    const { text } = await context.request.json();

    if (!text) {
      return new Response(JSON.stringify({ error: "No text provided" }), { status: 400 });
    }

    // 3. Prepare the Gemini API call
    const modelVersion = "gemini-2.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1/models/${modelVersion}:generateContent?key=${apiKey}`;

    const prompt = {
        contents: [{
            parts: [{
                text: `You are a Filipino Sign Language interpreter. Convert this gloss sequence into conversational Tagalog.
                Input: "${text}"
                Only output the corrected sentence.`
            }]
        }]
    };

    // 4. Call Google
    const googleResponse = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prompt)
    });

    const data = await googleResponse.json();

    // 5. Send result back to your frontend
    return new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json" },
      status: 200
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: "Server Error", details: err.toString() }), { status: 500 });
  }
}