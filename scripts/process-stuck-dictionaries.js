#!/usr/bin/env node

/**
 * Manual script to process stuck dictionaries
 * Run this to fix dictionaries that are stuck in "generating" status
 * 
 * Usage: node scripts/process-stuck-dictionaries.js
 */

const BASE_URL = 'http://localhost:3000'; // Update port if different

async function checkStuckDictionaries() {
  try {
    console.log('🔍 Checking for stuck dictionaries...');
    
    const response = await fetch(`${BASE_URL}/api/dictionaries/process-all`);
    const result = await response.json();
    
    if (result.success) {
      const { totalDictionaries, pendingDictionaries, activeProcessingJobs, pendingIds } = result.data;
      
      console.log(`📊 Status Report:`);
      console.log(`  Total dictionaries: ${totalDictionaries}`);
      console.log(`  Stuck in generating: ${pendingDictionaries}`);
      console.log(`  Currently processing: ${activeProcessingJobs}`);
      
      if (pendingDictionaries > 0) {
        console.log(`\n📋 Stuck dictionaries:`);
        pendingIds.forEach(dict => {
          console.log(`  - ${dict.name} (${dict.id})`);
        });
        
        return pendingIds;
      } else {
        console.log('✅ No stuck dictionaries found!');
        return [];
      }
    } else {
      console.error('❌ Failed to check dictionaries:', result.error);
      return [];
    }
  } catch (error) {
    console.error('❌ Error checking dictionaries:', error.message);
    return [];
  }
}

async function triggerProcessingForAll() {
  try {
    console.log('🚀 Triggering processing for all stuck dictionaries...');
    
    const response = await fetch(`${BASE_URL}/api/dictionaries/process-all`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action: 'start' })
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Processing started for all stuck dictionaries!');
      console.log('📝 Check the server logs to monitor progress');
      return true;
    } else {
      console.error('❌ Failed to start processing:', result.error);
      return false;
    }
  } catch (error) {
    console.error('❌ Error starting processing:', error.message);
    return false;
  }
}

async function processSpecificDictionary(dictionaryId) {
  try {
    console.log(`🔄 Processing dictionary: ${dictionaryId}`);
    
    const response = await fetch(`${BASE_URL}/api/dictionaries/${dictionaryId}/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        action: 'start',
        options: {
          batchSize: 25,
          delayBetweenItems: 100
        }
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log(`✅ Processing started for dictionary: ${dictionaryId}`);
      return true;
    } else {
      console.error(`❌ Failed to process dictionary ${dictionaryId}:`, result.error);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error processing dictionary ${dictionaryId}:`, error.message);
    return false;
  }
}

async function monitorProgress(dictionaryId) {
  console.log(`👀 Monitoring progress for: ${dictionaryId}`);
  
  const checkProgress = async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/dictionaries/${dictionaryId}`);
      const result = await response.json();
      
      if (result.success && result.data) {
        const dict = result.data;
        console.log(`📊 ${dict.name}: ${dict.status} (${dict.variables_count || 0} variables)`);
        
        if (dict.status === 'generating') {
          setTimeout(checkProgress, 5000); // Check again in 5 seconds
        } else if (dict.status === 'active') {
          console.log(`✅ ${dict.name} completed successfully!`);
          console.log(`   Variables: ${dict.variables_count}`);
          console.log(`   Quality: ${dict.quality_average}%`);
          console.log(`   Processing time: ${dict.processing_time}s`);
        } else if (dict.status === 'error') {
          console.log(`❌ ${dict.name} failed: ${dict.error_message}`);
        }
      }
    } catch (error) {
      console.error('Error monitoring progress:', error.message);
    }
  };
  
  setTimeout(checkProgress, 2000); // Start monitoring after 2 seconds
}

async function main() {
  console.log('🔧 Dictionary Recovery Tool\n');
  
  // Check for stuck dictionaries
  const stuckDictionaries = await checkStuckDictionaries();
  
  if (stuckDictionaries.length === 0) {
    console.log('\n🎉 All dictionaries are in good shape!');
    return;
  }
  
  console.log('\n🚀 Starting recovery process...');
  
  // Option 1: Process all at once
  if (process.argv.includes('--all')) {
    const success = await triggerProcessingForAll();
    if (success) {
      // Monitor the first few dictionaries
      stuckDictionaries.slice(0, 3).forEach(dict => {
        monitorProgress(dict.id);
      });
    }
    return;
  }
  
  // Option 2: Process each dictionary individually (default)
  console.log('\n📝 Processing dictionaries individually...');
  
  for (const dict of stuckDictionaries) {
    console.log(`\n🔄 Processing: ${dict.name}`);
    const success = await processSpecificDictionary(dict.id);
    
    if (success) {
      monitorProgress(dict.id);
      // Wait a bit before starting the next one
      await new Promise(resolve => setTimeout(resolve, 3000));
    } else {
      console.log(`⏭️ Skipping to next dictionary...`);
    }
  }
  
  console.log('\n🔔 Recovery process initiated! Check the server logs for detailed progress.');
  console.log('💡 Tip: Visit the dictionaries page in the browser to see real-time updates.');
}

// Handle command line arguments
if (process.argv.includes('--help')) {
  console.log(`
🔧 Dictionary Recovery Tool

Usage:
  node scripts/process-stuck-dictionaries.js [options]

Options:
  --all     Process all stuck dictionaries simultaneously
  --help    Show this help message

Examples:
  node scripts/process-stuck-dictionaries.js         # Process individually
  node scripts/process-stuck-dictionaries.js --all   # Process all at once
`);
  process.exit(0);
}

// Run the main function
main().catch(error => {
  console.error('💥 Script failed:', error.message);
  process.exit(1);
}); 