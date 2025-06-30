/**
 * Demo script showing the new action tracking table in dictionary variables
 * This script demonstrates exactly what the user will see in the frontend
 */

// Sample data matching the user's exact table structure
const demoTableData = [
  {
    DATA_ELEMENT_ID: "BBjlkutAcke",
    DATA_ELEMENT_NAME: "CHAP OPD_Malaria cases received in OPD Quantile High",
    GROUP_ID: "ldF7dUbJm1g",
    GROUP_NAME: "CHAP",
    action: "updated"
  },
  {
    DATA_ELEMENT_ID: "kG09QJh68RI",
    DATA_ELEMENT_NAME: "CHAP OPD_Malaria cases received in OPD Quantile Low",
    GROUP_ID: "ldF7dUbJm1g",
    GROUP_NAME: "CHAP",
    action: "updated"
  },
  {
    DATA_ELEMENT_ID: "xO9ygDPlkEj",
    DATA_ELEMENT_NAME: "CHAP OPD_Malaria cases received in OPD Quantile Median",
    GROUP_ID: "ldF7dUbJm1g",
    GROUP_NAME: "CHAP",
    action: "updated"
  },
  {
    DATA_ELEMENT_ID: "TrEXOcZZU0Z",
    DATA_ELEMENT_NAME: "Coverage sectors IRS Interventions",
    GROUP_ID: "q0KXSPU5aMX",
    GROUP_NAME: "Indoor Residual Spraying Malaria interventions",
    action: "imported"
  },
  {
    DATA_ELEMENT_ID: "LnuYzuoTnbe",
    DATA_ELEMENT_NAME: "DQ - Number of RDTs carried out Adult_Positive excluding outliers",
    GROUP_ID: "w90ZYN1XJHX",
    GROUP_NAME: "DQ - Data quality (all)",
    action: "created"
  }
];

/**
 * Simulate saving the table data and viewing it in the dictionary variables
 */
async function demoActionTrackingTable() {
  console.log('🎯 Demo: Action Tracking Table in Dictionary Variables');
  console.log('=' .repeat(80));
  
  console.log('\n📊 Your Original Table Data:');
  console.table(demoTableData);
  
  console.log('\n💾 Step 1: Save with Action Tracking API');
  console.log('POST /api/dictionaries/save-from-table');
  
  const requestBody = {
    dictionary_name: "Demo: Action Tracking Dictionary",
    instance_id: "a4b7da3f-c1b6-4953-b6e7-42435feb80e6",
    instance_name: "HMIS Current",
    data_elements: demoTableData,
    metadata_type: "dataElements"
  };
  
  console.log('Request Body:', JSON.stringify(requestBody, null, 2));
  
  // Simulate API response
  const simulatedResponse = {
    success: true,
    data: {
      dictionary_id: "demo-uuid-12345",
      dictionary_name: "Demo: Action Tracking Dictionary",
      total_elements: demoTableData.length,
      successful: demoTableData.length,
      failed: 0,
      success_rate: 100.0,
      quality_average: 87.5,
      action_summary: {
        imported: 1,
        created: 1,
        updated: 3,
        deprecated: 0,
        replaced: 0,
        merged: 0
      },
      group_distribution: {
        "CHAP": 3,
        "Indoor Residual Spraying Malaria interventions": 1,
        "DQ - Data quality (all)": 1
      }
    }
  };
  
  console.log('\n✅ API Response:');
  console.log(JSON.stringify(simulatedResponse, null, 2));
  
  console.log('\n🖥️  Step 2: What You\'ll See in Dictionary Variables Tab');
  console.log('=' .repeat(80));
  
  console.log('\n📋 Table Headers:');
  const headers = [
    'DATA_ELEMENT_ID (DHIS2 UID)',
    'DATA_ELEMENT_NAME (Full Element Name)',
    'GROUP_ID (Group Identifier)',
    'GROUP_NAME (Group Display Name)',
    'ACTION (Processing Action)',
    'Quality',
    'API Access'
  ];
  
  headers.forEach((header, index) => {
    console.log(`${index + 1}. ${header}`);
  });
  
  console.log('\n📊 Table Rows (How your data will appear):');
  console.log('-'.repeat(120));
  
  demoTableData.forEach((row, index) => {
    console.log(`\nRow ${index + 1}:`);
    console.log(`  DATA_ELEMENT_ID:   ${row.DATA_ELEMENT_ID} (displayed as code badge)`);
    console.log(`  DATA_ELEMENT_NAME: ${row.DATA_ELEMENT_NAME}`);
    console.log(`  GROUP_ID:          ${row.GROUP_ID} (blue code badge)`);
    console.log(`  GROUP_NAME:        ${row.GROUP_NAME}`);
    console.log(`  ACTION:            ${row.action} (colored badge: ${getActionColor(row.action)})`);
    console.log(`  Quality:           87% (estimated - green badge)`);
    console.log(`  API Access:        [Analytics] [Copy API] [Export] buttons`);
  });
  
  console.log('\n🎨 Visual Design Features:');
  console.log('- DATA_ELEMENT_ID: Gray code badge with monospace font');
  console.log('- GROUP_ID: Blue code badge with monospace font');
  console.log('- ACTION: Colored badges based on action type');
  console.log('- Quality: Green/Yellow/Red badges based on score');
  console.log('- API Access: Interactive buttons for common actions');
  
  console.log('\n🔄 Action Badge Colors:');
  Object.keys(getActionStyles()).forEach(action => {
    console.log(`  ${action}: ${getActionColor(action)}`);
  });
  
  console.log('\n📈 Table Features:');
  console.log('✅ Checkbox selection for bulk operations');
  console.log('✅ Search functionality (by name or UID)');
  console.log('✅ Action-based filtering');
  console.log('✅ Group-based filtering');
  console.log('✅ Export selected variables');
  console.log('✅ Direct API access buttons');
  console.log('✅ Quality score indicators');
  
  console.log('\n🎯 This is exactly what you\'ll see in the Dictionary Variables tab!');
  console.log('The table structure matches your requirements perfectly.');
}

