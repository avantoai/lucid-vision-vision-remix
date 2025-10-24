const { supabase, supabaseAdmin } = require('../config/supabase');
const aiService = require('./aiService');

const TARGET_WORD_COUNT = 600; // 100% completeness at 600 words

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
      total_word_count: 0,
      overall_completeness: 0,
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
  
  console.log(`📦 Vision data fetched:`, {
    id: vision.id,
    title: vision.title,
    responseCount: vision.responses?.length || 0,
    responses: vision.responses?.map(r => ({ q: r.question?.substring(0, 30), a: r.answer?.substring(0, 30) }))
  });
  
  // Get vision category from the vision's categories array (use first or 'general')
  const visionCategory = (vision.categories && vision.categories.length > 0) 
    ? vision.categories[0] 
    : vision.title || 'your vision';
  
  const responses = vision.responses.map(r => ({
    question: r.question,
    answer: r.answer
  }));

  console.log(`🎯 Generating next question for vision: ${vision.title} (${responses.length} previous responses)`);
  console.log(`📊 Progress: ${vision.total_word_count || 0}/${TARGET_WORD_COUNT} words (${vision.overall_completeness || 0}%)`);
  
  // Generate question using AI (no CSS, just conversation flow)
  const question = await aiService.generateNextVisionQuestion(visionCategory, responses);
  
  return {
    question
  };
}

async function submitResponse(visionId, userId, question, answer) {
  const vision = await getVision(visionId, userId);
  const isFirstResponse = vision.responses.length === 0;
  const wasFirstFlow = !vision.title || vision.title === 'Untitled Vision';

  // Step 1: Count words in this answer
  const wordCount = answer.trim().split(/\s+/).length;
  console.log(`📝 New response: ${wordCount} words`);

  // Step 2: Insert the response (no category tagging needed)
  await supabaseAdmin
    .from('vision_responses')
    .insert({
      user_id: userId,
      vision_id: visionId,
      question,
      answer,
      created_at: new Date().toISOString()
    });

  // Step 3: Calculate total word count and completeness
  const previousWordCount = vision.total_word_count || 0;
  const newTotalWordCount = previousWordCount + wordCount;
  const overallCompleteness = Math.min(100, Math.round((newTotalWordCount / TARGET_WORD_COUNT) * 100));

  console.log(`📊 Updated stats:`);
  console.log(`   Total words: ${newTotalWordCount}/${TARGET_WORD_COUNT}`);
  console.log(`   Completeness: ${overallCompleteness}%`);

  // Step 4: Update vision with new word count
  const { error: updateError } = await supabaseAdmin
    .from('visions')
    .update({
      total_word_count: newTotalWordCount,
      overall_completeness: overallCompleteness,
      updated_at: new Date().toISOString()
    })
    .eq('id', visionId);
  
  if (updateError) {
    console.error(`❌ Failed to update vision:`, updateError);
    throw new Error(`Failed to update vision: ${updateError.message}`);
  }
  
  console.log(`✅ Vision updated successfully`);

  // Step 5: Auto-generate content based on flow detection
  const allResponses = [
    ...vision.responses.map(r => ({ question: r.question, answer: r.answer })),
    { question, answer }
  ];
  
  // Generate title only on first flow (after first response)
  if (wasFirstFlow && isFirstResponse) {
    console.log(`🏷️ First flow detected - generating title`);
    generateTitleAndCategoriesInBackground(visionId, allResponses).catch(err => {
      console.error('Background title generation error:', err);
    });
  }

  // Always regenerate summary and tagline after each flow
  console.log(`✨ Regenerating summary and tagline`);
  generateSummaryAndTaglineInBackground(visionId, allResponses).catch(err => {
    console.error('Background summary generation error:', err);
  });

  return { 
    overall_completeness: overallCompleteness,
    total_word_count: newTotalWordCount
  };
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
    console.log(`   📝 Responses to process: ${responses.length}`);
    
    if (responses.length === 0) {
      console.log(`   ⚠️ No responses provided, skipping title generation`);
      return;
    }
    
    const { title, categories } = await aiService.generateVisionTitleAndCategories(responses);
    console.log(`   ✓ AI generated title: "${title}"`);
    console.log(`   ✓ AI generated categories: ${categories.join(', ')}`);

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

    console.log(`✅ Title and categories updated in database for ${visionId}`);
  } catch (error) {
    console.error(`❌ Title generation failed for ${visionId}:`, error);
    console.error(`   Error details:`, error.message, error.stack);
  }
}

async function generateSummaryAndTaglineInBackground(visionId, responses) {
  try {
    console.log(`✨ Generating summary and tagline for vision ${visionId}`);
    
    const summary = await aiService.generateVisionSummaryNew(responses);
    console.log(`   ✓ Summary generated (${summary.length} chars)`);
    
    const tagline = await aiService.generateVisionTagline(responses, summary);
    console.log(`   ✓ Tagline: "${tagline}"`);

    const { error: updateError } = await supabaseAdmin
      .from('visions')
      .update({
        summary,
        tagline,
        updated_at: new Date().toISOString()
      })
      .eq('id', visionId);

    if (updateError) {
      throw new Error(`Failed to update vision summary: ${updateError.message}`);
    }

    console.log(`✅ Summary and tagline updated for ${visionId}`);
  } catch (error) {
    console.error(`❌ Summary generation failed for ${visionId}:`, error);
  }
}

async function processVisionInBackground(visionId, responses) {
  try {
    console.log(`🧠 Starting background vision processing for ${visionId}`);
    
    console.log(`   Generating summary...`);
    const summary = await aiService.generateVisionSummaryNew(responses);
    console.log(`   ✓ Summary generated (${summary.length} chars)`);
    
    console.log(`   Generating tagline...`);
    const tagline = await aiService.generateVisionTagline(allResponses, summary);
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

async function updateVisionCategories(visionId, userId, categories) {
  const { error } = await supabaseAdmin
    .from('visions')
    .update({
      categories: categories,
      updated_at: new Date().toISOString()
    })
    .eq('id', visionId)
    .eq('user_id', userId);

  if (error) {
    throw new Error('Failed to update vision categories: ' + error.message);
  }

  return { success: true };
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
  updateVisionCategories
};
