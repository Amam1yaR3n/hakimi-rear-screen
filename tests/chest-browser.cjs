const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome'});
 const page=await browser.newPage({viewport:{width:1100,height:760}}); const errors=[]; page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.GAME_URL||'http://localhost:5174');
 const pixels=await page.evaluate(()=>{
  const {game:g,render:r}=window.__hakimi;g.start();g.mode='ready';r.draw(g,0);
  const c=document.querySelector('canvas').getContext('2d'),ratio=document.querySelector('canvas').width/904;
  const sample=()=>Array.from(c.getImageData(135*ratio,220*ratio,1,1).data);
  const before=sample();g.mode='choice';g.choices=[0,6,10];r.draw(g,0);return [before,sample()];
 });
 assert.ok(pixels[1][0]<pixels[0][0]);
 await page.screenshot({path:'artifacts/upgrade-camera-dim.png'});
 for(const [roll,count] of [[0,1],[.8,3],[.99,5]]){
  await page.evaluate(roll=>{const {game:g}=window.__hakimi;g.start();g.spawn=10000;g.rng=()=>roll;g.chest();},roll);
  await page.waitForTimeout(900);await page.screenshot({path:`artifacts/chest-${count}-animation.png`});
  await page.evaluate(()=>window.__hakimi.action('chest'));
  assert.equal(await page.evaluate(()=>window.__hakimi.game.mode),'chest');
  assert.equal(await page.evaluate(()=>window.__hakimi.game.chestRewards.length),count);
  await page.screenshot({path:`artifacts/chest-${count}-rewards.png`});
  const box=await page.locator('canvas').boundingBox();await page.mouse.click(box.x+588/904*box.width,box.y+446/572*box.height);
  assert.equal(await page.evaluate(()=>window.__hakimi.game.mode),'playing');
 }
 await page.evaluate(()=>{
  const {game:g,render:r}=window.__hakimi;g.start();g.mode='ready';g.weapons=[0,6,7,8];g.weapons.forEach(i=>g.levels[i]=1);
  g.drops=[[-480,-100],[1000,0],[0,-1000],[0,1000]].map(([x,y])=>({x,y,chest:true,value:0}));
  r.draw(g,0);
 });
 await page.screenshot({path:'artifacts/chest-arrows-four-slots.png'});
 await page.evaluate(()=>{const {game:g}=window.__hakimi;g.start();g.rng=()=>.99;g.chest();g.advanceChest();});
 await page.setViewportSize({width:452,height:286});await page.screenshot({path:'artifacts/chest-five-mobile.png'});
 assert.deepEqual(errors,[]);await browser.close();console.log('Chest tiers, skip/continue, camera dimming, arrows, four slots and mobile render passed');
})().catch(e=>{console.error(e);process.exit(1)});
