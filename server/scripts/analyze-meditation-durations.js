const { supabaseAdmin } = require('../config/supabase');

/**
 * Diagnostic script to analyze meditation TTS durations vs target durations
 * 
 * This script helps identify meditations where the voice track ends early.
 * It calculates the estimated TTS duration based on:
 * - Word count / 110 WPM (our standard pace)
 * - Total pause time from ElevenLabs <break> tags
 */

const WPM = 110; // Words per minute (THAR standard)

function extractWordCount(script) {
  // Remove break tags and count words
  const cleanScript = script.replace(/<break[^>]*>/g, '');
  const words = cleanScript.trim().split(/\s+/);
  return words.length;
}

function extractTotalPauseTime(script) {
  // Extract all <break time="X.Xs" /> tags and sum their durations
  const breakPattern = /<break time="([\d.]+)s"\s*\/>/g;
  let totalPauseSeconds = 0;
  let match;
  
  while ((match = breakPattern.exec(script)) !== null) {
    totalPauseSeconds += parseFloat(match[1]);
  }
  
  return totalPauseSeconds;
}

function calculateEstimatedTTSDuration(script) {
  const wordCount = extractWordCount(script);
  const totalPauseTime = extractTotalPauseTime(script);
  
  // Calculate speech time in seconds
  const speechTimeSeconds = (wordCount / WPM) * 60;
  
  // Total TTS duration = speech time + pause time
  const totalSeconds = speechTimeSeconds + totalPauseTime;
  const totalMinutes = totalSeconds / 60;
  
  return {
    wordCount,
    totalPauseTime,
    speechTimeSeconds,
    totalSeconds,
    totalMinutes
  };
}

async function analyzeMeditations() {
  console.log('🔍 Analyzing meditation durations...\n');
  
  try {
    // Fetch all completed meditations
    const { data: meditations, error } = await supabaseAdmin
      .from('meditations')
      .select('id, title, duration, script, created_at, category')
      .eq('status', 'completed')
      .order('created_at', { ascending: false });
    
    if (error) {
      throw error;
    }
    
    if (!meditations || meditations.length === 0) {
      console.log('No completed meditations found.');
      return;
    }
    
    console.log(`Found ${meditations.length} completed meditations\n`);
    console.log('='.repeat(120));
    
    const results = [];
    
    for (const meditation of meditations) {
      const targetDuration = meditation.duration; // in minutes
      const analysis = calculateEstimatedTTSDuration(meditation.script);
      
      const shortfallMinutes = targetDuration - analysis.totalMinutes;
      const percentageOfTarget = (analysis.totalMinutes / targetDuration) * 100;
      
      results.push({
        id: meditation.id,
        title: meditation.title,
        category: meditation.category,
        targetDuration,
        estimatedTTSDuration: analysis.totalMinutes,
        wordCount: analysis.wordCount,
        totalPauseTime: analysis.totalPauseTime,
        shortfall: shortfallMinutes,
        percentage: percentageOfTarget,
        createdAt: meditation.created_at
      });
    }
    
    // Sort by shortfall (biggest problems first)
    results.sort((a, b) => b.shortfall - a.shortfall);
    
    // Print detailed results
    console.log('\n📊 MEDITATION DURATION ANALYSIS REPORT\n');
    console.log('Legend: Target Duration vs Estimated TTS Duration\n');
    
    let problemCount = 0;
    
    for (const result of results) {
      const isProblematic = result.shortfall > 1; // More than 1 minute short
      if (isProblematic) problemCount++;
      
      const statusIcon = isProblematic ? '❌' : '✅';
      
      console.log(`${statusIcon} ${result.title}`);
      console.log(`   Category: ${result.category}`);
      console.log(`   Target: ${result.targetDuration.toFixed(1)} min | TTS Estimate: ${result.estimatedTTSDuration.toFixed(1)} min | Shortfall: ${result.shortfall.toFixed(1)} min (${result.percentage.toFixed(0)}% of target)`);
      console.log(`   Words: ${result.wordCount} | Pause Time: ${result.totalPauseTime.toFixed(1)}s`);
      console.log(`   Created: ${new Date(result.createdAt).toLocaleString()}`);
      console.log(`   ID: ${result.id}`);
      console.log('');
    }
    
    console.log('='.repeat(120));
    console.log('\n📈 SUMMARY STATISTICS\n');
    
    const avgShortfall = results.reduce((sum, r) => sum + r.shortfall, 0) / results.length;
    const avgPercentage = results.reduce((sum, r) => sum + r.percentage, 0) / results.length;
    
    console.log(`Total Meditations: ${results.length}`);
    console.log(`Problematic (>1 min short): ${problemCount} (${((problemCount / results.length) * 100).toFixed(0)}%)`);
    console.log(`Average Shortfall: ${avgShortfall.toFixed(2)} minutes`);
    console.log(`Average TTS Coverage: ${avgPercentage.toFixed(0)}% of target duration`);
    
    // Find patterns
    const categoryStats = {};
    results.forEach(r => {
      if (!categoryStats[r.category]) {
        categoryStats[r.category] = { count: 0, totalShortfall: 0 };
      }
      categoryStats[r.category].count++;
      categoryStats[r.category].totalShortfall += r.shortfall;
    });
    
    console.log('\n📂 BY CATEGORY:\n');
    Object.keys(categoryStats).forEach(cat => {
      const stats = categoryStats[cat];
      const avgCatShortfall = stats.totalShortfall / stats.count;
      console.log(`${cat}: ${stats.count} meditations, avg shortfall: ${avgCatShortfall.toFixed(2)} min`);
    });
    
    console.log('\n✨ Analysis complete!\n');
    
  } catch (error) {
    console.error('Error analyzing meditations:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

// Run the analysis
analyzeMeditations();
