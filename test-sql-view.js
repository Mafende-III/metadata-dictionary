#!/usr/bin/env node

/**
 * SQL View Testing Script
 * Tests DHIS2 SQL View execution with various patterns
 * 
 * Usage:
 * node test-sql-view.js <sqlViewId> [baseUrl] [username] [password]
 * 
 * Example:
 * node test-sql-view.js abc123xyz https://play.dhis2.org/40 admin district
 */

const https = require('https');
const http = require('http');

// Configuration
const DEFAULT_BASE_URL = 'https://play.dhis2.org/40';
const DEFAULT_USERNAME = 'admin';
const DEFAULT_PASSWORD = 'district';

class DHIS2SqlViewTester {
  constructor(baseUrl, username, password) {
    this.baseUrl = baseUrl.endsWith('/api') ? baseUrl : `${baseUrl}/api`;
    this.auth = Buffer.from(`${username}:${password}`).toString('base64');
    this.headers = {
      'Authorization': `Basic ${this.auth}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  }

  async makeRequest(path, method = 'GET', body = null) {
    return new Promise((resolve, reject) => {
      const url = new URL(`${this.baseUrl}${path}`);
      const isHttps = url.protocol === 'https:';
      const requestModule = isHttps ? https : http;
      
      const options = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method,
        headers: this.headers
      };

      const req = requestModule.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            const jsonData = data ? JSON.parse(data) : {};
            resolve({ status: res.statusCode, data: jsonData, raw: data });
          } catch (e) {
            resolve({ status: res.statusCode, data: null, raw: data, parseError: e.message });
          }
        });
      });

      req.on('error', reject);
      
      if (body) {
        req.write(typeof body === 'string' ? body : JSON.stringify(body));
      }
      
      req.end();
    });
  }

  async testConnection() {
    console.log('🔗 Testing DHIS2 connection...');
    try {
      const response = await this.makeRequest('/me');
      if (response.status === 200) {
        console.log('✅ Connection successful');
        console.log(`👤 User: ${response.data.displayName} (${response.data.userCredentials?.username})`);
        return true;
      } else {
        console.log(`❌ Connection failed: ${response.status}`);
        return false;
      }
    } catch (error) {
      console.log(`❌ Connection error: ${error.message}`);
      return false;
    }
  }

  async getSqlViewMetadata(sqlViewId) {
    console.log(`📋 Getting SQL view metadata: ${sqlViewId}`);
    try {
      const response = await this.makeRequest(`/sqlViews/${sqlViewId}?fields=*`);
      if (response.status === 200) {
        console.log('✅ Metadata retrieved');
        console.log(`📊 Name: ${response.data.name}`);
        console.log(`📊 Type: ${response.data.type}`);
        console.log(`📊 Description: ${response.data.description || 'N/A'}`);
        console.log(`📊 SQL Query: ${response.data.sqlQuery ? 'Present' : 'Not present'}`);
        return response.data;
      } else {
        console.log(`❌ Metadata fetch failed: ${response.status}`);
        return null;
      }
    } catch (error) {
      console.log(`❌ Metadata error: ${error.message}`);
      return null;
    }
  }

  async executeMaterializedView(sqlViewId) {
    console.log(`⚡ Executing materialized view: ${sqlViewId}`);
    try {
      const response = await this.makeRequest(`/sqlViews/${sqlViewId}/execute`, 'POST');
      if (response.status === 200 || response.status === 204) {
        console.log('✅ Materialized view executed successfully');
        return true;
      } else {
        console.log(`⚠️ Execution returned: ${response.status} - ${response.raw}`);
        return false;
      }
    } catch (error) {
      console.log(`⚠️ Execution error: ${error.message}`);
      return false;
    }
  }

  async fetchSqlViewData(sqlViewId, variables = null) {
    console.log(`📊 Fetching SQL view data: ${sqlViewId}`);
    try {
      let path = `/sqlViews/${sqlViewId}/data`;
      
      if (variables && Object.keys(variables).length > 0) {
        const params = new URLSearchParams();
        Object.entries(variables).forEach(([key, value]) => {
          params.append('var', `${key}:${value}`);
        });
        path += `?${params.toString()}`;
      }

      console.log(`🔗 Request URL: ${path}`);
      
      const response = await this.makeRequest(path);
      
      if (response.status === 200) {
        const data = response.data;
        console.log('✅ Data retrieved successfully');
        console.log(`📊 Response format: ${typeof data}`);
        
        if (data.rows && Array.isArray(data.rows)) {
          console.log(`📊 Rows: ${data.rows.length}`);
          console.log(`📊 Headers: ${data.headers ? data.headers.length : 'No headers'}`);
          console.log(`📊 Width: ${data.width || 'Not specified'}`);
          console.log(`📊 Height: ${data.height || 'Not specified'}`);
          
          if (data.headers && data.headers.length > 0) {
            console.log(`📋 Columns: ${data.headers.join(', ')}`);
          }
          
          if (data.rows.length > 0) {
            console.log('📝 Sample data (first row):');
            console.log(JSON.stringify(data.rows[0], null, 2));
          }
          
          return {
            success: true,
            rows: data.rows,
            headers: data.headers || [],
            count: data.rows.length
          };
        } else if (Array.isArray(data)) {
          console.log(`📊 Direct array format: ${data.length} rows`);
          return {
            success: true,
            rows: data,
            headers: data.length > 0 ? Object.keys(data[0]) : [],
            count: data.length
          };
        } else {
          console.log('⚠️ Unexpected data format:');
          console.log(JSON.stringify(data, null, 2));
          return {
            success: false,
            error: 'Unexpected data format',
            rawData: data
          };
        }
      } else {
        console.log(`❌ Data fetch failed: ${response.status}`);
        console.log(`❌ Response: ${response.raw}`);
        return {
          success: false,
          error: `HTTP ${response.status}`,
          response: response.raw
        };
      }
    } catch (error) {
      console.log(`❌ Data fetch error: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async testSqlView(sqlViewId, variables = null) {
    console.log(`\n🧪 Testing SQL View: ${sqlViewId}`);
    console.log('='.repeat(50));
    
    // Step 1: Test connection
    const connected = await this.testConnection();
    if (!connected) {
      return { success: false, error: 'Connection failed' };
    }
    
    // Step 2: Get metadata
    const metadata = await this.getSqlViewMetadata(sqlViewId);
    if (!metadata) {
      return { success: false, error: 'Failed to get metadata' };
    }
    
    // Step 3: Execute if needed
    if (metadata.type === 'MATERIALIZED_VIEW' || metadata.type === 'VIEW') {
      await this.executeMaterializedView(sqlViewId);
    }
    
    // Step 4: Fetch data
    const result = await this.fetchSqlViewData(sqlViewId, variables);
    
    console.log('\n📊 Test Summary:');
    console.log('='.repeat(30));
    console.log(`Success: ${result.success}`);
    if (result.success) {
      console.log(`Rows retrieved: ${result.count}`);
      console.log(`Columns: ${result.headers.length}`);
    } else {
      console.log(`Error: ${result.error}`);
    }
    
    return result;
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.log('Usage: node test-sql-view.js <sqlViewId> [baseUrl] [username] [password]');
    console.log('Example: node test-sql-view.js abc123xyz https://play.dhis2.org/40 admin district');
    process.exit(1);
  }
  
  const sqlViewId = args[0];
  const baseUrl = args[1] || DEFAULT_BASE_URL;
  const username = args[2] || DEFAULT_USERNAME;
  const password = args[3] || DEFAULT_PASSWORD;
  
  console.log(`🚀 Starting SQL View test`);
  console.log(`📍 DHIS2 URL: ${baseUrl}`);
  console.log(`👤 Username: ${username}`);
  console.log(`🔑 SQL View ID: ${sqlViewId}`);
  
  const tester = new DHIS2SqlViewTester(baseUrl, username, password);
  
  try {
    const result = await tester.testSqlView(sqlViewId);
    
    if (result.success) {
      console.log('\n🎉 Test completed successfully!');
      process.exit(0);
    } else {
      console.log('\n❌ Test failed');
      process.exit(1);
    }
  } catch (error) {
    console.log(`\n💥 Test crashed: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { DHIS2SqlViewTester };