const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome'});
 const page=await browser.newPage({viewport:{width:1100,height:760}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.GAME_URL||'http://localhost:5174');
 await page.waitForFunction(()=>window.__hakimi);
 await page.evaluate(()=>{
 const {game:g}=window.__hakimi;g.start();g.mode='paused';g.spawn=1e6;
 for(const id of [21,22,23]){g.applyUpgrade(id);g.levels[id]=8;g.evolved[id]=true;}
 for(const id of [3,9,10,12,14,15,16,17])g.applyUpgrade(id);
 for(let i=0;i<12;i++){g.spawnEnemy();const e=g.enemies.at(-1);e.x=(i%4-1)*90;e.y=(Math.floor(i/4)-1)*120;e.hp=e.max=10000;}
 g.grid.rebuild(g.enemies);g.summonHoney();g.fireBean();g.summonMambo();g.attacks(.2);g.time=.2;g.attacks(.2);g.time=.4;g.mode='ready';
 });
 await page.waitForTimeout(150);await page.screenshot({path:'artifacts/bean-honey-mambo-desktop.png'});
 const geometry=await page.evaluate(()=>{
 const {game:g,render:r}=window.__hakimi,c=document.createElement('canvas');c.width=904;c.height=572;const ctx=c.getContext('2d');
 g.honeyPools=[];g.mamboWaves=[{width:160,life:3,damage:40,evolved:true,hits:new Map()}];new r.constructor(ctx).honeyGround(g,588,330);
 const occupied=x=>{const data=ctx.getImageData(x,0,1,572).data;return data.some((v,i)=>i%4===3&&v>0);};return [occupied(500),occupied(520),occupied(660),occupied(675)];
 });assert.deepEqual(geometry,[false,true,true,false]);
 await page.setViewportSize({width:452,height:286});await page.waitForTimeout(100);await page.screenshot({path:'artifacts/bean-honey-mambo-mobile.png'});
 await page.evaluate(()=>{const {game:g,action}=window.__hakimi;g.mode='playing';action('details');});
 const panel=page.getByRole('dialog');await panel.waitFor({state:'visible'});const text=await panel.textContent();
 for(const name of ['南北绿豆机关炮','蜂蜜海','超级曼波','减速50%持续2秒','吸取范围','冷却缩减'])assert.ok(text.includes(name),name);
 const bounds=await panel.boundingBox();assert.ok(bounds.x>=0&&bounds.x+bounds.width<=452&&bounds.y>=0&&bounds.y+bounds.height<=286);
 await page.getByRole('button',{name:'关闭 · 继续'}).click();
 await page.evaluate(()=>{const g=window.__hakimi.game;g.mode='choice';g.choices=[21,22,23];g.levels.fill(0);g.evolved.fill(false);});
 await page.waitForTimeout(300);await page.screenshot({path:'artifacts/bean-honey-mambo-choices.png'});
 assert.deepEqual(errors,[]);await browser.close();console.log('Bean/honey/mambo desktop, mobile, geometry and details passed');
})().catch(e=>{console.error(e);process.exit(1)});
