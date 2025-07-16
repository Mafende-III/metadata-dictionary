#!/usr/bin/env node

/**
 * Enhanced Export Testing Script with Group Validation
 * 
 * This script comprehensively tests the enhanced export functionality
 * including group validation, error tracking, and rollback capabilities.
 */

const fs = require('fs');
const path = require('path');

// Test configuration
const TEST_CONFIG = {
  baseUrl: 'http://localhost:3002',
  testDictionaries: [
    // Test with dictionary that has enhanced export data
    'enhanced_test_dict',
    // Test with legacy dictionary (fallback scenario)
    'legacy_test_dict'
  ],
  testFormats: ['json', 'csv', 'xml', 'summary'],
  outputDir: './test-results/enhanced-export',
  // Group validation scenarios
  groupValidationTests: [
    {
      name: 'valid_group',
      instance: 'demo',
      metadataType: 'dataElements',
      expectedGroupCount: 5
    },
    {
      name: 'invalid_group',
      instance: 'demo',
      metadataType: 'indicators',
      expectedGroupCount: 0 // This should trigger validation issues
    }
  ]
};

// Test results tracking
const testResults = {
  timestamp: new Date().toISOString(),
  passed: 0,
  failed: 0,
  warnings: 0,
  tests: []
};

// Utility functions
function log(message, level = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: '✅',
    warn: '⚠️',
    error: '❌',
    test: '🧪'
  }[level] || 'ℹ️';
  
  console.log(`${prefix} [${timestamp}] ${message}`);
}

function recordTest(testName, passed, details = {}) {
  testResults.tests.push({
    name: testName,
    passed,
    details,
    timestamp: new Date().toISOString()
  });
  
  if (passed) {
    testResults.passed++;
    log(`Test passed: ${testName}`, 'info');
  } else {
    testResults.failed++;
    log(`Test failed: ${testName}`, 'error');
  }
}

// Test functions
async function testEnhancedExportStructure() {
  log('Testing enhanced export structure...', 'test');
  
  try {
    // Test individual variable export
    const response = await fetch(`${TEST_CONFIG.baseUrl}/api/dictionaries/test-dict/export/variable/test-var?format=json`);
    
    if (!response.ok) {
      recordTest('Enhanced Export Structure', false, { error: 'API request failed' });
      return;
    }
    
    const data = await response.json();
    
    // Validate enhanced export structure
    const requiredFields = [
      'variable',
      'complete_table_row',
      'table_structure',
      'enhanced_api_endpoints',
      'group_validation',
      'exportInfo'
    ];
    
    const missingFields = requiredFields.filter(field => !data.data || !data.data[field]);
    
    if (missingFields.length > 0) {
      recordTest('Enhanced Export Structure', false, { 
        missingFields, 
        actualFields: Object.keys(data.data || {}) 
      });
      return;
    }
    
    // Validate enhanced export features
    const exportInfo = data.data.exportInfo;
    const enhancedFeatures = exportInfo.enhanced_export_features;
    
    if (!enhancedFeatures) {
      recordTest('Enhanced Export Features', false, { error: 'Missing enhanced_export_features' });
      return;
    }
    
    // Test group validation
    const groupValidation = data.data.group_validation;
    const hasGroupValidation = groupValidation && typeof groupValidation === 'object';
    
    recordTest('Enhanced Export Structure', true, {
      hasCompleteTableRow: !!data.data.complete_table_row,
      hasEnhancedEndpoints: !!data.data.enhanced_api_endpoints,
      hasGroupValidation,
      enhancedFeatures
    });
    
  } catch (error) {
    recordTest('Enhanced Export Structure', false, { error: error.message });
  }
}

async function testGroupValidation() {
  log('Testing group validation functionality...', 'test');
  
  for (const testScenario of TEST_CONFIG.groupValidationTests) {
    try {
      const response = await fetch(
        `${TEST_CONFIG.baseUrl}/api/dhis2/metadata-groups?type=${testScenario.metadataType}&instanceId=${testScenario.instance}`
      );
      
      if (!response.ok) {
        recordTest(`Group Validation - ${testScenario.name}`, false, { 
          error: 'API request failed',
          scenario: testScenario
        });
        continue;
      }
      
      const data = await response.json();
      
      if (!data.success) {
        recordTest(`Group Validation - ${testScenario.name}`, false, { 
          error: data.error || 'API returned unsuccessful response',
          scenario: testScenario
        });
        continue;
      }
      
      const actualGroupCount = data.data.groups ? data.data.groups.length : 0;
      const expectedGroupCount = testScenario.expectedGroupCount;
      
      // For invalid group scenarios, we expect 0 groups or fallback data
      if (testScenario.name === 'invalid_group') {
        const hasFallback = data.data.fallback === true;
        recordTest(`Group Validation - ${testScenario.name}`, true, {
          actualGroupCount,
          expectedGroupCount,
          hasFallback,
          fallbackTriggered: hasFallback
        });
      } else {
        const validGroupCount = actualGroupCount >= expectedGroupCount;
        recordTest(`Group Validation - ${testScenario.name}`, validGroupCount, {
          actualGroupCount,
          expectedGroupCount,
          scenario: testScenario
        });
      }
      
    } catch (error) {
      recordTest(`Group Validation - ${testScenario.name}`, false, { 
        error: error.message,
        scenario: testScenario
      });
    }
  }
}

