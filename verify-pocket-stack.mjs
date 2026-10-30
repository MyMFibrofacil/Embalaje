import fs from 'node:fs';
import assert from 'node:assert/strict';
import {assignPocketSequence,correctPocketStack} from './dist/pocket-sequence.js';
const vertices=[],pieces=[];let current;
for(const line of fs.readFileSync('dist/assets/cocina-integral-pocket-embalada.obj','utf8').split(/\r?\n/)){
 if(line.startsWith('v '))vertices.push(line.slice(2).trim().split(/\s+/).map(Number));
 if(line.startsWith('g ')){current={name:line.slice(2).trim(),indices:new Set()};pieces.push(current)}
 if(line.startsWith('f '))for(const token of line.slice(2).trim().split(/\s+/)){const i=Number(token.split('/')[0]);current.indices.add(i>0?i-1:vertices.length+i)}
}
for(const p of pieces){const pts=[...p.indices].map(i=>vertices[i]);p.box={min:{},max:{}};p.packed={};for(const [i,a] of ['x','y','z'].entries()){p.box.min[a]=Math.min(...pts.map(v=>v[i]));p.box.max[a]=Math.max(...pts.map(v=>v[i]));p.packed[a]=(p.box.min[a]+p.box.max[a])/2}}
assignPocketSequence(pieces);correctPocketStack(pieces);
const get=n=>pieces.find(p=>p.name===n);
const over=(a,b)=>{assert(a.box.min.y>b.box.max.y,`${a.name} must be above ${b.name}`);console.log(`${a.name}: underside ${a.box.min.y.toFixed(3)} > ${b.name}: top ${b.box.max.y.toFixed(3)}`)};
const fondoBajo=get('fondo bajo');
for(const name of ['Cuerpo120','Cuerpo121']){const supplement=get(name);over(supplement,fondoBajo);assert(Math.abs(supplement.box.max.x-fondoBajo.box.max.x)<1e-6);assert(Math.abs(supplement.box.min.z-fondoBajo.box.min.z)<1e-6);console.log(`${name}: aligned to fondo bajo upper-right corner`)}
for(const a of ['x','y','z'])assert(Math.abs(get('Cuerpo120').packed[a]-get('Cuerpo121').packed[a])<1e-6);
const door=get('Pta Heladera Sup'),rack=get('Cuerpo126');over(door,rack);
for(const a of ['x','z'])assert(Math.abs(door.packed[a]-rack.packed[a])<1e-6);
for(const n of ['techo alzada','base alzada']){over(get(n),get('Pta Heladera Inf'));over(get('piso'),get(n))}
over(get('fondo heladera'),get('piso'));
for(const n of ['Cuerpo122','Cuerpo123','Cuerpo124','Cuerpo125']){over(get('manija 2'),get(n));over(get(n),get('manija 2 (1)'))}
assert.equal(get('manija 2 (1)').layer,9);assert.equal(get('manija 2').layer,10);assert.equal(get('manija 1').layer,14);assert.equal(get('estante heladera').layer,14);
for(const a of ['x','z'])assert(Math.abs(get('manija 2').packed[a]-get('manija 2 (1)').packed[a])<1e-6);
const alzadaHandle=get('manija 1'),alzadaFront=get('frente alzada'),nearBurner=get('hornalla'),washerDoor=get('Pta Lavarropas');
assert(Math.abs(alzadaHandle.box.min.y-alzadaFront.box.min.y)<1e-6,'alzada handle must share the front alzada plane');
assert(alzadaHandle.box.min.x>nearBurner.box.max.x,'alzada handle must sit after the nearest burner');
assert(alzadaHandle.box.max.x<washerDoor.box.min.x,'alzada handle must sit before the washer door');
assert(Math.abs(alzadaHandle.packed.z-(nearBurner.packed.z+washerDoor.packed.z)/2)<1e-6,'alzada handle must be centered between burner and washer door');
const alzadaShelf=get('estante heladera');
over(alzadaShelf,get('Pta Heladera Sup'));
for(const n of ['Pta Alzada','hornalla','hornalla (1)','frente alzada','manija 1','Parante Alzada'])over(get(n),alzadaShelf);
over(get('Pta Heladera Inf'),get('Parante Alzada'));
assert.equal(pieces.length,47);assert.equal(new Set(pieces.map(p=>p.layer)).size,19);
console.log('47 pieces, 19 steps; corrected stack relations verified.');
