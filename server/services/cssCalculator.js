/**
 * Context Sufficiency Score (CSS) Calculator
 * Hybrid AI + deterministic system for evaluating vision response depth
 */

const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || ''
});

// Coverage requirements for each category
const COVERAGE_SLOTS = {
  Vision: {
    required: 3,
    slots: [
      'specific_goal',
      'scene_location_timeframe',
      'people_involved',
      'sensory_details',
      'success_criteria'
    ]
  },
  Emotion: {
    required: 2,
    slots: [
      'named_emotions',
      'body_sensations',
      'frequency_words',
      'peak_memory_anchor'
    ]
  },
  Belief: {
    required: 2,
    slots: [
      'limiting_belief',
      'empowering_belief',
      'evidence_reframe'
    ]
  },
  Identity: {
    required: 2,
    slots: [
      'i_am_traits',
      'daily_behaviors',
      'others_experience',
      'energetic_signature'
    ]
  },
  Embodiment: {
    required: 3,
    slots: [
      'daily_rituals',
      'near_term_actions',
      'act_as_if',
      'signs_synchronicities',
      'surrender_trust'
    ]
  }
};

// Sensory/emotional lexicons for richness detection
const SENSORY_WORDS = [
  'see', 'seeing', 'saw', 'look', 'looking', 'watch', 'watching', 'view', 'visible',
  'hear', 'hearing', 'heard', 'listen', 'listening', 'sound', 'sounds',
  'feel', 'feeling', 'felt', 'touch', 'touching', 'sensation', 'warm', 'cold', 'soft', 'hard',
  'smell', 'smelling', 'scent', 'fragrance', 'aroma',
  'taste', 'tasting', 'flavor', 'sweet', 'bitter'
];

const EMOTION_WORDS = [
  'joy', 'joyful', 'happy', 'happiness', 'excited', 'excitement',
  'love', 'loving', 'loved', 'peaceful', 'peace', 'calm', 'serene',
  'free', 'freedom', 'liberated', 'powerful', 'power', 'empowered',
  'grateful', 'gratitude', 'thankful', 'blessed',
  'confident', 'confidence', 'certain', 'sure',
  'afraid', 'fear', 'fearful', 'anxious', 'anxiety', 'worried', 'worry',
  'sad', 'sadness', 'grief', 'angry', 'anger'
];

const HEDGE_WORDS = ['maybe', 'perhaps', 'kinda', 'sorta', 'possibly', 'might', 'could'];
const VAGUE_WORDS = ['soon', 'later', 'more', 'better', 'things', 'stuff'];

/**
 * Ask AI to analyze a response and extract metadata for CSS calculation
 */
async function analyzeResponseWithAI(category, question, answer, previousResponses = []) {
  const responseContext = previousResponses.length > 0
    ? `\n\nPrevious responses in this category:\n${previousResponses.map((r, i) => `${i + 1}. ${r.question}\n   ${r.answer}`).join('\n\n')}`
    : '';

  const prompt = `Analyze this user response for a vision evocation conversation in the "${category}" category.

**Question:** ${question}
**Answer:** ${answer}${responseContext}

Extract the following information and return ONLY a valid JSON object:

{
  "categories_addressed": ["Primary category plus any other categories this answer clearly addresses"],
  "coverage_hits": ["List of coverage slots hit from: ${COVERAGE_SLOTS[category].slots.join(', ')}"],
  "specificity_markers": {
    "numbers": ["Any numbers, amounts, dates, durations mentioned"],
    "names": ["Any names, places, specific entities mentioned"],
    "measurables": ["Any measurable outcomes or metrics"]
  },
  "sensory_emotional_hits": {
    "sensory": ["Sensory words/descriptions found"],
    "emotions": ["Emotion words found"],
    "body_sensations": ["Body/somatic descriptions found"]
  },
  "action_identity_markers": {
    "i_am_statements": ["Any 'I am' declarations"],
    "future_actions": ["Specific future actions/rituals mentioned"],
    "behaviors": ["Daily behaviors or habits described"]
  },
  "coherence_issues": {
    "hedges": ["Hedge words like maybe, kinda found"],
    "contradictions": ["Any contradictory statements"],
    "vagueness": ["Vague statements that need clarification"]
  },
  "proposed_css": 0.75,
  "rationale": "Brief explanation of why this score makes sense",
  "weakest_signal": "Which of the 5 signals (length, specificity, richness, action/identity, coherence) needs most improvement"
}

Be precise and only include what's actually present. If something isn't there, use empty arrays or null.`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      response_format: { type: 'json_object' }
    });

    return JSON.parse(completion.choices[0].message.content);
  } catch (error) {
    console.error('AI analysis failed:', error);
    // Fallback to basic analysis
    return {
      categories_addressed: [category],
      coverage_hits: [],
      specificity_markers: { numbers: [], names: [], measurables: [] },
      sensory_emotional_hits: { sensory: [], emotions: [], body_sensations: [] },
      action_identity_markers: { i_am_statements: [], future_actions: [], behaviors: [] },
      coherence_issues: { hedges: [], contradictions: [], vagueness: [] },
      proposed_css: 0.5,
      rationale: 'AI analysis unavailable, using fallback',
      weakest_signal: 'specificity'
    };
  }
}

