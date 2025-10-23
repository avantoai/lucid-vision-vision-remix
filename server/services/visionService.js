const { supabase, supabaseAdmin } = require('../config/supabase');
const aiService = require('./aiService');
const cssCalculator = require('./cssCalculator');

const CATEGORIES = ['Vision', 'Emotion', 'Belief', 'Identity', 'Embodiment'];

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
      context_depth: {
        Vision: { css: 0, coverage: {}, subscores: {}, last_scored: null },
        Emotion: { css: 0, coverage: {}, subscores: {}, last_scored: null },
        Belief: { css: 0, coverage: {}, subscores: {}, last_scored: null },
        Identity: { css: 0, coverage: {}, subscores: {}, last_scored: null },
        Embodiment: { css: 0, coverage: {}, subscores: {}, last_scored: null }
      },
      css_vision: 0,
      css_emotion: 0,
      css_belief: 0,
      css_identity: 0,
      css_embodiment: 0,
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
  
  const responses = vision.responses.map(r => ({
    category: r.category,
    question: r.question,
    answer: r.answer
  }));

  // Determine which category needs work based on CSS scores
  const contextDepth = vision.context_depth || {};
  const nextCategory = aiService.determineNextCategory(contextDepth);
  
  console.log(`📊 CSS Scores: Vision=${contextDepth.Vision?.css || 0}, Emotion=${contextDepth.Emotion?.css || 0}, Belief=${contextDepth.Belief?.css || 0}, Identity=${contextDepth.Identity?.css || 0}, Embodiment=${contextDepth.Embodiment?.css || 0}`);
  console.log(`🎯 Next category: ${nextCategory}`);
  
  // Get CSS analysis for this category
  const categoryCSS = contextDepth[nextCategory] || { css: 0, coverage: {}, weakest_signal: 'specificity' };
  
  // Generate question using CSS context
  const question = await aiService.generateNextCategoryQuestion(nextCategory, responses, categoryCSS);
  
  return {
    question,
    category: nextCategory
  };
}

async function submitResponse(visionId, userId, category, question, answer) {
  const vision = await getVision(visionId, userId);
  const isFirstResponse = vision.responses.length === 0;
  const wasFirstFlow = !vision.title || vision.title === 'Untitled Vision';

  // Step 1: Calculate CSS for this response
  console.log(`🧮 Calculating CSS for ${category} response...`);
  const categoryResponses = vision.responses.filter(r => r.category === category);
  const cssResult = await cssCalculator.calculateResponseCSS(category, question, answer, categoryResponses);
  
  console.log(`   ✓ CSS: ${cssResult.css} (${cssResult.decisionBand})`);
  console.log(`   ✓ Categories addressed: ${cssResult.categoriesAddressed.join(', ')}`);
  console.log(`   ✓ Weakest signal: ${cssResult.weakestSignal}`);

  // Step 2: Insert the response with category tagging
  await supabaseAdmin
    .from('vision_responses')
    .insert({
      user_id: userId,
      vision_id: visionId,
      category: category,
      categories_addressed: cssResult.categoriesAddressed,
      question,
      answer,
      created_at: new Date().toISOString()
    });

  // Step 3: Update context_depth for all addressed categories
  const updatedContextDepth = { ...(vision.context_depth || {}) };
  const cssUpdates = {};
  
  // Reuse the CSS we already calculated instead of recalculating for each category
  const cssData = {
    css: cssResult.css,
    coverage: {
      hits: cssResult.coverageHits,
      required: cssCalculator.COVERAGE_SLOTS[category]?.required || 0,
      met: cssResult.coverageHits.length >= (cssCalculator.COVERAGE_SLOTS[category]?.required || 0)
    },
    subscores: cssResult.subscores,
    decision_band: cssResult.decisionBand,
    weakest_signal: cssResult.weakestSignal,
    last_scored: new Date().toISOString()
  };
  
  console.log(`🔄 Processing categories addressed: ${JSON.stringify(cssResult.categoriesAddressed)}`);
  
  for (const cat of cssResult.categoriesAddressed) {
    console.log(`   Updating category: ${cat} with CSS ${cssData.css}`);
    updatedContextDepth[cat] = cssData;
    cssUpdates[`css_${cat.toLowerCase()}`] = cssData.css;
  }
  
  console.log(`🔄 After loop - cssUpdates keys: ${Object.keys(cssUpdates).join(', ')}`);

  // Calculate overall completeness (average CSS * 100)
  const avgCSS = CATEGORIES.reduce((sum, cat) => sum + (updatedContextDepth[cat]?.css || 0), 0) / 5;
  const overallCompleteness = Math.round(avgCSS * 100);

  // Step 4: Update vision with new CSS data
  console.log(`📝 Updating vision ${visionId}:`);
  console.log(`   Overall completeness: ${overallCompleteness}%`);
  console.log(`   CSS updates:`, cssUpdates);
  console.log(`   Categories in context_depth:`, Object.keys(updatedContextDepth));
  
  const { data: updateData, error: updateError } = await supabaseAdmin
    .from('visions')
    .update({
      context_depth: updatedContextDepth,
      ...cssUpdates,
      overall_completeness: overallCompleteness,
      last_scored_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', visionId);
  
  if (updateError) {
    console.error(`❌ Failed to update vision CSS:`, updateError);
    throw new Error(`Failed to update vision CSS: ${updateError.message}`);
  }
  
  console.log(`✅ Vision updated successfully`);

  // Step 5: Auto-generate content based on flow detection
  const allResponses = [
    ...vision.responses.map(r => ({ category: r.category, question: r.question, answer: r.answer })),
    { category, question, answer }
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
    css_scores: {
      vision: updatedContextDepth.Vision?.css || 0,
      emotion: updatedContextDepth.Emotion?.css || 0,
      belief: updatedContextDepth.Belief?.css || 0,
      identity: updatedContextDepth.Identity?.css || 0,
      embodiment: updatedContextDepth.Embodiment?.css || 0
    }
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

module.exports = {
  getAllVisions,
  getVision,
  createVision,
  generateNextQuestion,
  submitResponse,
  processVisionSummary,
  deleteVision,
  updateVisionTitle
};
