// Test script to verify Hive API integration
// Run with: node test-hive-integration.js

const testUsername = 'blanchy'; // Replace with a real Hive username for testing

async function testHiveApi() {
  console.log('Testing Hive API integration...');
  console.log('Username:', testUsername);
  
  try {
    // Test account data fetch
    console.log('\n1. Testing account data fetch...');
    const accountResponse = await fetch('http://localhost:3000/api/hive/account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api: 'condenser_api',
        method: 'get_accounts',
        params: [[testUsername]]
      })
    });
    
    const accountData = await accountResponse.json();
    console.log('Account fetch result:', accountData.success ? 'SUCCESS' : 'FAILED');
    if (accountData.success) {
      const account = accountData.data[0];
      console.log('- Username:', account.name);
      console.log('- Reputation:', account.reputation);
      console.log('- Balance:', account.balance);
      console.log('- HBD Balance:', account.sbd_balance);
      console.log('- JSON Metadata:', account.json_metadata ? 'Present' : 'Missing');
    }
    
    // Test follow count fetch
    console.log('\n2. Testing follow count fetch...');
    const followResponse = await fetch('http://localhost:3000/api/hive/account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api: 'condenser_api',
        method: 'get_follow_count',
        params: [testUsername]
      })
    });
    
    const followData = await followResponse.json();
    console.log('Follow count result:', followData.success ? 'SUCCESS' : 'FAILED');
    if (followData.success) {
      console.log('- Followers:', followData.data.follower_count);
      console.log('- Following:', followData.data.following_count);
    }
    
    // Test RC fetch
    console.log('\n3. Testing resource credits fetch...');
    const rcResponse = await fetch('http://localhost:3000/api/hive/account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api: 'rc_api',
        method: 'find_rc_accounts',
        params: [testUsername]
      })
    });
    
    const rcData = await rcResponse.json();
    console.log('RC fetch result:', rcData.success ? 'SUCCESS' : 'FAILED');
    if (rcData.success && rcData.data.rc_accounts && rcData.data.rc_accounts.length > 0) {
      const rc = rcData.data.rc_accounts[0];
      console.log('- Max RC:', rc.max_rc);
      console.log('- Current RC:', rc.rc_manabar.current_mana);
    }
    
    console.log('\n✅ Hive API integration test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testHiveApi();
