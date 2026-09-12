const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
 const browser = await chromium.launch({ headless: true, channel: 'chrome' });
 const page = await browser.newPage({ viewport: { width: 1100, height: 760 }, deviceScaleFactor: 1 });
 const errors = []; page.on('pageerror', e => errors.push(e.message));
 await page.goto(process.env.GAME_URL || 'http://localhost:5174');
 await page.locator('#game').click();
 await page.evaluate(() => {
  const g = window.__hakimi.game; g.spawn = 10000; g.weapons = [6,7,8]; g.levels.fill(0);
  [6,7,8].forEach(id => g.levels[id] = 8); g.passives = [3,4,5,9,10,11,12,13,14,15,16,17];
  g.passives.forEach(id => g.levels[id] = id === 11 ? 0 : id === 10 ? 2 : 5);
 });
 await page.waitForTimeout(100);
 const clickAbilityBar = async () => {
  const box = await page.locator('#game').boundingBox();
  await page.mouse.click(box.x + 135.6 / 904 * box.width, box.y + 286 / 572 * box.height);
 };
 await clickAbilityBar();
 const panel = page.getByRole('dialog'); await panel.waitFor({state:'visible'});
 assert.equal(await panel.locator('article').count(), 15);
 assert.ok((await panel.textContent()).includes('子弹数量'));
 const time = await page.evaluate(() => window.__hakimi.game.time); await page.waitForTimeout(200);
 assert.equal(await page.evaluate(() => window.__hakimi.game.time), time);
 await page.screenshot({path:'artifacts/abilities-details-desktop.png'});
 await page.locator('.ability-content').evaluate(e => e.scrollTop = e.scrollHeight);
 assert.ok(await page.locator('.ability-content').evaluate(e => e.scrollTop > 0));
 await page.keyboard.press('Escape'); assert.equal(await panel.isVisible(),false);
 assert.equal(await page.evaluate(() => window.__hakimi.game.mode),'playing');
 await page.setViewportSize({width:452,height:286}); await clickAbilityBar(); await panel.waitFor({state:'visible'});
 await page.locator('.ability-content').evaluate(e=>e.scrollTop=e.scrollHeight);
 await page.screenshot({path:'artifacts/abilities-details-mobile.png'});
 const bounds = await panel.boundingBox(); assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= 452 && bounds.y >= 0 && bounds.y + bounds.height <= 286);
 await page.getByRole('button',{name:'关闭 · 继续'}).click(); assert.equal(await panel.isVisible(),false);
 // Freeze the actual renderer without a modal and inspect all four truck headings together.
 await page.setViewportSize({width:1100,height:760});
 await page.evaluate(() => {
  const g = window.__hakimi.game; g.mode='ready'; g.player.x=g.player.y=0;g.player.hp=g.maxHP;
  g.enemies=[];g.drops=[];g.numbers=[];g.waves=[];g.paws=[];g.gums=[];
  g.trucks = [[-135,-155,1,0],[140,-155,-1,0],[-135,85,0,1],[140,85,0,-1]].map(([x,y,dx,dy])=>({x,y,dx,dy,life:4,damage:60,hit:new Set()}));
 });
 await page.waitForTimeout(100); await page.screenshot({path:'artifacts/truck-four-directions.png'});
 await page.evaluate(() => {
  const g=window.__hakimi.game;g.trucks=[];g.paws=[{x:-100,y:-100,radius:45,age:.18},{x:110,y:10,radius:40,age:.12}];
  g.gums=Array.from({length:6},(_,i)=>({x:Math.cos(i*Math.PI/3)*85,y:Math.sin(i*Math.PI/3)*85,hits:new Map()}));
 });
 await page.waitForTimeout(100);await page.screenshot({path:'artifacts/paw-gum-effects.png'});
 assert.deepEqual(errors,[]);console.log(JSON.stringify({errors,details:true,scroll:true,mobile:true,truckDirections:4}));
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
