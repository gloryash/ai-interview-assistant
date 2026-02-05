/**
 * Claude API 中转站测试脚本
 * 运行: npx tsx scripts/test-claude-api.ts
 */

const BASE_URL = 'https://code.newcli.com';
const API_KEY = 'sk-ant-oat01-KLvDoHbqt926m32xHBvDHQOj6cZru9xihnWhHpuZEIz74PJyrbfWzoR97HaqVtL1VEISWzh-FosMAbQmShYXoxnoMAOZGAA';

// 尝试不同的端点路径
const ENDPOINTS = [
  '/v1/messages',
  '/claude/v1/messages',
  '/api/v1/messages',
  '/claude/droid/v1/messages',
];

async function testEndpoint(endpoint: string) {
  const url = BASE_URL + endpoint;
  console.log(`\n--- Testing: ${url} ---`);

  const requestBody = {
    model: 'claude-opus-4-5-20251101',
    max_tokens: 100,
    messages: [
      { role: 'user', content: '你好，请用一句话回复。' }
    ]
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(requestBody)
    });

    console.log('Status:', response.status);
    const text = await response.text();
    console.log('Response:', text.substring(0, 500));

    if (response.ok) {
      console.log('✅ 成功！');
      return true;
    }
  } catch (error) {
    console.error('Error:', error);
  }
  return false;
}

async function main() {
  console.log('Testing Claude API endpoints...');

  for (const endpoint of ENDPOINTS) {
    const success = await testEndpoint(endpoint);
    if (success) break;
  }
}

main();
