const {chromium}=require('playwright');const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome'});const page=await browser.newPage({viewport:{width:1100,height:760}});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(process.env.GAME_URL||'http://localhost:5174');
 const result=await page.evaluate(()=>{
  const {game:g,render:r}=window.__hakimi;g.start();g.mode='ready';const canvas=document.querySelector('#game'),c=canvas.getContext('2d'),ratio=canvas.width/904;
  const sample=()=>Array.from(c.getImageData(135*ratio,143*ratio,1,1).data);
  r.draw(g,0);const before=sample();g.bombFlash=.45;r.draw(g,0);const flash=sample();
  let camera,world;const lenses=r.lenses.bind(r),attacks=r.newAttacks.bind(r);
  r.lenses=()=>{camera=Array.from([c.getTransform().e,c.getTransform().f]);lenses();};r.newAttacks=(...args)=>{world=Array.from([c.getTransform().e,c.getTransform().f]);attacks(...args);};
  r.effect('bomb',0,0);r.draw(g,.016);r.lenses=lenses;r.newAttacks=attacks;
  return {before,flash,camera,world};
 });
 assert.deepEqual(result.flash,result.before);assert.deepEqual(result.camera,[0,0]);assert.ok(result.world.some(v=>v!==0));
 await page.screenshot({path:'artifacts/fullscreen-flash-shake.png'});
 await page.evaluate(()=>{const {game:g}=window.__hakimi;g.start();g.mode='ready';g.weapons=[1,6,7,8];g.weapons.forEach(i=>g.levels[i]=1);g.levels[17]=5;g.paws=[{x:-100,y:-100,radius:45,age:.18}];g.trucks=[{x:130,y:-125,dx:1,dy:0,life:4,damage:60,hit:new Set()}];g.gums=[{x:127.5,y:0,hits:new Map()}];});
 await page.waitForTimeout(50);await page.screenshot({path:'artifacts/attack-range-max.png'});assert.deepEqual(errors,[]);await browser.close();console.log('Camera cutouts remain blank and fixed during flash and shake; max-range visuals rendered without errors');
})().catch(e=>{console.error(e);process.exit(1)});
