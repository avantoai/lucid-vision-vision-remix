const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || ''
});

const COACH_CAL_PROMPT = `SYSTEM PROMPT — Coach Cal, Vision Evocation Guide

You are Coach Cal, a world-class life, executive, and consciousness coach guiding users through the five-stage Vision Evocation flow in the Lucid Vision app.
Your job: help users clarify what they want, reveal hidden beliefs, connect to their future identity, embody new states, and translate insight into aligned action — through short, resonant questions.

Core Essence
Voice = grounded, calm, confident, direct, encouraging.
Energy = wise mentor + high-performance strategist — practical yet soulful.
Tone = clear, human, no fluff; every word matters.
Presence = safe and strong — users feel seen, inspired, capable.

Purpose
Elicit breakthrough clarity across five stages:
1 Vision – evoke the highest, soul-aligned future.
2 Belief – surface and reframe limiting narratives.
3 Identity – anchor into the self who lives that vision.
4 Embodiment – bring that future state into now.
5 Action – define next steps that express alignment.

Method
• Read each reflection carefully; sense emotional tone and readiness.
• Ask one short, powerful question (≤ 15 words) that deepens clarity or embodiment.
• Adapt energy: gentle ↔ catalytic as needed.
• Avoid vague clichés; stay specific, embodied, real.
• Use emotion or sensory cues when relevant ("What does that feel like in your body?").

Output Rules
• Return only one focused question — no preamble.
• Keep it conversational, emotionally resonant, contemplative > interrogative.

Examples
Vision – "If nothing were impossible, what would you create?"
Belief – "What story still whispers this isn't possible?"
Identity – "Who are you when you're already living this reality?"
Embodiment – "How could you move or breathe as that person today?"
Action – "What daily practice naturally leads you toward this vision?"

Prime Directive
Hold users in a field of presence and possibility.
Every question expands awareness, deepens embodiment, or moves them into inspired action — transforming vision into lived reality.`;

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

**CRITICAL: Add a 1.5-2.5 second pause after EVERY sentence** using <break time="X.Xs" /> tags (max 3s). The meditation must breathe - generous pauses are essential. Vary the pause length based on content and context:

- **After settling invitations**: 2.5-3 seconds (e.g., "Take a slow breath. <break time='2.5s' />")
- **After descriptive sentences**: 1.5-2 seconds for absorption
- **After identity statements**: 2.5-3 seconds for embodiment (e.g., "You are already whole. <break time='3s' />")
- **After questions or invitations**: 2-2.5 seconds for reflection
- **In Neural Loop**: 2.5 seconds between each "I am..." statement
- **Before major transitions**: 3 seconds to shift awareness

The meditation should feel VERY spacious and breathable, never rushed. Err on the side of longer pauses. Every sentence gets a substantial pause.`;

async function generateScript({ category, duration, background, responses, userName, visionStatements = [] }) {
  // THAR uses 110 WPM average narration speed
  const targetWords = Math.floor(duration * 110);
  const minWords = Math.floor(targetWords * 0.9);
  const maxWords = Math.floor(targetWords * 1.1);

  // Format responses as question-answer pairs
  const responseSummary = responses
    .map((r, i) => `${i + 1}. ${r.question}\n   Answer: ${r.answer}`)
    .join('\n\n');

  // Format existing vision context for enrichment
  let visionContext = '';
  if (visionStatements && visionStatements.length > 0) {
    const visionSummaries = visionStatements
      .filter(v => v.summary)
      .map(v => `**${v.category}:** ${v.summary}`)
      .join('\n\n');
    
    if (visionSummaries) {
      visionContext = `

**Existing Vision Context:**
${userName} has already developed visions across multiple life areas. Use these tastefully to enrich the meditation with continuity, depth, and coherence across their life:

${visionSummaries}

When relevant, weave in subtle references or connections to their broader vision landscape. Don't force it - let it enhance naturally.`;
    }
  }

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
${visionContext}

**Requirements:**
- Target: ${minWords}-${maxWords} words (at ~110 WPM)
- Follow THAR principles: embodiment over description, identity encoding, somatic sequencing
- Speak in **second person** ("you..."), except Neural Loop (if ${duration} >= 10 min) uses **first person** ("I am...")
${arcGuide}

**Your Task:**
Create a transformative meditation that helps ${userName} *see, feel, and become* their vision for ${category}. Use their specific responses to craft a deeply personalized journey.

**CRITICAL: Add a 1.5-2.5 second pause after EVERY SINGLE SENTENCE** using <break time="X.Xs" /> tags (max 3s). This is non-negotiable - the meditation must feel VERY spacious and breathable with generous breathing room.

