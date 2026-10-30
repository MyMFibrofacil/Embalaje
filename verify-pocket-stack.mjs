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
const door=get('Pta Heladera Sup'),rack=get('Cuerpo126');over(door,rack);
for(const a of ['x','z'])assert(Math.abs(door.packed[a]-rack.packed[a])<1e-6);
for(const n of ['techo alzada','base alzada']){over(get(n),get('Pta Heladera Inf'));over(get('piso'),get(n))}
over(get('fondo heladera'),get('piso'));
for(const n of ['Cuerpo122','Cuerpo123','Cuerpo124','Cuerpo125'])over(get('manija 2 (1)'),get(n));
assert.equal(pieces.length,47);assert.equal(new Set(pieces.map(p=>p.layer)).size,19);
console.log('47 pieces, 19 steps; corrected stack relations verified.');
