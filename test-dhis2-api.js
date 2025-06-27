#!/usr/bin/env node
/**
 * Test script for DHIS2 API calls
 * Based on user guidance for proper API endpoints
 */

const axios = require('axios');

// Configuration - Update these with your actual DHIS2 instance details
const DHIS2_CONFIG = {
  baseUrl: 'http://online.hisprwanda.org/hmis',
  username: 'bmafende',
  password: 'your_actual_password_here'  // Replace with your real password
};

// Create Basic Auth token
const token = Buffer.from(`${DHIS2_CONFIG.username}:${DHIS2_CONFIG.password}`).toString('base64');

// Create axios instance
const dhis2Api = axios.create({
  baseURL: `${DHIS2_CONFIG.baseUrl}/api`,
  headers: {
    'Authorization': `Basic ${token}`,
    'Content-Type': 'application/json'
  },
  timeout: 30000
});

async function testSystemInfo() {
  console.log('\n🔍 Testing /api/system/info endpoint...');
  try {
    const response = await dhis2Api.get('/system/info');
    console.log('✅ System Info Success:', {
      status: response.status,
      version: response.data.version,
      instanceName: response.data.instanceName,
      serverDate: response.data.serverDate,
      revision: response.data.revision
    });
    return response.data;
  } catch (error) {
    console.error('❌ System Info Failed:', {
      status: error.response?.status,
      message: error.message,
      data: error.response?.data
    });
    return null;
  }
}

async function testSqlViews() {
  console.log('\n🔍 Testing /api/sqlViews endpoint...');
  try {
    const response = await dhis2Api.get('/sqlViews', {
      params: {
        fields: 'id,name,displayName,type,description,cacheStrategy',
        pageSize: 100,
        order: 'name:asc'
      }
    });
    
    console.log('✅ SQL Views Success:', {
      status: response.status,
      total: response.data.pager?.total || response.data.sqlViews?.length || 0,
      pageSize: response.data.pager?.pageSize,
      page: response.data.pager?.page,
      sqlViews: response.data.sqlViews?.length || 0
    });
    
    // Show first few SQL views if any exist
    if (response.data.sqlViews && response.data.sqlViews.length > 0) {
      console.log('\n📋 Sample SQL Views:');
      response.data.sqlViews.slice(0, 3).forEach((view, index) => {
        console.log(`  ${index + 1}. ${view.name || view.displayName} (${view.id})`);
      });
    }
    
    return response.data;
  } catch (error) {
    console.error('❌ SQL Views Failed:', {
      status: error.response?.status,
      message: error.message,
      data: error.response?.data
    });
    return null;
  }
}

async function testMeEndpoint() {
  console.log('\n🔍 Testing /api/me endpoint...');
  try {
    const response = await dhis2Api.get('/me');
    console.log('✅ Me Endpoint Success:', {
      status: response.status,
      username: response.data.userCredentials?.username,
      displayName: response.data.displayName,
      id: response.data.id
    });
    return response.data;
  } catch (error) {
    console.error('❌ Me Endpoint Failed:', {
      status: error.response?.status,
      message: error.message,
      data: error.response?.data
    });
    return null;
  }
}

async function testDataElements() {
  console.log('\n🔍 Testing /api/dataElements endpoint...');
  try {
    const response = await dhis2Api.get('/dataElements', {
      params: {
        fields: 'id,name,displayName',
        pageSize: 5
      }
    });
    
    console.log('✅ Data Elements Success:', {
      status: response.status,
      total: response.data.pager?.total || response.data.dataElements?.length || 0,
      fetched: response.data.dataElements?.length || 0
    });
    
    return response.data;
  } catch (error) {
    console.error('❌ Data Elements Failed:', {
      status: error.response?.status,
      message: error.message,
      data: error.response?.data
    });
    return null;
  }
}

async function runTests() {
  console.log('🚀 Starting DHIS2 API Tests');
  console.log('Base URL:', `${DHIS2_CONFIG.baseUrl}/api`);
  console.log('Username:', DHIS2_CONFIG.username);
  console.log('=====================================');

  // Test all endpoints
  await testMeEndpoint();
  const systemInfo = await testSystemInfo();
  const sqlViews = await testSqlViews();
  await testDataElements();

  console.log('\n📊 Test Summary:');
  console.log('=====================================');
  if (systemInfo) {
    console.log(`✅ DHIS2 Version: ${systemInfo.version}`);
    console.log(`✅ Instance: ${systemInfo.instanceName}`);
  }
  if (sqlViews) {
    console.log(`✅ SQL Views Found: ${sqlViews.pager?.total || sqlViews.sqlViews?.length || 0}`);
  }
  
  console.log('\n💡 Usage in your application:');
  console.log('1. Use /api/system/info for version detection');
  console.log('2. Use /api/sqlViews for SQL views list');
  console.log('3. Ensure credentials are properly encoded in Basic Auth');
  console.log('4. Check if your DHIS2 instance requires specific URL patterns');
}

// Run the tests if this script is executed directly
if (require.main === module) {
  console.log('⚠️  Please update DHIS2_CONFIG with your actual credentials before running!');
  if (DHIS2_CONFIG.username === 'your_username') {
    console.log('❌ Please edit the DHIS2_CONFIG section with your actual credentials');
    process.exit(1);
  }
  runTests().catch(console.error);
}

module.exports = { testSystemInfo, testSqlViews, testMeEndpoint, testDataElements }; 