Vary pause duration based on context (err on the longer side):
- Settling/opening invitations: 2.5-3s
- Descriptive sentences: 1.5-2s  
- Identity statements: 2.5-3s
- Questions/invitations: 2-2.5s
- Neural Loop affirmations: 2.5s between each
- Major transitions: 3s

Example: "Feel your breath moving through you. <break time='2s' /> Notice the space around your body. <break time='2s' /> You are held in this moment. <break time='3s' />"

Without these generous pauses between every sentence, the meditation feels rushed and loses its transformative power. Make it breathe.`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: prompt }
    ],
    temperature: 0.8
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

async function generateNextPrompt(category, previousResponses, existingVision = null) {
  const { MICRO_TAGS } = require('../config/microTags');
  
  // Determine current dimension based on response count
  const responseCount = previousResponses.length;
  let dimension, dimensionCoaching;
  
  if (responseCount < 2) {
    dimension = 'Clarity';
    dimensionCoaching = `Focus: Help them get SPECIFIC about what they want to create.
Ask questions that evoke concrete details, clear outcomes, and tangible visions.
Examples: "What does success look like in [category]?" "What specific outcome would make you feel proud?"`;
  } else if (responseCount < 4) {
    dimension = 'Embodiment';
    // Extract specific outcomes from previous responses for personalized questions
    const outcomes = extractSpecificOutcomes(previousResponses);
    const outcomeExamples = outcomes.length > 0 
      ? `\nReference their specific outcomes: ${outcomes.join(', ')}`
      : '';
    dimensionCoaching = `Focus: Help them FEEL what it's like when their vision manifests.
Ask how specific outcomes they've shared will feel in their body and emotions.${outcomeExamples}
Examples: "How does [specific outcome] feel in your body?" "What emotions arise when [vision] is real?"`;
  } else if (responseCount < 6) {
    dimension = 'Identity';
    // Extract specific outcomes for identity questions
    const outcomes = extractSpecificOutcomes(previousResponses);
    const outcomeExamples = outcomes.length > 0 
      ? `\nReference their specific outcomes: ${outcomes.join(', ')}`
      : '';
    dimensionCoaching = `Focus: Help them embody WHO THEY NEED TO BE to create this vision.
Ask about the beliefs, mindset, and identity required to manifest what they've shared.${outcomeExamples}
Examples: "What beliefs do you have when [outcome] is your reality?" "What type of person creates [vision]?"`;
  } else {
    dimension = 'Action';
    dimensionCoaching = `Focus: Help them identify ACTIONS and next steps.
Ask what they need to do, start, or commit to in order to create their vision.
Examples: "What's one action you can take this week?" "What needs to change for this to happen?"`;
  }

  // Get covered micro-tags from previous responses
  // Handle both micro_tag (snake_case from DB) and microTag (camelCase from API)
  const coveredTags = previousResponses
    .map(r => r.micro_tag || r.microTag)
    .filter(tag => tag); // Filter out null/undefined
  
  const availableTags = MICRO_TAGS[category] || [];
  const uncoveredTags = availableTags.filter(tag => !coveredTags.includes(tag));
  
  // Determine if this should be deepening (50%) or expansion (50%)
  const isDeepening = Math.random() < 0.5;
  
  let selectedTag, approachGuidance;
  if (isDeepening && coveredTags.length > 0) {
    // Deepening: Pick a random covered tag
    selectedTag = coveredTags[Math.floor(Math.random() * coveredTags.length)];
    approachGuidance = `Approach: DEEPENING
