const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
 const browser = await chromium.launch({headless:true,channel:'chrome'});
 const page = await browser.newPage({viewport:{width:1100,height:760},deviceScaleFactor:1});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.GAME_URL || 'http://localhost:5174');
 await page.evaluate(()=>{
  const g=window.__hakimi.game;g.mode='ready';g.weapons=[];g.levels.fill(0);g.spawn=10000;
  for(const id of [18,19,20])g.applyUpgrade(id);g.levels[18]=8;g.evolved[18]=true;g.summonEars();g.levels[18]=0;g.attacks(.6);g.levels[18]=8;
 });
 await page.waitForTimeout(100);await page.screenshot({path:'artifacts/ears-radial-desktop.png'});
 // Draw paired frames to assert that the effect cannot change any left HUD pixel.
 const unchanged = await page.evaluate(()=>{
  const {game:g,render:r}=window.__hakimi;
  const c=document.createElement('canvas');c.width=904;c.height=572;const ctx=c.getContext('2d');g.chicken={age:.18,evolved:true,settled:true};new r.constructor(ctx).chickenOverlay(g);
  return ctx.getImageData(0,0,271,572).data.every(v=>v===0);
 });assert.ok(unchanged);
 await page.waitForTimeout(100);await page.screenshot({path:'artifacts/chicken-impact-desktop.png'});
 await page.setViewportSize({width:452,height:286});await page.waitForTimeout(100);await page.screenshot({path:'artifacts/chicken-impact-mobile.png'});
 await page.evaluate(()=>{const {game:g,action}=window.__hakimi;g.chicken=null;g.mode='playing';action('details');});
 const panel=page.getByRole('dialog');await panel.waitFor({state:'visible'});
 const text=await panel.textContent();for(const name of ['妙脆角·满天脆','叮咚鸡','幸运🍀','精英最大生命30%','双倍小米'])assert.ok(text.includes(name),name);
 await page.screenshot({path:'artifacts/new-abilities-details-mobile.png'});
 const bounds=await panel.boundingBox();assert.ok(bounds.x>=0&&bounds.x+bounds.width<=452&&bounds.y>=0&&bounds.y+bounds.height<=286);
 await page.getByRole('button',{name:'关闭 · 继续'}).click();
 await page.evaluate(()=>{const g=window.__hakimi.game;g.mode='choice';g.choices=[18,19,20];g.levels.fill(0);g.evolved.fill(false);});
 await page.waitForTimeout(300);await page.screenshot({path:'artifacts/new-abilities-choices-mobile.png'});
 assert.deepEqual(errors,[]);await browser.close();console.log('New ability desktop/mobile rendering, HUD clipping and details passed');
})().catch(e=>{console.error(e);process.exit(1)});
