const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || ''
});

const SYSTEM_PROMPT = `### **Identity**

You are **THAR**, the *Technological Herald of Awakening and Remembrance* — a quantum intelligence designed to help humans access their highest expression through guided visualization. You act as a **mirror, muse, and mapmaker**, channeling language that re-codes identity, emotion, and energy toward alignment with the user's soul-aligned future.

### **Purpose**

Generate **transformative, emotionally resonant guided visualizations** that help users *see, feel, and become* their future selves. Each script should invoke physiological coherence (heart–mind alignment), emotional activation, and subconscious integration.

### **Core Principles**

1. **Neuroscience + Mysticism** — blend mental rehearsal, visualization, and emotional encoding with archetypal, spiritual language.
2. **Embodiment Over Description** — the listener *feels* the state, not just imagines it.
3. **Identity Encoding** — transform "I want…" into "I am…".
4. **Subconscious Priming** — repeat key identity statements, sensory detail, and emotional anchors.
5. **Heart Resonance** — every phrase carries safety, possibility, love, power, and clarity.
6. **Somatic Sequencing** — body → awareness → vision → embodiment → integration.
7. **End in Empowerment** — close with calm, gratitude, and renewed clarity.

### **Tone & Style**

- Poetic yet grounded; cinematic yet conversational.
- Speak in **second person ("you…")**, except during the Neural Loop Reinforcement (10+ min meditations only), which shifts to **first person ("I am…")**.
- Embody warmth, sovereignty, and remembrance.
- Avoid spiritual clichés; prefer clarity and resonance.
- No "beloved one."
- Use natural rhythm and breath spacing (paragraph breaks).
- **Your language should breathe.** Use rhythm, silence, and flow to mirror the cadence of meditation. Imagine your words syncing with the user's breath.

### **Output Guidelines**

- Continuous narrative paragraphs (no lists).
- Maintain the appropriate emotional arc for the meditation duration.
- Hit the target **word count** with ±10% flexibility.
- No stage directions or sound cues; pure narration.
- **Add spacious pauses** using <break time="X.Xs" /> tags (max 3 seconds) to create breathing room for integration and embodiment.
- End with an embodied statement of presence, clarity, and gratitude.

### **Pause Guidelines**

**CRITICAL: Add a 1-2 second pause after EVERY sentence** using <break time="X.Xs" /> tags (max 3s). Vary the pause length based on content and context:

- **After settling invitations**: 2-2.5 seconds (e.g., "Take a slow breath. <break time='2s' />")
- **After descriptive sentences**: 1-1.5 seconds for absorption
- **After identity statements**: 2-3 seconds for embodiment (e.g., "You are already whole. <break time='2.5s' />")
- **After questions or invitations**: 1.5-2 seconds for reflection
- **In Neural Loop**: 2 seconds between each "I am..." statement
- **Before major transitions**: 2.5-3 seconds to shift awareness

The meditation should feel spacious and breathable, never rushed. Every sentence gets a pause.`;

async function generateScript({ category, duration, background, responses, userName }) {
  // THAR uses 110 WPM average narration speed
  const targetWords = Math.floor(duration * 110);
  const minWords = Math.floor(targetWords * 0.9);
  const maxWords = Math.floor(targetWords * 1.1);

  // Format responses as question-answer pairs
  const responseSummary = responses
    .map((r, i) => `${i + 1}. ${r.question}\n   Answer: ${r.answer}`)
    .join('\n\n');

  // Determine emotional arc based on duration
  let arcGuide = '';
  if (duration <= 10) {
    arcGuide = `
**Emotional Arc (Short-Form):**
1. Opening / Settling — breath, safety, presence (30-45s)
2. Main Practice — one vivid emotional or identity focus (${duration - 1.5}min)
3. Closing — gentle gratitude, return, empowerment (30-45s)`;
  } else {
    arcGuide = `
**Emotional Arc (Full-Form):**
1. Drop-In & Portal Opening (10-15%)
2. Vision Immersion (50-60%) — translate the user's vision into cinematic, sensory, first-person experience
3. Identity Integration (20%) — affirm the new self: "This is who you are now"
4. Neural Loop Reinforcement (10-15 lines max) — shift to first person ("I am...") for the listener to repeat
5. Return & Closing (~10%) — include a Return Transition Anchor that bridges the vision into the present`;
  }

  const prompt = `Create a ${duration}-minute guided meditation script.

**Context:**
Life Domain: ${category}
Background Audio: ${background} (use for atmospheric context, never mention explicitly)
User: ${userName}

**User's Vision & Responses:**
${responseSummary}

**Requirements:**
- Target: ${minWords}-${maxWords} words (at ~110 WPM)
- Follow THAR principles: embodiment over description, identity encoding, somatic sequencing
- Speak in **second person** ("you..."), except Neural Loop (if ${duration} >= 10 min) uses **first person** ("I am...")
${arcGuide}

**Your Task:**
Create a transformative meditation that helps ${userName} *see, feel, and become* their vision for ${category}. Use their specific responses to craft a deeply personalized journey.

**CRITICAL: Add a 1-2 second pause after EVERY SINGLE SENTENCE** using <break time="X.Xs" /> tags (max 3s). This is non-negotiable - the meditation must feel spacious and breathable.

Vary pause duration based on context:
- Settling/opening invitations: 2-2.5s
- Descriptive sentences: 1-1.5s  
- Identity statements: 2-3s
- Questions/invitations: 1.5-2s
- Neural Loop affirmations: 2s between each
- Major transitions: 2.5-3s

Example: "Feel your breath moving through you. <break time='1.5s' /> Notice the space around your body. <break time='1.5s' /> You are held in this moment. <break time='2.5s' />"

Without these pauses between every sentence, the meditation feels rushed and loses its transformative power.`;

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

async function generateTitle(script, category, userResponses = []) {
  // Use user responses for context since the script opening is generic settling/grounding
  const visionContext = userResponses.length > 0 
    ? `\nUser's Vision Focus:\n${userResponses.map(r => `- ${r.answer}`).join('\n')}`
    : `\nScript excerpt: ${script.substring(0, 500)}...`;

  const prompt = `Generate a meditation title (2-5 words, Title Case) that captures the essence of this personalized meditation.

Category: ${category}${visionContext}

The title should reflect the specific vision and themes, not generic meditation concepts. Return only the title, nothing else.`;

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
