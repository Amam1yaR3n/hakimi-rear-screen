import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, Enemy } from '../src/game';
import { ID, ITEMS, H, ANCHOR } from '../src/config';
const close=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
function setup(){const g=new Game();g.start();g.weapons=[];g.levels.fill(0);g.spawn=1e6;g.rng=()=>.99;return g;}
function enemy(g:Game,x=100,y=0,elite=false){const e:Enemy={uid:g.nextEnemyId++,x,y,hp:1e6,max:1e6,r:17,elite,flash:0,alive:true};g.enemies.push(e);g.grid.rebuild(g.enemies);return e;}
function effects(g:Game,dt:number){g.time+=dt;g.grid.rebuild(g.enemies);g.updateNewAbilities(dt);}
test('all eight levels follow the approved tables',()=>{
 const g=setup();
 const beans=[[10,1,1.2,1],[10,2,1.2,1],[10,2,1.1,1],[20,2,1.1,1],[20,3,1.1,1],[20,3,1.1,2],[20,4,1.1,2],[30,4,1,2]];
 const honey=[[10,1,28,2],[10,2,33.6,2],[20,2,33.6,2.5],[20,3,39.2,2.5],[30,3,39.2,3],[30,4,44.8,3],[35,4,44.8,3],[40,4,50.4,3]];
 const mambo=[[10,40,.5,2],[10,80,.5,2],[10,80,1,2.75],[20,90,1,2.75],[20,90,1.5,3.5],[30,100,1.5,3.5],[30,100,2,4.25],[40,110,2,4.25]];
 for(let i=0;i<8;i++){for(const id of [ID.bean,ID.honey,ID.mambo])g.levels[id]=i+1;
 const b=g.beanStats,h=g.honeyStats,m=g.mamboStats;
 [b.damage,b.count,b.interval,b.pierce].forEach((v,j)=>close(v,beans[i][j]));
 [h.damage,h.count,h.radius,h.life].forEach((v,j)=>close(v,honey[i][j]));
 [m.damage,m.width,m.life,m.interval].forEach((v,j)=>close(v,mambo[i][j]));}
});
test('passive scaling and exclusions in both forms',()=>{
 for(const evolved of [false,true]){const g=setup();for(const id of [ID.bean,ID.honey,ID.mambo]){g.levels[id]=8;g.evolved[id]=evolved;}
 const b=g.beanStats,h=g.honeyStats,m=g.mamboStats;
 for(const id of [ID.attack,ID.cooldown,ID.range,ID.duration,ID.projectileSpeed,ID.move])g.levels[id]=5;g.levels[ID.amount]=2;
 close(g.beanStats.damage,b.damage*1.5);close(g.beanStats.interval,b.interval*.6);close(g.beanStats.radius,b.radius*1.5);close(g.beanStats.speed,b.speed*1.5);assert.equal(g.beanStats.life,3);assert.equal(g.beanStats.count,b.count+2);
 close(g.honeyStats.damage,h.damage*1.5);close(g.honeyStats.interval,h.interval*.6);close(g.honeyStats.radius,h.radius*1.5);close(g.honeyStats.life,h.life*1.5);assert.equal(g.honeyStats.count,h.count+2);assert.equal(g.honeyStats.speed,evolved?2:0);
 close(g.mamboStats.damage,m.damage*1.5);close(g.mamboStats.interval,m.interval*.6);close(g.mamboStats.width,m.width*1.5);close(g.mamboStats.life,m.life*1.5);
 const before=JSON.stringify([g.beanStats,g.honeyStats,g.mamboStats]);for(const id of [ID.luck,ID.pickup,ID.health,ID.recovery])g.levels[id]=5;assert.equal(JSON.stringify([g.beanStats,g.honeyStats,g.mamboStats]),before);
 g.levels[ID.amount]=0;g.levels[ID.projectileSpeed]=0;assert.deepEqual(g.mamboStats,{damage:m.damage*1.5,interval:m.interval*.6,width:m.width*1.5,life:m.life*1.5});}
});
test('beans aim per shot, sweep in travel order, deduplicate and expire',()=>{
 const g=setup();g.levels[ID.bean]=6;const far=enemy(g,100),near=enemy(g,40);g.fireBean();effects(g,.3);assert.equal(near.hp,999980);assert.equal(far.hp,999980);assert.equal(g.beans.length,0);
 g.evolved[ID.bean]=true;near.x=0;near.y=100;g.fireBean();assert.equal(g.beans[0].vx,840); // far is now equally close and first in the enemy list
 far.alive=false;g.fireBean();close(g.beans[1].vx,0);assert.ok(g.beans[1].vy>0);
 effects(g,.1);const hp=near.hp;effects(g,.01);assert.equal(near.hp,hp);
 effects(g,3);assert.equal(g.beans.length,0);
 for(let i=0;i<130;i++)g.fireBean();assert.equal(g.beans.length,120);
});
test('empty arena does not queue beans and overlapping evolved batches remain bounded',()=>{
 const g=setup();g.applyUpgrade(ID.bean);g.levels[ID.bean]=8;g.evolved[ID.bean]=true;g.levels[ID.amount]=2;g.levels[ID.cooldown]=5;
 for(let i=0;i<100;i++)g.attacks(.1);assert.equal(g.pending.length,0);assert.equal(g.beans.length,0);
 enemy(g,10000);for(let i=0;i<60;i++){g.time+=1/60;g.attacks(1/60);}assert.ok(g.beans.length>6);assert.ok(g.beans.length<=120);
});
test('honey falls without impact damage, ticks per pool and never slows',()=>{
 const g=setup();g.levels[ID.honey]=1;const e=enemy(g);g.summonHoney();assert.equal(g.honeyPools[0].x,100);
 effects(g,.34);assert.equal(e.hp,1e6);effects(g,.01);assert.equal(e.hp,999990);
 effects(g,.49);assert.equal(e.hp,999990);effects(g,.01);assert.equal(e.hp,999980);assert.equal(e.slowUntil,undefined);
 g.summonHoney();effects(g,.35);assert.equal(e.hp,999970);
 const pos=g.honeyPools[0].x;g.player.x=500;effects(g,.1);assert.equal(g.honeyPools[0].x,pos);
 effects(g,4);assert.equal(g.honeyPools.length,0);
});
test('honey ring, travel, growth ceiling, arrival and oldest-pool cap',()=>{
 const g=setup();g.levels[ID.honey]=8;g.evolved[ID.honey]=true;g.levels[ID.duration]=5;g.levels[ID.projectileSpeed]=5;g.levels[ID.move]=5;
 g.summonHoney();const p=g.honeyPools[0];close(Math.hypot(p.x,p.y),140);p.fall=0;g.player.x=-1000;
 effects(g,1);close(p.x,70);close(p.radius,84);effects(g,1);close(p.radius,112);effects(g,1);close(p.radius,112);
 g.player.x=p.x;g.player.y=p.y;const radius=p.radius;effects(g,.1);assert.equal(p.radius,radius);assert.equal(p.x,g.player.x);g.player.x+=100;effects(g,.1);assert.ok(p.x<g.player.x);
 for(let i=0;i<40;i++)g.summonHoney();assert.equal(g.honeyPools.length,30);assert.ok(!g.honeyPools.includes(p));
});
test('mambo follows player, has vertical bounds, independent overlapping hits and refresh-only slow',()=>{
 const g=setup();g.levels[ID.mambo]=8;g.evolved[ID.mambo]=true;const a=enemy(g,0,0,true),outside=enemy(g,200),edge=enemy(g,0,H-ANCHOR.y+18);
 g.summonMambo();g.summonMambo();effects(g,.01);assert.equal(a.hp,999920);assert.equal(outside.hp,1e6);assert.equal(edge.hp,1e6);close(a.slowUntil!,2.01);
 effects(g,.5);assert.equal(a.hp,999920);effects(g,.5);assert.equal(a.hp,999840);close(a.slowUntil!,3.01);
 g.player.x=200;effects(g,.01);assert.equal(outside.hp,999920);
 g.mamboWaves=[];g.player.x=0;g.invulnerable=100;const x=outside.x;g.tick(.1);const slowTravel=x-outside.x;outside.x=x;outside.slowUntil=0;g.tick(.1);assert.ok(x-outside.x>slowTravel*1.9);
});
test('recipes, four slots and same-chest upgrade followed by evolution',()=>{
 for(const id of [ID.bean,ID.honey,ID.mambo]){const g=setup();g.applyUpgrade(id);g.levels[id]=8;g.rng=()=>0;g.chest();assert.equal(g.evolved[id],false);
 g.mode='playing';g.levels[id]=7;const passive=ITEMS[id].prerequisite!;g.applyUpgrade(passive);g.levels[passive]=5;let n=0;g.rng=()=>n++===0?.8:0;g.chest();assert.deepEqual(g.chestRewards.slice(0,2).map(r=>r.kind),['upgrade','evolution']);assert.ok(g.passives.includes(passive));assert.equal(g.weapons.length,1);}
 const g=new Game();for(const id of [ID.bean,ID.honey,ID.mambo])g.applyUpgrade(id);assert.equal(g.weapons.length,4);assert.ok(!g.options().includes(ID.ear));
});
test('pause freezes all new entities and restart clears them',()=>{
 const g=setup();for(const id of [ID.bean,ID.honey,ID.mambo])g.applyUpgrade(id);enemy(g);g.fireBean();g.summonHoney();g.summonMambo();
 for(const mode of ['paused','details','choice','chest'] as const){g.mode=mode;const before=JSON.stringify([g.beans,g.honeyPools,g.mamboWaves,g.cd,g.pending,g.time]);g.tick(.2);assert.equal(JSON.stringify([g.beans,g.honeyPools,g.mamboWaves,g.cd,g.pending,g.time]),before);}
 g.start();assert.equal(g.beans.length+g.honeyPools.length+g.mamboWaves.length+g.pending.length,0);
});
test('ten-minute fully upgraded build stays finite and bounded',()=>{
 const g=setup();g.spawn=0;for(const id of [ID.bean,ID.honey,ID.mambo]){g.applyUpgrade(id);g.levels[id]=8;g.evolved[id]=true;}
 for(const id of [ID.attack,ID.range,ID.cooldown,ID.duration,ID.projectileSpeed,ID.move])g.levels[id]=5;g.levels[ID.amount]=2;
 for(let i=0;i<600*30;i++){g.mode='playing';g.invulnerable=1;g.player.hp=100;g.tick(1/30,{x:Math.sin(i/300),y:Math.cos(i/300)});assert.ok(g.beans.length<=120&&g.honeyPools.length<=30&&g.mamboWaves.length<=3&&g.pending.length<20);assert.ok(Number.isFinite(g.xp+g.player.x+g.player.y));}assert.ok(g.time>599);
});
