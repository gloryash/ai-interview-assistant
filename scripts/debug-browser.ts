/**
 * 浏览器调试脚本
 * 运行: npx tsx scripts/debug-browser.ts
 */
import { chromium } from 'playwright';

const URL = 'http://localhost:5174';

async function debug() {
  console.log('启动浏览器...');

  const browser = await chromium.launch({
    headless: false  // 显示浏览器窗口
  });

  const page = await browser.newPage();

  // 收集控制台日志
  const consoleLogs: string[] = [];
  page.on('console', msg => {
    const text = `[${msg.type()}] ${msg.text()}`;
    consoleLogs.push(text);
    console.log('Console:', text);
  });

  // 收集错误
  page.on('pageerror', err => {
    console.log('Page Error:', err.message);
  });

  console.log(`打开页面: ${URL}`);
  await page.goto(URL);
  await page.waitForTimeout(2000);

  // 截图
  await page.screenshot({
    path: 'scripts/screenshot-1-initial.png',
    fullPage: true
  });
  console.log('截图已保存: scripts/screenshot-1-initial.png');

  // 查找输入框并发送消息
  console.log('\n尝试发送消息...');

  // 尝试常见的输入框选择器
  const inputSelectors = [
    'input[type="text"]',
    'textarea',
    'input[placeholder*="消息"]',
    'input[placeholder*="输入"]',
    '[contenteditable="true"]'
  ];

  let inputFound = false;
  for (const selector of inputSelectors) {
    const input = await page.$(selector);
    if (input) {
      console.log(`找到输入框: ${selector}`);
      await input.fill('你好，这是测试消息');
      inputFound = true;
      break;
    }
  }

  if (!inputFound) {
    console.log('未找到输入框，页面元素:');
    const elements = await page.$$eval('*', els =>
      els.slice(0, 50).map(e => `${e.tagName.toLowerCase()}${e.id ? '#'+e.id : ''}${e.className ? '.'+e.className.split(' ')[0] : ''}`)
    );
    console.log(elements.join(', '));
  }

  // 查找发送按钮
  const buttonSelectors = [
    'button[type="submit"]',
    'button:has-text("发送")',
    'button:has-text("Send")',
    'button svg',
  ];

  for (const selector of buttonSelectors) {
    try {
      const btn = await page.$(selector);
      if (btn) {
        console.log(`找到按钮: ${selector}`);
        await btn.click();
        break;
      }
    } catch {}
  }

  await page.waitForTimeout(3000);

  // 再次截图
  await page.screenshot({
    path: 'scripts/screenshot-2-after-send.png',
    fullPage: true
  });
  console.log('截图已保存: scripts/screenshot-2-after-send.png');

  // 输出所有控制台日志
  console.log('\n=== 控制台日志汇总 ===');
  consoleLogs.forEach(log => console.log(log));

  console.log('\n浏览器保持打开，按 Ctrl+C 关闭');

  // 保持浏览器打开以便手动检查
  await page.waitForTimeout(60000);
  await browser.close();
}

debug().catch(console.error);