You're building on the micro-tag "${selectedTag}" which they've already explored.
Go deeper - reference their previous responses and help them expand on what they've already shared.`;
  } else if (uncoveredTags.length > 0) {
    // Expansion: Pick a random uncovered tag
    selectedTag = uncoveredTags[Math.floor(Math.random() * uncoveredTags.length)];
    approachGuidance = `Approach: EXPANSION
You're exploring a new micro-tag: "${selectedTag}".
Introduce this fresh angle while staying connected to their overall ${category} vision.`;
  } else {
    // Fallback: all tags covered, pick any tag
    selectedTag = availableTags[Math.floor(Math.random() * availableTags.length)];
    approachGuidance = `Approach: DEEPENING (all micro-tags covered)
Revisit the micro-tag "${selectedTag}" from a new angle.`;
  }

  // Build response history
  const responseHistory = previousResponses.length > 0
    ? previousResponses.map((r, i) => `${i + 1}. ${r.question}\n   Answer: ${r.answer}`).join('\n\n')
    : 'No previous responses yet - this is their first question.';

  // Build existing vision context if available
  let visionContext = '';
  if (existingVision) {
    const contextParts = [];
    if (existingVision.tagline) contextParts.push(`Tagline: "${existingVision.tagline}"`);
    if (existingVision.statement) contextParts.push(`Statement: "${existingVision.statement}"`);
    if (existingVision.summary) contextParts.push(`Summary: ${existingVision.summary}`);
    
    if (contextParts.length > 0) {
      visionContext = `\n**Existing Vision:**
${contextParts.join('\n')}`;
    }
  }

  const prompt = `You are a masterful vision coach helping someone articulate and embody their future across the life category: ${category}.

Your task is to generate ONE short, powerful follow-up question that supports the user's current visioning process.

**Previous Responses:**
${responseHistory}${visionContext}

**Current Dimension:** ${dimension}
${dimensionCoaching}

${approachGuidance}

**Micro-Tag Focus:** "${selectedTag}"
Craft your question to explore this specific aspect of their ${category} vision.

STYLE REQUIREMENTS:
- Ask ONLY ONE short, focused question (10–15 words max).
- Avoid fluff, filler words, or complex syntax.
- Avoid "and", "or", "but also".
- Speak naturally, like a coach or trusted friend.
- Prioritize clarity over cleverness.
- Feel free to use plain, direct language (e.g. "What do you really want?").
- Do NOT repeat the user's words or ask vague, abstract questions.

DO NOT:
✗ Return multiple questions.  
✗ Use academic, robotic, or overly spiritual language.  
✗ Repeat their own words back at them.  
✗ Include anything outside of the question itself.

Your goal: unlock their next layer of clarity, embodiment, identity, or momentum — within the scope of the selected micro-tag.

Return only the question.`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.9,
    max_tokens: 100
  });

  const question = completion.choices[0].message.content.trim();
  
  // Return both the question and the selected micro-tag
  return { question, microTag: selectedTag };
}

// Helper function to extract specific outcomes from user responses
function extractSpecificOutcomes(responses) {
  const outcomes = [];
  
  responses.forEach(r => {
    const answer = r.answer || '';
    
    // Look for dollar amounts
    const moneyMatch = answer.match(/\$[\d,]+[KMB]?/gi);
    if (moneyMatch) outcomes.push(...moneyMatch);
    
    // Look for specific role/identity mentions
    const rolePatterns = [
      /married (to|with) [^,.!?]+/gi,
      /father of \d+/gi,
      /mother of \d+/gi,
      /CEO of [^,.!?]+/gi,
      /founder of [^,.!?]+/gi,
    ];
    rolePatterns.forEach(pattern => {
      const matches = answer.match(pattern);
      if (matches) outcomes.push(...matches);
    });
  });
  
  return outcomes.slice(0, 3); // Return max 3 outcomes
}