/**
 * Get action styling information
 */
function getActionStyles() {
  return {
    'imported': 'bg-blue-100 text-blue-800',
    'created': 'bg-green-100 text-green-800',
    'updated': 'bg-orange-100 text-orange-800',
    'deprecated': 'bg-red-100 text-red-800',
    'replaced': 'bg-purple-100 text-purple-800',
    'merged': 'bg-indigo-100 text-indigo-800'
  };
}

/**
 * Get action color description
 */
function getActionColor(action) {
  const colors = {
    'imported': 'Blue (standard import)',
    'created': 'Green (system generated)',
    'updated': 'Orange (data transformation)',
    'deprecated': 'Red (obsolete)',
    'replaced': 'Purple (replaced by another)',
    'merged': 'Indigo (merged from multiple)'
  };
  return colors[action] || 'Gray (default)';
}

/**
 * Simulate the complete flow
 */
async function simulateCompleteFlow() {
  console.log('🚀 Complete Flow Simulation');
  console.log('=' .repeat(50));
  
  console.log('\n1. Run database migration:');
  console.log('   psql -d your_database -f scripts/migrate-action-columns.sql');
  
  console.log('\n2. Save your table data:');
  console.log('   curl -X POST http://localhost:3001/api/dictionaries/save-from-table \\');
  console.log('   -H "Content-Type: application/json" \\');
  console.log('   -d \'{"dictionary_name": "Your Dictionary", "instance_id": "your-id", "data_elements": [...]}\'');
  
  console.log('\n3. View in browser:');
  console.log('   Navigate to: http://localhost:3001/dictionaries/[dictionary-id]');
  console.log('   Click on "Variables" tab');
  console.log('   See your table with: DATA_ELEMENT_ID | DATA_ELEMENT_NAME | GROUP_ID | GROUP_NAME | ACTION');
  
  console.log('\n✅ Your table is now visible in the Dictionary Variables section!');
}

// Run the demo
if (typeof window === 'undefined' && require.main === module) {
  demoActionTrackingTable()
    .then(() => simulateCompleteFlow())
    .catch(console.error);
}

module.exports = {
  demoActionTrackingTable,
  simulateCompleteFlow,
  demoTableData
}; 