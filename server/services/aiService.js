const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || ''
});

const SYSTEM_PROMPT = `You are a masterful meditation guide creating personalized guided meditations. Your meditations:
- Use 2nd person perspective ("you feel", "you notice")
- Offer invitations, not commands ("you might notice" vs "notice")
- Include [pause] cues for natural pacing (every 2-3 sentences)
- Are mindful, grounding, and deeply experiential
- Connect vision to embodied feeling states
- Build from grounding → envisioning → embodying → integrating

Keep the tone warm, spacious, and transformative.`;

async function generateScript({ category, duration, background, responses, userName }) {
  const targetWords = Math.floor(duration * 135);
  const minWords = Math.floor(targetWords * 0.9);
  const maxWords = Math.floor(targetWords * 1.1);

  const responseSummary = responses.map((r, i) => `Q${i + 1}: ${r}`).join('\n');

  const prompt = `Create a ${duration}-minute guided meditation script.

Category: ${category}
Background: ${background} (use this for atmospheric context, don't mention it explicitly)
User's Vision Responses:
${responseSummary}

Target: ${minWords}-${maxWords} words (at ~135 WPM)
User's name: ${userName}

Create a transformative meditation that helps ${userName} embody their vision. Include [pause] markers every 2-3 sentences for natural pacing.`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: prompt }
    ],
    temperature: 0.8,
    max_tokens: 3000
  });

  return completion.choices[0].message.content;
}

async function generateTitle(script, category) {
  const prompt = `Generate a meditation title (2-5 words, Title Case) for this script. Don't reference background audio.

Category: ${category}
Script excerpt: ${script.substring(0, 500)}...

Return only the title, nothing else.`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    max_tokens: 20
  });

  return completion.choices[0].message.content.trim().replace(/^["']|["']$/g, '');
}

async function generateNextPrompt(category, previousResponses) {
  const responseHistory = previousResponses.map((r, i) => `${i + 1}. ${r.question}\nAnswer: ${r.answer}`).join('\n\n');

  const prompt = `You're guiding someone to deepen their vision for: ${category}

Previous conversation:
${responseHistory}

Generate ONE single follow-up question that either:
- Goes deeper (70% probability): Explores feelings, beliefs, or embodiment
- Expands context (30% probability): Explores related life areas or future possibilities

IMPORTANT: Ask only ONE question. Do NOT combine multiple questions or use "and" to join questions. Keep it simple and focused.

Return only the question, nothing else. Make it personal and evocative.`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.9,
    max_tokens: 100
  });

  return completion.choices[0].message.content.trim();
}

async function generateTagline(visionStatement) {
  const prompt = `Generate a tagline (8-12 words) that captures the essence of this vision statement:

"${visionStatement}"

Return only the tagline, nothing else.`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.8,
    max_tokens: 30
  });

  return completion.choices[0].message.content.trim().replace(/^["']|["']$/g, '');
}

async function synthesizeVisionStatement(category, responses) {
  const responseSummary = responses.map((r, i) => `${i + 1}. ${r.question}\n   ${r.answer}`).join('\n\n');

  const prompt = `Synthesize a Living Vision Statement (2-4 sentences) for the ${category} category based on these responses:

${responseSummary}

Create a powerful, present-tense statement that captures their vision. Use "I" language. Make it inspiring and specific.`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.8,
    max_tokens: 200
  });

  return completion.choices[0].message.content.trim();
}

module.exports = {
  generateScript,
  generateTitle,
  generateNextPrompt,
  generateTagline,
  synthesizeVisionStatement
};
