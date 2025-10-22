const { supabase, supabaseAdmin } = require('../config/supabase');
const aiService = require('./aiService');

const STAGES = ['Vision', 'Belief', 'Identity', 'Embodiment', 'Action'];
const STAGE_ORDER = {
  'Vision': 0,
  'Belief': 1,
  'Identity': 2,
  'Embodiment': 3,
  'Action': 4
};

async function getAllVisions(userId) {
  const { data: visions, error } = await supabaseAdmin
    .from('visions')
    .select(`
      *,
      vision_responses(id)
    `)
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) {
    throw new Error('Failed to fetch visions: ' + error.message);
  }

  // Separate visions with content from empty ones
  const emptyVisions = [];
  const visionsWithContent = [];
  
  (visions || []).forEach(vision => {
    if (!vision.vision_responses || vision.vision_responses.length === 0) {
      emptyVisions.push(vision.id);
    } else {
      visionsWithContent.push(vision);
    }
  });

  // Delete empty visions from database
  if (emptyVisions.length > 0) {
    await supabaseAdmin
      .from('visions')
      .delete()
      .in('id', emptyVisions);
    
    console.log(`🗑️ Deleted ${emptyVisions.length} empty vision(s)`);
  }

  // Remove the joined responses field from the return data
  return visionsWithContent.map(({ vision_responses, ...vision }) => vision);
}

async function getVision(visionId, userId) {
  const { data: vision, error } = await supabaseAdmin
    .from('visions')
    .select('*')
    .eq('id', visionId)
    .eq('user_id', userId)
    .single();

  if (error || !vision) {
    throw new Error('Vision not found');
  }

  const { data: responses } = await supabaseAdmin
    .from('vision_responses')
    .select('*')
    .eq('vision_id', visionId)
    .order('created_at', { ascending: true });

  const { data: meditations } = await supabaseAdmin
    .from('meditations')
    .select('id, title, duration, created_at, is_favorite, is_pinned')
    .eq('vision_id', visionId)
    .order('created_at', { ascending: false });

  return {
    ...vision,
    responses: responses || [],
    meditations: meditations || []
  };
}

