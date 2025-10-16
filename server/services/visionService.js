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
    .select('category, statement, tagline, summary')
    .eq('user_id', userId)
    .eq('is_active', true);

  const visionMap = {};
  visions?.forEach(v => {
    visionMap[v.category] = { 
      statement: v.statement, 
      tagline: v.tagline,
      summary: v.summary 
    };
  });

  return CATEGORIES.map(category => ({
    name: category,
    status: visionMap[category] ? 'in_progress' : 'not_started',
    tagline: visionMap[category]?.tagline || null,
    hasSummary: !!visionMap[category]?.summary
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
    summary: vision?.summary || null,
    status: vision?.status || 'not_started',
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
    
    // Generate core vision content
    const statement = await aiService.synthesizeVisionStatement(category, responses);
    const tagline = await aiService.generateTagline(statement);
    const summary = await aiService.generateVisionSummary(category, responses);

    // Update the primary category vision
    await supabaseAdmin
      .from('vision_statements')
      .update({
        statement,
        tagline,
        summary,
        status: 'completed'
      })
      .eq('id', visionId);

    console.log(`✅ Vision processing completed for ${visionId}`);
    
    // Detect and update cross-category relevance
    await detectAndUpdateCrossCategories(visionId, category, responses);
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

async function detectAndUpdateCrossCategories(visionId, primaryCategory, responses) {
  try {
    console.log(`🔍 Detecting cross-category relevance for vision ${visionId}`);
    
    // Get user ID from vision
    const { data: vision } = await supabase
      .from('vision_statements')
      .select('user_id')
      .eq('id', visionId)
      .single();
    
    if (!vision) return;
    
    // Analyze each response for cross-category relevance
    const allRelevantCategories = new Set([primaryCategory]);
    
    for (const response of responses) {
      const categories = await aiService.detectRelevantCategories(response.answer);
      categories.forEach(cat => {
        if (cat !== primaryCategory) {
          allRelevantCategories.add(cat);
        }
      });
    }
    
    // Remove primary category from the set
    allRelevantCategories.delete(primaryCategory);
    
    if (allRelevantCategories.size === 0) {
      console.log(`No cross-category relevance detected`);
      return;
    }
    
    console.log(`📊 Found cross-category relevance: ${Array.from(allRelevantCategories).join(', ')}`);
    
    // Update or create vision summaries for each relevant category
    for (const relatedCategory of allRelevantCategories) {
      // Get existing vision responses for this category
      const { data: existingResponses } = await supabase
        .from('vision_responses')
        .select('question, answer')
        .eq('user_id', vision.user_id)
        .eq('category', relatedCategory)
        .order('created_at', { ascending: true });
      
      // Combine existing responses with relevant new ones
      const relevantResponses = responses.filter(async r => {
        const cats = await aiService.detectRelevantCategories(r.answer);
        return cats.includes(relatedCategory);
      });
      
      const allResponses = [...(existingResponses || []), ...relevantResponses];
      
      if (allResponses.length === 0) continue;
      
      // Generate new summary for this category
      const summary = await aiService.generateVisionSummary(relatedCategory, allResponses);
      
      // Check if vision statement exists for this category
      const { data: existingVision } = await supabase
        .from('vision_statements')
        .select('id')
        .eq('user_id', vision.user_id)
        .eq('category', relatedCategory)
        .eq('is_active', true)
        .single();
      
      if (existingVision) {
        // Update existing vision summary
        await supabaseAdmin
          .from('vision_statements')
          .update({ summary })
          .eq('id', existingVision.id);
        
        console.log(`✨ Updated cross-category summary for: ${relatedCategory}`);
      } else {
        // Create new vision statement with summary
        await supabaseAdmin
          .from('vision_statements')
          .insert({
            user_id: vision.user_id,
            category: relatedCategory,
            statement: null,
            tagline: null,
            summary,
            status: 'completed',
            is_active: true,
            created_at: new Date().toISOString()
          });
        
        console.log(`✨ Created new cross-category summary for: ${relatedCategory}`);
      }
    }
  } catch (error) {
    console.error('Cross-category detection error:', error);
    // Don't fail the whole process if cross-category detection fails
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
