import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, Enemy } from '../src/game';
import { ID, ITEMS, ANCHOR, SAFE, W, H } from '../src/config';
const close = (a: number, b: number) => assert.ok(Math.abs(a-b)<1e-8, `${a} != ${b}`);
function setup() { const g = new Game(); g.start(); g.weapons=[];g.levels.fill(0);g.spawn=10000;g.rng=()=>.99;return g; }
function enemy(g: Game,x=100,y=0,elite=false,hp=1000) {const e:Enemy={uid:g.nextEnemyId++,x,y,hp,max:hp,r:17,elite,alive:true,flash:0};g.enemies.push(e);return e;}
function cast(g:Game,evolved=false) {g.chicken={age:0,evolved,settled:false};g.updateChicken(.18);}

test('ear levels, five modifiers and excluded speed are exact for both forms',()=>{
 const g=setup();g.applyUpgrade(ID.ear);
 assert.deepEqual(g.earStats,{damage:30,count:1,interval:3,life:2,radius:14});
 g.levels[ID.ear]=8;assert.equal(g.earStats.count,4);assert.equal(g.earStats.damage,86);
 for(const id of [ID.attack,ID.range,ID.duration,ID.cooldown,ID.projectileSpeed])g.levels[id]=5;g.levels[ID.amount]=2;
 for(const evolved of [false,true]) {g.evolved[ID.ear]=evolved;const s=g.earStats;close(s.damage,(evolved?110:86)*1.5);close(s.interval,2.3*.6);close(s.life,(evolved?3:2.7)*1.5);assert.equal(s.count,evolved?10:6);close(s.radius,(evolved?20:14)*1.5);
 g.ears=[];g.summonEars();const velocities=g.ears.map(e=>[e.vx,e.vy]);g.levels[ID.projectileSpeed]=0;g.ears=[];g.summonEars();assert.deepEqual(g.ears.map(e=>[e.vx,e.vy]),velocities);}
});
test('ear sweeps pierce, hit each uid once, fall and expire offscreen',()=>{
 const g=setup();g.levels[ID.ear]=1;g.summonEars();g.levels[ID.ear]=0;
 const a=enemy(g,0,-40),b=enemy(g,0,-70);g.attacks(.4);assert.equal(a.hp,970);assert.equal(b.hp,970);g.attacks(.4);assert.equal(a.hp,970);
 assert.ok(g.ears[0].vy>-260);g.ears[0].x=10000;g.attacks(.1);assert.equal(g.ears.length,1);g.attacks(2);assert.equal(g.ears.length,0);
});
test('chicken retention is one roll per cast, preserves existing loot and elite chests',()=>{
 const g=setup();g.levels[ID.chicken]=1;g.levels[ID.luck]=5;let rolls=0;g.rng=()=>{rolls++;return .8;};
 const old={x:500,y:0,chest:false,value:2};g.drops=[old];enemy(g);enemy(g,120);const elite=enemy(g,130,0,true);elite.hp=250;
 cast(g);assert.equal(rolls,1);assert.equal(g.kills,3);assert.deepEqual(g.drops,[old,{x:130,y:0,chest:true,value:0}]);
 g.updateChicken(.1);assert.equal(g.kills,3);assert.equal(rolls,1);
});
test('chicken screen edges intersect and elite takes max-health damage independent of passives',()=>{
 const g=setup();g.levels[ID.chicken]=8;for(const id of [ID.attack,ID.range,ID.amount,ID.duration,ID.projectileSpeed])g.levels[id]=5;
 const left=SAFE-ANCHOR.x,right=W-ANCHOR.x,top=-ANCHOR.y,bottom=H-ANCHOR.y;
 const edges=[enemy(g,left-17),enemy(g,right+17),enemy(g,0,top-17),enemy(g,0,bottom+17)];
 const outside=[enemy(g,left-18),enemy(g,right+18),enemy(g,0,top-18),enemy(g,0,bottom+18)];const elite=enemy(g,100,0,true);
 cast(g);assert.ok(edges.every(e=>!e.alive));assert.ok(outside.every(e=>e.alive));assert.equal(elite.hp,700);assert.equal(g.chickenCooldown,39);
});
test('evolved chicken stacks luck and XP, attracts only rice after animation',()=>{
 const g=setup();g.levels[ID.luck]=5;g.levels[ID.xp]=5;g.rng=()=>0;
 const rice={x:1000,y:0,chest:false,value:2},chest={x:1000,y:0,chest:true,value:0},heal={x:1000,y:0,chest:false,value:0,kind:'heal' as const};g.drops=[rice,chest,heal];enemy(g);
 cast(g,true);const reward=g.drops.find(d=>d.value===8)!;assert.ok(reward);assert.equal(reward.attracted,undefined);g.updateChicken(.27);
 assert.ok(g.drops.filter(d=>!d.kind&&!d.chest).every(d=>d.attracted));assert.ok(g.drops.filter(d=>d.kind||d.chest).every(d=>!d.attracted));g.collect(reward);assert.equal(g.xp,12);assert.equal(g.chicken,null);
});
test('chicken acquisition, upgrade and evolution immediately start a cast and reset cooldown',()=>{
 const g=setup();g.applyUpgrade(ID.cooldown);g.applyUpgrade(ID.chicken);
 assert.equal(g.chicken?.age,0);close(g.cd[ID.chicken],55.2);
 g.attacks(.18);assert.equal(g.chicken?.settled,true);
 g.applyUpgrade(ID.chicken);assert.equal(g.chicken?.age,0);assert.equal(g.chicken?.settled,false);close(g.cd[ID.chicken],52.44);
 g.levels[ID.chicken]=8;g.applyUpgrade(ID.luck);g.rng=()=>0;g.chest();
 assert.equal(g.evolved[ID.chicken],true);assert.equal(g.chicken?.evolved,true);assert.equal(g.chicken?.age,0);close(g.cd[ID.chicken],27.6);
});
test('both recipes require owned passive and allow same-chest upgrade then evolution',()=>{
 for(const id of [ID.ear,ID.chicken]){const g=setup();g.applyUpgrade(id);g.levels[id]=8;g.rng=()=>0;g.chest();assert.equal(g.evolved[id],false);
 g.mode='playing';g.levels[id]=7;const p=ITEMS[id].prerequisite!;g.applyUpgrade(p);g.levels[p]=ITEMS[p].maxLevel;let n=0;g.rng=()=>n++===0?.8:0;g.chest();assert.deepEqual(g.chestRewards.slice(0,2).map(r=>r.kind),['upgrade','evolution']);}
});
test('luck chest and item probability boundaries at every level',()=>{
 for(let l=0;l<=5;l++){
  for(const [roll,count] of [[0,1],[(70-4*l)/100-1e-8,1],[(70-4*l)/100,3],[(95-l)/100-1e-8,3],[(95-l)/100,5]] ) {const g=setup();g.levels[ID.luck]=l;g.rng=()=>roll;g.chest();assert.equal(g.chestRewards.length,count);}
  const m=1+.2*l;
  for(const [roll,kind] of [[0,'heal'],[.00525*m,'magnet'],[.00725*m,'bomb'],[.00875*m+1e-8,undefined]] as const){const g=setup();g.levels[ID.luck]=l;g.rng=()=>roll;const e=enemy(g,100,0,true);g.damage(e,e.hp);assert.equal(g.drops.find(d=>d.kind)?.kind,kind);}
  for(const roll of [l/10-1e-8,l/10]){const g=setup();g.levels[ID.luck]=l;g.rng=()=>Math.max(0,roll);const e=enemy(g);g.damage(e,e.hp);assert.equal(g.drops[0].value,l>0&&roll<l/10?4:2);}
 }
});
test('pause freezes projectiles, chicken and cooldowns; restart clears effects',()=>{
 const g=setup();g.applyUpgrade(ID.ear);g.applyUpgrade(ID.chicken);g.summonEars();g.chicken={age:.1,evolved:true,settled:false};
 for(const mode of ['paused','details','choice','chest'] as const){g.mode=mode;const before: string=JSON.stringify([g.ears,g.chicken,g.cd]);g.tick(.2);assert.equal(JSON.stringify([g.ears,g.chicken,g.cd]),before);}
 g.start();assert.equal(g.ears.length,0);assert.equal(g.chicken,null);assert.equal(g.levels[ID.luck],0);
});
test('ten-minute evolved build has bounded projectiles and finite state',()=>{
 const g=setup();g.spawn=0;for(const id of [ID.ear,ID.chicken]){g.applyUpgrade(id);g.levels[id]=8;g.evolved[id]=true;}for(const id of [ID.luck,ID.duration,ID.cooldown,ID.attack])g.levels[id]=5;g.levels[ID.amount]=2;
 for(let i=0;i<600*30;i++){g.mode='playing';g.player.hp=100;g.invulnerable=1;g.tick(1/30);assert.ok(g.ears.length<=40);assert.ok(Number.isFinite(g.xp));}assert.ok(g.time>599);
});
