const { supabase, supabaseAdmin } = require('../config/supabase');
const aiService = require('./aiService');

const CATEGORIES = [
  'freeform', 'health', 'wealth', 'relationships', 
  'play', 'love', 'purpose', 'spirit', 'healing'
];

const FIXED_PROMPTS = {
  health: [
    "What does vibrant health feel like in your body?",
    "What daily practices support your optimal wellbeing?"
  ],
  wealth: [
    "What does financial abundance mean to you?",
    "How do you want to feel about money and resources?"
  ],
  relationships: [
    "What qualities do you embody in your most fulfilling connections?",
    "How do you want to show up in your relationships?"
  ],
  play: [
    "When do you feel most alive and joyful?",
    "What forms of play call to your spirit?"
  ],
  love: [
    "What does love feel like when it flows freely through you?",
    "How do you express and receive love?"
  ],
  purpose: [
    "What impact do you want to create in the world?",
    "What lights you up and gives your life meaning?"
  ],
  spirit: [
    "How do you experience your connection to something greater?",
    "What spiritual practices nourish your soul?"
  ],
  healing: [
    "What are you ready to release or transform?",
    "What does wholeness feel like for you?"
  ],
  freeform: [
    "If you could shift or create one thing in your life right now, what would it be?",
    "Who do you get to be to create this shift in your life?"
  ]
};

async function getUserCategories(userId) {
  const { data: visions } = await supabase
    .from('vision_statements')
    .select('category, statement, tagline')
    .eq('user_id', userId)
    .eq('is_active', true);

  const visionMap = {};
  visions?.forEach(v => {
    visionMap[v.category] = { statement: v.statement, tagline: v.tagline };
  });

  return CATEGORIES.map(category => ({
    name: category,
    status: visionMap[category] ? 'in_progress' : 'not_started',
    tagline: visionMap[category]?.tagline || null
  }));
}

async function getCategoryVision(userId, category) {
  const { data: vision } = await supabase
    .from('vision_statements')
    .select('*')
    .eq('user_id', userId)
    .eq('category', category)
    .eq('is_active', true)
    .single();

  const { data: responses } = await supabase
    .from('vision_responses')
    .select('*')
    .eq('user_id', userId)
    .eq('category', category)
    .order('created_at', { ascending: true });

  return {
    statement: vision?.statement || null,
    tagline: vision?.tagline || null,
    responses: responses || []
  };
}

async function updateVisionStatement(userId, category, statement) {
  const tagline = await aiService.generateTagline(statement);

  const { error } = await supabase
    .from('vision_statements')
    .update({ is_active: false })
    .eq('user_id', userId)
    .eq('category', category);

  const { error: insertError } = await supabaseAdmin
    .from('vision_statements')
    .insert({
      user_id: userId,
      category,
      statement,
      tagline,
      is_active: true,
      created_at: new Date().toISOString()
    });

  if (insertError) {
    throw new Error('Failed to update vision statement: ' + insertError.message);
  }
}

async function processPromptFlow(userId, category, responses) {
  const allResponses = [...responses];
  
  // Get the current active vision (if any) to potentially restore on failure
  const { data: previousVision } = await supabase
    .from('vision_statements')
    .select('id')
    .eq('user_id', userId)
    .eq('category', category)
    .eq('is_active', true)
    .single();
  
  // Deactivate previous vision statements for this category
  await supabase
    .from('vision_statements')
    .update({ is_active: false })
    .eq('user_id', userId)
    .eq('category', category);

  // Create a new vision statement with 'processing' status
  const { data: visionData, error: insertError } = await supabaseAdmin
    .from('vision_statements')
    .insert({
      user_id: userId,
      category,
      statement: null,
      tagline: null,
      status: 'processing',
      is_active: true,
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (insertError) {
    throw new Error('Failed to create vision statement: ' + insertError.message);
  }

  // Save responses
  for (const response of allResponses) {
    await supabaseAdmin
      .from('vision_responses')
      .insert({
        user_id: userId,
        category,
        question: response.question,
        answer: response.answer,
        created_at: new Date().toISOString()
      });
  }

  // Process AI generation in the background (non-blocking)
  processVisionInBackground(visionData.id, category, allResponses, previousVision?.id).catch(err => {
    console.error('Background vision processing error:', err);
  });

  // Return immediately with the vision ID and processing status
  return { 
    visionId: visionData.id,
    status: 'processing',
    category
  };
}

async function processVisionInBackground(visionId, category, responses, previousVisionId = null) {
  try {
    console.log(`🧠 Starting background vision processing for ${visionId}`);
    
    const statement = await aiService.synthesizeVisionStatement(category, responses);
    const tagline = await aiService.generateTagline(statement);

    await supabaseAdmin
      .from('vision_statements')
      .update({
        statement,
        tagline,
        status: 'completed'
      })
      .eq('id', visionId);

    console.log(`✅ Vision processing completed for ${visionId}`);
  } catch (error) {
    console.error(`❌ Vision processing failed for ${visionId}:`, error);
    
    // Mark the new vision as failed
    await supabaseAdmin
      .from('vision_statements')
      .update({
        status: 'failed',
        is_active: false
      })
      .eq('id', visionId);

    // Restore the previous vision if it exists
    if (previousVisionId) {
      console.log(`🔄 Restoring previous vision ${previousVisionId} after failure`);
      await supabaseAdmin
        .from('vision_statements')
        .update({
          is_active: true
        })
        .eq('id', previousVisionId);
    }
  }
}

async function generateNextPrompt(userId, category, previousResponses) {
  const fixedPrompts = FIXED_PROMPTS[category] || FIXED_PROMPTS.freeform;
  
  if (previousResponses.length < fixedPrompts.length) {
    return fixedPrompts[previousResponses.length];
  }

  return await aiService.generateNextPrompt(category, previousResponses);
}

async function getVisionStatus(userId, visionId) {
  const { data: vision, error } = await supabase
    .from('vision_statements')
    .select('*')
    .eq('id', visionId)
    .eq('user_id', userId)
    .single();

  if (error || !vision) {
    throw new Error('Vision not found');
  }

  return {
    visionId: vision.id,
    status: vision.status,
    statement: vision.statement,
    tagline: vision.tagline,
    category: vision.category
  };
}

module.exports = {
  getUserCategories,
  getCategoryVision,
  updateVisionStatement,
  processPromptFlow,
  generateNextPrompt,
  getVisionStatus
};