/**
 * Calculate deterministic CSS from AI-extracted metadata
 */
function calculateCSS(answer, aiAnalysis, category) {
  const tokens = answer.split(/\s+/).length;
  
  // 1. Length & Coverage (w=0.20)
  const lengthScore = Math.min(tokens / 50, 1.0); // Full credit at 50 tokens
  const coverageHits = aiAnalysis.coverage_hits.length;
  const coverageRequired = COVERAGE_SLOTS[category].required;
  const coverageScore = Math.min(coverageHits / coverageRequired, 1.0);
  const lengthCoverageScore = (lengthScore * 0.5) + (coverageScore * 0.5);
  
  // 2. Specificity (w=0.25)
  const { numbers, names, measurables } = aiAnalysis.specificity_markers;
  const specificityCount = numbers.length + names.length + measurables.length;
  const specificityScore = Math.min(specificityCount / 5, 1.0); // Saturates at 5 markers
  
  // 3. Sensory/Emotional Richness (w=0.20)
  const { sensory, emotions, body_sensations } = aiAnalysis.sensory_emotional_hits;
  const richnessCount = sensory.length + emotions.length + body_sensations.length;
  const richnessScore = Math.min(richnessCount / 6, 1.0); // Saturates at 6 hits
  
  // 4. Actionability/Identity Clarity (w=0.20)
  const { i_am_statements, future_actions, behaviors } = aiAnalysis.action_identity_markers;
  const actionCount = i_am_statements.length + future_actions.length + behaviors.length;
  const actionScore = Math.min(actionCount / 4, 1.0); // Saturates at 4 items
  
  // 5. Coherence/Confidence (w=0.15)
  const { hedges, contradictions, vagueness } = aiAnalysis.coherence_issues;
  const coherencePenalty = (hedges.length * 0.1) + (contradictions.length * 0.2) + (vagueness.length * 0.1);
  const coherenceScore = Math.max(1.0 - coherencePenalty, 0);
  
  // Weighted final CSS
  const calculatedCSS = 
    (lengthCoverageScore * 0.20) +
    (specificityScore * 0.25) +
    (richnessScore * 0.20) +
    (actionScore * 0.20) +
    (coherenceScore * 0.15);
  
  // Blend AI's proposed CSS with calculated (70% calculated, 30% AI)
  const finalCSS = (calculatedCSS * 0.7) + (aiAnalysis.proposed_css * 0.3);
  
  // Clamp to [0, 1]
  return Math.max(0, Math.min(1, finalCSS));
}

/**
 * Determine decision band based on CSS
 */
function getDecisionBand(css) {
  if (css >= 0.70) return 'ADVANCE';
  if (css >= 0.40) return 'CLARIFY';
  return 'EVOKE';
}

/**
 * Calculate CSS for a single response
 */
async function calculateResponseCSS(category, question, answer, previousResponses = []) {
  // Step 1: AI analyzes and extracts metadata
  const aiAnalysis = await analyzeResponseWithAI(category, question, answer, previousResponses);
  
  // Step 2: Backend calculates deterministic CSS
  const css = calculateCSS(answer, aiAnalysis, category);
  
  // Step 3: Determine decision band
  const decisionBand = getDecisionBand(css);
  
  return {
    css: Math.round(css * 100) / 100, // Round to 2 decimals
    decisionBand,
    aiAnalysis,
    subscores: {
      lengthCoverage: calculateCSS(answer, aiAnalysis, category) * 0.20,
      specificity: calculateCSS(answer, aiAnalysis, category) * 0.25,
      richness: calculateCSS(answer, aiAnalysis, category) * 0.20,
      actionIdentity: calculateCSS(answer, aiAnalysis, category) * 0.20,
      coherence: calculateCSS(answer, aiAnalysis, category) * 0.15
    },
    coverageHits: aiAnalysis.coverage_hits,
    categoriesAddressed: aiAnalysis.categories_addressed,
    weakestSignal: aiAnalysis.weakest_signal
  };
}

/**
 * Calculate aggregate CSS for a category across all responses
 */
async function calculateCategoryCSS(category, responses) {
  if (responses.length === 0) {
    return {
      css: 0,
      coverage: {},
      subscores: {},
      last_scored: null
    };
  }
  
  // Calculate CSS for most recent response (represents current state)
  const latestResponse = responses[responses.length - 1];
  const previousResponses = responses.slice(0, -1);
  
  const result = await calculateResponseCSS(
    category,
    latestResponse.question,
    latestResponse.answer,
    previousResponses
  );
  
  return {
    css: result.css,
    coverage: {
      hits: result.coverageHits,
      required: COVERAGE_SLOTS[category].required,
      met: result.coverageHits.length >= COVERAGE_SLOTS[category].required
    },
    subscores: result.subscores,
    decision_band: result.decisionBand,
    weakest_signal: result.weakestSignal,
    last_scored: new Date().toISOString()
  };
}

module.exports = {
  calculateResponseCSS,
  calculateCategoryCSS,
  getDecisionBand,
  COVERAGE_SLOTS
};
