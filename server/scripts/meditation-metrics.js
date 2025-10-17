const { supabaseAdmin } = require('../config/supabase');

/**
 * Query meditation metrics from the database
 * Returns: Target Length, Word Count, TTS Estimate, Voice
 */

const WPM = 110; // Words per minute

function countWords(script) {
  const words = script.trim().split(/\s+/);
  return words.length;
}

function calculateTTSMinutes(wordCount) {
  return (wordCount / WPM);
}

async function queryMeditationMetrics() {
  console.log('📊 Querying meditation metrics...\n');
  
  try {
    const { data: meditations, error } = await supabaseAdmin
      .from('meditations')
      .select('id, title, duration, script, voice_id, category, created_at')
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
    console.log('\n');
    
    // Print header
    console.log('TITLE'.padEnd(40) + 'TARGET'.padEnd(12) + 'WORDS'.padEnd(12) + 'TTS EST'.padEnd(12) + 'VOICE');
    console.log('-'.repeat(120));
    
    for (const med of meditations) {
      const wordCount = countWords(med.script);
      const ttsEstimate = calculateTTSMinutes(wordCount);
      const targetDuration = med.duration;
      
      const titleTrunc = med.title.length > 38 ? med.title.substring(0, 35) + '...' : med.title;
      
      console.log(
        titleTrunc.padEnd(40) +
        `${targetDuration.toFixed(1)} min`.padEnd(12) +
        wordCount.toString().padEnd(12) +
        `${ttsEstimate.toFixed(1)} min`.padEnd(12) +
        med.voice_id
      );
    }
    
    console.log('\n' + '='.repeat(120));
    
    // Summary statistics
    const totalMeds = meditations.length;
    const avgWords = meditations.reduce((sum, m) => sum + countWords(m.script), 0) / totalMeds;
    const avgTarget = meditations.reduce((sum, m) => sum + m.duration, 0) / totalMeds;
    const avgTTS = meditations.reduce((sum, m) => sum + calculateTTSMinutes(countWords(m.script)), 0) / totalMeds;
    
    console.log('\n📈 SUMMARY STATISTICS\n');
    console.log(`Total Meditations: ${totalMeds}`);
    console.log(`Average Target Duration: ${avgTarget.toFixed(1)} minutes`);
    console.log(`Average Word Count: ${avgWords.toFixed(0)} words`);
    console.log(`Average TTS Estimate: ${avgTTS.toFixed(1)} minutes`);
    console.log(`Average Gap: ${(avgTarget - avgTTS).toFixed(1)} minutes (${((avgTTS / avgTarget) * 100).toFixed(0)}% coverage)`);
    
    // Group by voice
    const voiceStats = {};
    meditations.forEach(m => {
      const voice = m.voice_id;
      if (!voiceStats[voice]) {
        voiceStats[voice] = { count: 0, totalGap: 0 };
      }
      const wordCount = countWords(m.script);
      const ttsEst = calculateTTSMinutes(wordCount);
      voiceStats[voice].count++;
      voiceStats[voice].totalGap += (m.duration - ttsEst);
    });
    
    console.log('\n🎤 BY VOICE:\n');
    Object.keys(voiceStats).sort().forEach(voice => {
      const stats = voiceStats[voice];
      const avgGap = stats.totalGap / stats.count;
      console.log(`${voice}: ${stats.count} meditations, avg gap: ${avgGap.toFixed(1)} min`);
    });
    
    console.log('\n✨ Query complete!\n');
    
  } catch (error) {
    console.error('Error querying meditations:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

queryMeditationMetrics();
