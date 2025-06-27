#!/usr/bin/env node

/**
 * Test script for the new dictionary preview functionality
 * Run this to verify the preview workflow is working correctly
 */

const BASE_URL = 'http://localhost:3000'; // Update if using different port

async function testPreviewWorkflow() {
  console.log('🧪 Testing Dictionary Preview Workflow\n');

  try {
    // Step 1: Test instances endpoint
    console.log('1️⃣ Testing instances endpoint...');
    const instancesResponse = await fetch(`${BASE_URL}/api/instances`);
    const instancesData = await instancesResponse.json();
    
    if (!instancesResponse.ok) {
      console.log('❌ Instances endpoint failed:', instancesData);
      return;
    }
    
    console.log(`✅ Found ${instancesData.length || 0} instances`);
    
    if (!instancesData || instancesData.length === 0) {
      console.log('⚠️ No instances found. Please add a DHIS2 instance first.');
      return;
    }

    const testInstance = instancesData[0];
    console.log(`🔗 Using instance: ${testInstance.name}\n`);

    // Step 2: Test SQL views endpoint
    console.log('2️⃣ Testing SQL views endpoint...');
    const sqlViewsResponse = await fetch(`${BASE_URL}/api/dhis2/sql-views-list?instanceId=${testInstance.id}`);
    const sqlViewsData = await sqlViewsResponse.json();
    
    if (!sqlViewsResponse.ok) {
      console.log('❌ SQL views endpoint failed:', sqlViewsData);
      return;
    }
    
    console.log(`✅ Found ${sqlViewsData.data?.sqlViews?.length || 0} SQL views`);
    
    if (!sqlViewsData.data?.sqlViews || sqlViewsData.data.sqlViews.length === 0) {
      console.log('⚠️ No SQL views found. Check instance configuration.');
      return;
    }

    const testSqlView = sqlViewsData.data.sqlViews[0];
    console.log(`🔍 Using SQL view: ${testSqlView.displayName}\n`);

    // Step 3: Test preview endpoint
    console.log('3️⃣ Testing preview endpoint...');
    const previewPayload = {
      instance_id: testInstance.id,
      sql_view_id: testSqlView.id,
      metadata_type: 'dataElements',
      dictionary_name: 'Test Preview Dictionary'
    };

    const previewResponse = await fetch(`${BASE_URL}/api/dictionaries/preview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(previewPayload)
    });

    const previewData = await previewResponse.json();
    
    if (!previewResponse.ok) {
      console.log('❌ Preview endpoint failed:', previewData);
      console.log('\n🔧 Possible fixes:');
      console.log('- Check DHIS2 instance credentials');
      console.log('- Verify user has permission to access SQL views');
      console.log('- Ensure SQL view exists and is accessible');
      return;
    }
    
    console.log('✅ Preview generated successfully!');
    console.log(`📊 Preview details:`);
    console.log(`   - Rows: ${previewData.data.preview_count}`);
    console.log(`   - Status: ${previewData.data.status}`);
    console.log(`   - Execution time: ${previewData.data.execution_time}ms\n`);

    if (previewData.data.raw_data && previewData.data.raw_data.length > 0) {
      console.log('📋 Sample data:');
      console.log(JSON.stringify(previewData.data.raw_data[0], null, 2));
    }

    // Step 4: Test table conversion
    if (previewData.data.raw_data && previewData.data.raw_data.length > 0) {
      console.log('\n4️⃣ Testing table conversion...');
      
      const convertPayload = {
        preview_id: previewData.data.preview_id,
        raw_data: previewData.data.raw_data,
        headers: previewData.data.headers
      };

      const convertResponse = await fetch(`${BASE_URL}/api/dictionaries/convert-table`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(convertPayload)
      });

      const convertData = await convertResponse.json();
      
      if (!convertResponse.ok) {
        console.log('❌ Table conversion failed:', convertData);
        return;
      }
      
      console.log('✅ Table conversion successful!');
      console.log(`📊 Conversion details:`);
      console.log(`   - Columns detected: ${convertData.data.detected_columns?.length || 0}`);
      console.log(`   - Quality score: ${convertData.data.quality_score}%`);
      console.log(`   - Total rows: ${convertData.data.total_rows}\n`);
    }

    console.log('🎉 All tests passed! The preview workflow is working correctly.');

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.log('\n🔧 Debugging tips:');
    console.log('- Make sure the development server is running');
    console.log('- Check database connection (Supabase)');
    console.log('- Verify environment variables are set');
    console.log('- Check browser console for additional errors');
  }
}

// Run the test
testPreviewWorkflow(); 