async function createVision(userId) {
  const { data: vision, error } = await supabaseAdmin
    .from('visions')
    .insert({
      user_id: userId,
      title: 'Untitled Vision',
      categories: [],
      micro_tags: [],
      stage_progress: 0,
      summary: null,
      tagline: null,
      status: 'processing',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    throw new Error('Failed to create vision: ' + error.message);
  }

  return vision;
}

async function generateNextQuestion(visionId, userId) {
  const vision = await getVision(visionId, userId);
  
  const responses = vision.responses.map(r => ({
    stage: r.stage,
    question: r.question,
    answer: r.answer
  }));

  let currentStage;
  let stageIndex;
  
  if (vision.stage_progress >= 5) {
    // All 5 stages complete - determine which stage to deepen
    currentStage = await aiService.determineStageToDeepen(responses);
    stageIndex = STAGE_ORDER[currentStage];
    console.log(`🔄 All stages complete. Deepening stage: ${currentStage}`);
  } else {
    // Continue with next stage in sequence
    currentStage = STAGES[vision.stage_progress];
    stageIndex = vision.stage_progress;
  }
  
  const question = await aiService.generateVisionQuestion(currentStage, responses);
  
  return {
    question,
    stage: currentStage,
    stageIndex
  };
}

async function submitResponse(visionId, userId, stage, question, answer) {
  const vision = await getVision(visionId, userId);

  await supabaseAdmin
    .from('vision_responses')
    .insert({
      user_id: userId,
      vision_id: visionId,
      stage,
      question,
      answer,
      created_at: new Date().toISOString()
    });

  const stageIndex = STAGE_ORDER[stage];
  
  let newProgress = vision.stage_progress;
  if (stageIndex >= vision.stage_progress) {
    newProgress = stageIndex + 1;
  }

  await supabaseAdmin
    .from('visions')
    .update({
      stage_progress: newProgress,
      updated_at: new Date().toISOString()
    })
    .eq('id', visionId);

  // Generate title and categories after first Vision response
  if (stage === 'Vision' && vision.responses.length === 0) {
    const responses = [{
      stage,
      question,
      answer
    }];
    
    generateTitleAndCategoriesInBackground(visionId, responses).catch(err => {
      console.error('Background title generation error:', err);
    });
  }

  return { stage_progress: newProgress };
}

async function processVisionSummary(visionId, userId) {
  const vision = await getVision(visionId, userId);
  
  if (vision.responses.length === 0) {
    return;
  }

  processVisionInBackground(visionId, vision.responses).catch(err => {
    console.error('Background vision summary processing error:', err);
  });

  return { status: 'processing' };
}

async function generateTitleAndCategoriesInBackground(visionId, responses) {
  try {
    console.log(`🏷️ Generating title and categories for vision ${visionId}`);
    
    const { title, categories } = await aiService.generateVisionTitleAndCategories(responses);
    console.log(`   ✓ Title: "${title}"`);
    console.log(`   ✓ Categories: ${categories.join(', ')}`);

    const { error: updateError } = await supabaseAdmin
      .from('visions')
      .update({
        title,
        categories,
        updated_at: new Date().toISOString()
      })
      .eq('id', visionId);

    if (updateError) {
      throw new Error(`Failed to update vision title: ${updateError.message}`);
    }

    console.log(`✅ Title and categories updated for ${visionId}`);
  } catch (error) {
    console.error(`❌ Title generation failed for ${visionId}:`, error);
  }
}

async function processVisionInBackground(visionId, responses) {
  try {
    console.log(`🧠 Starting background vision processing for ${visionId}`);
    
    console.log(`   Generating summary...`);
    const summary = await aiService.generateVisionSummaryNew(responses);
    console.log(`   ✓ Summary generated (${summary.length} chars)`);
    
    console.log(`   Generating tagline...`);
    const tagline = await aiService.generateVisionTagline(summary);
    console.log(`   ✓ Tagline: "${tagline}"`);

    const { error: updateError } = await supabaseAdmin
      .from('visions')
      .update({
        summary,
        tagline,
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', visionId);

    if (updateError) {
      throw new Error(`Failed to update vision in database: ${updateError.message}`);
    }

    console.log(`✅ Vision processing completed for ${visionId}`);
  } catch (error) {
    console.error(`❌ Vision processing failed for ${visionId}:`, error);
    
    await supabaseAdmin
      .from('visions')
      .update({
        status: 'failed'
      })
      .eq('id', visionId);
  }
}

async function deleteVision(visionId, userId) {
  const { error } = await supabaseAdmin
    .from('visions')
    .delete()
    .eq('id', visionId)
    .eq('user_id', userId);

  if (error) {
    throw new Error('Failed to delete vision: ' + error.message);
  }

  return { success: true };
}

async function updateVisionTitle(visionId, userId, newTitle) {
  const { error } = await supabaseAdmin
    .from('visions')
    .update({
      title: newTitle,
      updated_at: new Date().toISOString()
    })
    .eq('id', visionId)
    .eq('user_id', userId);

  if (error) {
    throw new Error('Failed to update vision title: ' + error.message);
  }

  return { success: true };
}

async function determineNextStageForDeepening(visionId, userId) {
  const vision = await getVision(visionId, userId);
  
  if (vision.stage_progress < 5) {
    return STAGES[vision.stage_progress];
  }

  const stageToDeepen = await aiService.determineStageToDeepen(vision.responses);
  
  return stageToDeepen;
}

module.exports = {
  getAllVisions,
  getVision,
  createVision,
  generateNextQuestion,
  submitResponse,
  processVisionSummary,
  deleteVision,
  updateVisionTitle,
  determineNextStageForDeepening
};