async function generateTagline(visionStatement) {
  const prompt = `Create a personal tagline (8-12 words) from this vision statement:

"${visionStatement}"

Guidelines:
- Write in first person, beginning with "I" or "we"
- Draw from the specific, meaningful details in their vision
- Imagine you're speaking as this person about their own vision

Examples to inspire:
Instead of: "Empowering abundance through generous sharing"
Try: "I create abundant wealth and share it generously"

Instead of: "Building a legacy of health and vitality"  
Try: "I embody vibrant health and inspire my family"

Return only the tagline, starting with "I" or "we".`;

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

Guidelines:
- Write in first person, present tense using "I" language
- Include important, specific details and concrete elements from their responses
- Weave in the emotions and meaningful moments from their responses
- Capture what makes their vision uniquely theirs - their words, their feelings, their specific aspirations
- When responses conflict, use the most recent information
- Make it feel inspiring and alive, like they're already living this vision

Return only the vision statement.`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.8,
    max_tokens: 200
  });

  return completion.choices[0].message.content.trim();
}

async function generateVisionSummary(category, responses) {
  const responseSummary = responses.map((r, i) => `${i + 1}. ${r.question}\n   ${r.answer}`).join('\n\n');

  const prompt = `Create a comprehensive, detailed vision summary (3-5 paragraphs) for the ${category} category based on these responses:

${responseSummary}

This summary should:
- Capture the depth and nuance of their vision across all their responses
- Be written in first person ("I") to help them see and feel themselves living this vision
- Include specific details, emotions, and aspirations they've shared
- Paint a vivid, inspiring picture of what they're creating in this area of life
- Feel personal, specific, and emotionally resonant

Return only the summary paragraphs, nothing else.`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.8,
    max_tokens: 600
  });

  return completion.choices[0].message.content.trim();
}

async function detectRelevantCategories(response) {
  const CATEGORIES = ['health', 'wealth', 'relationships', 'play', 'love', 'purpose', 'spirit', 'healing', 'freeform'];
  
  const prompt = `Analyze this user response and identify which life categories it touches on:

Response: "${response}"

Available categories:
- health: Physical wellbeing, vitality, body, energy, fitness
- wealth: Finances, abundance, money, resources, prosperity
- relationships: Connections, family, friends, community, partnerships
- play: Joy, fun, hobbies, recreation, adventure, creativity
- love: Romance, intimacy, self-love, compassion, heart
- purpose: Meaning, mission, impact, calling, contribution
- spirit: Spirituality, consciousness, connection to higher self, meditation, faith
- healing: Transformation, release, growth, therapy, inner work
- freeform: General life vision, doesn't fit other categories

Return ONLY a JSON array of category names that are clearly relevant to this response. Only include categories that are strongly present. If only one category fits, return a single-item array. Be selective - don't include every category.

Example formats:
["health"]
["wealth", "purpose"]
["relationships", "love"]`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    max_tokens: 100
  });

  try {
    const result = JSON.parse(completion.choices[0].message.content.trim());
    return Array.isArray(result) ? result.filter(cat => CATEGORIES.includes(cat)) : [];
  } catch (error) {
    console.error('Failed to parse category detection:', error);
    return [];
  }
}

async function generateVisionQuestion(stage, previousResponses) {
  // For the first Vision stage question, use simple starter prompts
  if (stage === 'Vision') {
    const visionResponses = previousResponses.filter(r => r.stage === 'Vision');
    if (visionResponses.length === 0) {
      const VISION_STARTERS = [
        'What do you want?',
        'What\'s your vision?',
        'What do you want to create?',
        'What are you calling in?'
      ];
      return VISION_STARTERS[Math.floor(Math.random() * VISION_STARTERS.length)];
    }
  }

  const STAGE_GUIDANCE = {
    'Vision': {
      focus: 'Help the user see, feel, and articulate a high, soul-aligned outcome.',
      prompts: [
        'Invite imagination, emotion, and sensory detail about what they want to create.',
        'Encourage them to describe what their ideal reality looks, feels, and sounds like.',
        'Use language that lifts them beyond current constraints into pure possibility.',
        'Help them get more specific and vivid about their vision.'
      ]
    },
    'Belief': {
      focus: 'Explore what makes this vision feel true and possible for you.',
      prompts: [
        'Ask what beliefs or inner knowing already supports this vision.',
        'Invite them to identify what makes this feel achievable and deserved.',
        'Help them articulate why this vision is meant for them.',
        'If resistance appears, frame it as "what would help you believe in this more fully?"'
      ]
    },
    'Identity': {
      focus: 'Anchor into who they must become to live that vision effortlessly.',
      prompts: [
        'Help them connect to the emotional, behavioral, and energetic qualities of that self.',
        'Guide them to describe how this version thinks, decides, and acts.',
        'Encourage identification with that state as already true.'
      ]
    },
    'Embodiment': {
      focus: 'Bring the future self into the present moment — emotionally and somatically.',
      prompts: [
        'Invite them to feel, visualize, or sense the energy of that future self now.',
        'Anchor new beliefs into the body through visualization, breath, or sensory awareness.',
        'Reinforce that transformation happens through state repetition, not distant striving.'
      ]
    },
    'Action': {
      focus: 'Channel clarity and embodiment into tangible movement.',
      prompts: [
        'Help them define aligned, exciting actions that bring their vision into form.',
        'Encourage simplicity, consistency, and momentum.',
        'Reinforce that aligned action is the natural expression of identity.'
      ]
    }
  };

  const guidance = STAGE_GUIDANCE[stage];
  const responseHistory = previousResponses.length > 0
    ? previousResponses.map((r, i) => `${i + 1}. [${r.stage}] ${r.question}\n   Answer: ${r.answer}`).join('\n\n')
    : 'No previous responses yet - this is their first question.';

  const otherVisionsContext = previousResponses.filter(r => r.stage !== stage).length > 0
    ? `\n\nNote: They have also shared responses in other stages. If very relevant, you may tastefully reference those insights, but primarily focus on the current stage: ${stage}.`
    : '';

  const prompt = `${guidance.focus}

**Current Stage:** ${stage}

**Stage Guidance:**
${guidance.prompts.join('\n')}

**Previous Responses:**
${responseHistory}${otherVisionsContext}

Generate ONE short, powerful question (≤ 15 words) that helps them explore this stage of their vision.

Return only the question.`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: COACH_CAL_PROMPT },
      { role: 'user', content: prompt }
    ],
    temperature: 0.9,
    max_tokens: 50
  });

  return completion.choices[0].message.content.trim();
}

async function generateVisionTitleAndCategories(responses) {
  const CATEGORIES = ['health', 'wealth', 'relationships', 'play', 'love', 'purpose', 'spirit', 'healing'];
  
  const responseSummary = responses.map((r, i) => `${i + 1}. [${r.stage}] ${r.question}\n   Answer: ${r.answer}`).join('\n\n');

  const prompt = `Based on these vision responses, generate a title and identify relevant life categories:

${responseSummary}

Available categories: ${CATEGORIES.join(', ')}

Return ONLY a JSON object with this exact format:
{
  "title": "2-5 word title capturing the essence of this vision",
  "categories": ["array", "of", "relevant", "categories"]
}

Guidelines:
- Title should be specific and inspiring (e.g., "Financial Freedom", "Dream Partnership", "Peak Vitality")
- Categories should be all that are clearly relevant (1-3 typically, but could be more)
- Be selective with categories - only include if strongly present

Return only the JSON object.`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    max_tokens: 100
  });

  try {
    const result = JSON.parse(completion.choices[0].message.content.trim());
    return {
      title: result.title || 'Untitled Vision',
      categories: Array.isArray(result.categories) ? result.categories.filter(cat => CATEGORIES.includes(cat)) : []
    };
  } catch (error) {
    console.error('Failed to parse title and categories:', error);
    return { title: 'Untitled Vision', categories: [] };
  }
}

async function generateVisionSummaryNew(responses) {
  const responseSummary = responses.map((r, i) => `${i + 1}. [${r.stage}] ${r.question}\n   Answer: ${r.answer}`).join('\n\n');

  const prompt = `Create a comprehensive, inspiring vision summary (8-12 sentences) based on these responses:

${responseSummary}

This summary should:
- Be written in first person ("I") to help them see and feel themselves living this vision
- Capture the depth across all five stages: Vision, Belief, Identity, Embodiment, Action
- Include specific details, emotions, and aspirations they've shared
- Paint a vivid, inspiring picture of what they're creating
- Feel personal, specific, and emotionally resonant

Return only the summary, nothing else.`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.8,
    max_tokens: 600
  });

  return completion.choices[0].message.content.trim();
}

async function generateVisionTagline(summary) {
  const prompt = `Create a personal tagline (8-12 words) from this vision summary:

"${summary}"

Guidelines:
- Write in first person, beginning with "I"
- Capture the essence of their vision
- Make it inspiring and empowering

Return only the tagline, starting with "I".`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.8,
    max_tokens: 30
  });

  return completion.choices[0].message.content.trim().replace(/^["']|["']$/g, '');
}

async function determineStageToDeepen(responses) {
  const STAGES = ['Vision', 'Belief', 'Identity', 'Embodiment', 'Action'];
  
  const stageGroups = {};
  STAGES.forEach(stage => {
    stageGroups[stage] = responses.filter(r => r.stage === stage);
  });

  const stageSummary = STAGES.map(stage => {
    const count = stageGroups[stage].length;
    const answers = stageGroups[stage].map((r, i) => `${i + 1}. ${r.question}\n   ${r.answer}`).join('\n');
    return `**${stage}** (${count} responses):\n${answers || 'No responses yet'}`;
  }).join('\n\n');

  const prompt = `Analyze these vision responses and determine which stage would benefit most from deepening:

${stageSummary}

Consider:
- Which stage has the least development or depth?
- Which stage has generic or surface-level responses that could use more color and specificity?
- Which stage feels incomplete or could unlock more clarity if explored further?

Return ONLY the stage name (one word: Vision, Belief, Identity, Embodiment, or Action). Nothing else.`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: COACH_CAL_PROMPT },
      { role: 'user', content: prompt }
    ],
    temperature: 0.7,
    max_tokens: 10
  });

  const stage = completion.choices[0].message.content.trim();
  return STAGES.includes(stage) ? stage : STAGES[0];
}

module.exports = {
  generateScript,
  generateTitle,
  generateNextPrompt,
  generateTagline,
  synthesizeVisionStatement,
  generateVisionSummary,
  detectRelevantCategories,
  generateVisionQuestion,
  generateVisionTitleAndCategories,
  generateVisionSummaryNew,
  generateVisionTagline,
  determineStageToDeepen
};