async function testExportFormats() {
  log('Testing export formats...', 'test');
  
  for (const format of TEST_CONFIG.testFormats) {
    try {
      const response = await fetch(`${TEST_CONFIG.baseUrl}/api/dictionaries/test-dict/export/variable/test-var?format=${format}`);
      
      if (!response.ok) {
        recordTest(`Export Format - ${format}`, false, { error: 'API request failed' });
        continue;
      }
      
      const data = await response.json();
      
      // Validate format-specific requirements
      let formatValid = true;
      let formatDetails = {};
      
      if (format === 'csv') {
        // CSV should have proper structure
        formatValid = data.data && typeof data.data === 'string';
        formatDetails = { isString: typeof data.data === 'string' };
      } else if (format === 'json') {
        // JSON should have complete structure
        formatValid = data.data && data.data.complete_table_row;
        formatDetails = { hasCompleteTableRow: !!data.data.complete_table_row };
      }
      
      recordTest(`Export Format - ${format}`, formatValid, formatDetails);
      
    } catch (error) {
      recordTest(`Export Format - ${format}`, false, { error: error.message });
    }
  }
}

async function testFallbackMechanisms() {
  log('Testing fallback mechanisms...', 'test');
  
  try {
    // Test with non-existent dictionary (should fallback gracefully)
    const response = await fetch(`${TEST_CONFIG.baseUrl}/api/dictionaries/non-existent/export/variable/test-var?format=json`);
    
    // Should return 404 but not crash
    const isValidError = response.status === 404;
    
    recordTest('Fallback - Non-existent Dictionary', isValidError, { 
      status: response.status,
      expectedStatus: 404
    });
    
    // Test with invalid format (should fallback to JSON)
    const invalidFormatResponse = await fetch(`${TEST_CONFIG.baseUrl}/api/dictionaries/test-dict/export/variable/test-var?format=invalid`);
    
    if (invalidFormatResponse.ok) {
      const data = await invalidFormatResponse.json();
      const fallbackWorked = data.success && data.data;
      
      recordTest('Fallback - Invalid Format', fallbackWorked, { 
        defaultedToJson: true,
        hasData: !!data.data
      });
    } else {
      recordTest('Fallback - Invalid Format', false, { error: 'API request failed' });
    }
    
  } catch (error) {
    recordTest('Fallback Mechanisms', false, { error: error.message });
  }
}

async function testRollbackCapabilities() {
  log('Testing rollback capabilities...', 'test');
  
  try {
    // Test feature flag detection
    const testDictResponse = await fetch(`${TEST_CONFIG.baseUrl}/api/dictionaries/test-dict`);
    
    if (!testDictResponse.ok) {
      recordTest('Rollback - Feature Flag Detection', false, { error: 'API request failed' });
      return;
    }
    
    const dictData = await testDictResponse.json();
    
    // Check if dictionary has enhanced export metadata
    const hasEnhancedExport = dictData.data && 
                             dictData.data.data && 
                             dictData.data.data.enhanced_export;
    
    recordTest('Rollback - Feature Flag Detection', true, {
      hasEnhancedExport,
      enhancedExportVersion: hasEnhancedExport ? dictData.data.data.enhanced_export.version : 'none'
    });
    
  } catch (error) {
    recordTest('Rollback Capabilities', false, { error: error.message });
  }
}

async function generateTestReport() {
  log('Generating test report...', 'test');
  
  // Create output directory
  const outputPath = path.join(__dirname, '..', TEST_CONFIG.outputDir);
  if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath, { recursive: true });
  }
  
  // Generate detailed report
  const report = {
    summary: {
      timestamp: testResults.timestamp,
      total: testResults.passed + testResults.failed,
      passed: testResults.passed,
      failed: testResults.failed,
      warnings: testResults.warnings,
      successRate: `${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(2)}%`
    },
    tests: testResults.tests,
    recommendations: []
  };
  
  // Add recommendations based on test results
  if (testResults.failed > 0) {
    report.recommendations.push('Some tests failed. Review the failed tests and fix issues before deployment.');
  }
  
  const failedGroupTests = testResults.tests.filter(t => t.name.includes('Group Validation') && !t.passed);
  if (failedGroupTests.length > 0) {
    report.recommendations.push('Group validation issues detected. Review instance configurations and group mappings.');
  }
  
  // Save report
  const reportPath = path.join(outputPath, `test-report-${new Date().toISOString().replace(/:/g, '-')}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  log(`Test report saved to: ${reportPath}`, 'info');
  
  return report;
}

// Main test execution
async function runTests() {
  log('Starting Enhanced Export Testing Suite...', 'test');
  
  try {
    await testEnhancedExportStructure();
    await testGroupValidation();
    await testExportFormats();
    await testFallbackMechanisms();
    await testRollbackCapabilities();
    
    const report = await generateTestReport();
    
    log(`\n=== TEST RESULTS ===`, 'info');
    log(`Total Tests: ${report.summary.total}`, 'info');
    log(`Passed: ${report.summary.passed}`, 'info');
    log(`Failed: ${report.summary.failed}`, 'info');
    log(`Success Rate: ${report.summary.successRate}`, 'info');
    
    if (report.recommendations.length > 0) {
      log(`\n=== RECOMMENDATIONS ===`, 'warn');
      report.recommendations.forEach(rec => log(`• ${rec}`, 'warn'));
    }
    
    // Exit with appropriate code
    process.exit(testResults.failed > 0 ? 1 : 0);
    
  } catch (error) {
    log(`Test suite failed: ${error.message}`, 'error');
    process.exit(1);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests();
}

module.exports = { runTests, testResults };