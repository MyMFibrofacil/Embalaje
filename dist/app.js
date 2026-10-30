import * as THREE from 'three';
import { OrbitControls } from './vendor/OrbitControls.js';
import { OBJLoader } from './vendor/OBJLoader.js';
import { packing } from './packing.js?v=20261030-16';
import { pocketSequence, assignPocketSequence, correctPocketStack } from './pocket-sequence.js?v=20261030-19';

const canvas=document.querySelector('#viewer');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.outputColorSpace=THREE.SRGBColorSpace;
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(34,1,.1,1200);
const controls=new OrbitControls(camera,canvas);controls.enableDamping=true;controls.target.set(0,0,0);controls.minDistance=55;controls.maxDistance=440;
scene.add(new THREE.HemisphereLight(0xfaf7ef,0x64717a,2.1));
const key=new THREE.DirectionalLight(0xfff2dd,3.5);key.position.set(80,130,110);key.castShadow=true;scene.add(key);
const rim=new THREE.DirectionalLight(0xb8d6e5,1.2);rim.position.set(-120,40,-80);scene.add(rim);
const grid=new THREE.GridHelper(300,30,0xadb2ad,0xcfd1cc);grid.position.y=-48;grid.material.opacity=.3;grid.material.transparent=true;scene.add(grid);

const mdf=new THREE.MeshStandardMaterial({color:0xbc8d61,roughness:.8});
const pale=new THREE.MeshStandardMaterial({color:0xe9ddca,roughness:.84});
const dark=new THREE.MeshStandardMaterial({color:0x6b4a33,roughness:.74});
const aluminum=new THREE.MeshStandardMaterial({color:0x89969c,roughness:.3,metalness:.68});
const edgeMaterial=new THREE.LineBasicMaterial({color:0x38271e,transparent:true,opacity:.82});
const casaRoot=new THREE.Group();casaRoot.rotation.x=Math.PI/2;scene.add(casaRoot);
const pocketAssembledRoot=new THREE.Group();scene.add(pocketAssembledRoot);
const pocketPackedRoot=new THREE.Group();scene.add(pocketPackedRoot);
let casaPackView=null,casaPieces=[],pocketAssembledPieces=[],pocketPackedPieces=[],pocketLayerCount=1;
let product=null,mode='current',explode=0,activeLayer=1,animation=null;

const casaLayerNames=['Protección MDF · 40 × 70 × 0,3 cm','Dos fondos rectangulares superpuestos','Fondo triangular + escalera en el mismo plano','Laterales + dos trabas por ventanita','Dos techos girados 90°','Dos pisos lado a lado','Tercer piso superior'];
let pocketLayerNames=['Cargando capas…'];
const supplies={
  pocket:{product:'F9/JS- Cocina Integral Pocket',code:'FC0004030005',items:[
    {name:'Tornillo dorado 3 × 12 mm',qty:26,kind:'screw',finish:'gold',length:12},
    {name:'Tornillo dorado 3 × 10 mm',qty:40,kind:'screw',finish:'gold',length:10},
    {name:'Tornillo negro 25 mm',qty:2,kind:'screw',finish:'black',length:25},
    {name:'Tarugo 6 × 20 mm',qty:60,kind:'dowel',length:20}
  ]},
  casa60:{product:'F9/LC- Casa 60 cm Escalera Desarmada',code:'FC0005010001',items:[
    {name:'Tarugo 6 × 20 mm',qty:12,kind:'dowel',length:20}
  ]}
};

function allMeshes(root){const out=[];root.traverse(o=>{if(o.isMesh)out.push(o)});return out}
function casaMaterial(name){if(name.toLowerCase().includes('fondo'))return pale;if(name.startsWith('Cuerpo')||name==='Escalera')return dark;return mdf}
function pocketMaterial(name){return name.toLowerCase().includes('bacha')?aluminum:mdf}
function addPieceEdges(mesh){const edges=new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry,25),edgeMaterial);edges.renderOrder=1;mesh.add(edges)}
function makePieces(raw,root,materialFor,target,keyName){
  const meshes=allMeshes(raw),boxAll=new THREE.Box3();
  meshes.forEach((mesh,index)=>{mesh.geometry.computeBoundingBox();const box=mesh.geometry.boundingBox.clone(),center=box.getCenter(new THREE.Vector3());boxAll.expandByPoint(box.min);boxAll.expandByPoint(box.max);mesh.geometry.translate(-center.x,-center.y,-center.z);mesh.material=materialFor(mesh.name||'');addPieceEdges(mesh);mesh.castShadow=true;mesh.receiveShadow=true;const holder=new THREE.Group();holder.name=mesh.name||`Pieza ${index+1}`;holder.userData.pieceName=holder.name;mesh.userData.pieceName=holder.name;holder.add(mesh);root.add(holder);target.push({holder,name:holder.name,[keyName]:center.clone(),index})});
  const center=boxAll.getCenter(new THREE.Vector3());target.forEach(p=>{p[keyName].sub(center);p.holder.position.copy(p[keyName])});
}

packing(scene).then(v=>{casaPackView=v;refreshStatus();applyState()});
new OBJLoader().load('./assets/casa60.obj',raw=>{makePieces(raw,casaRoot,casaMaterial,casaPieces,'assembled');refreshStatus();applyState()},undefined,console.error);
new OBJLoader().load('./assets/cocina-integral-pocket.obj',raw=>{makePieces(raw,pocketAssembledRoot,pocketMaterial,pocketAssembledPieces,'assembled');refreshStatus();applyState()},undefined,console.error);
new OBJLoader().load('./assets/cocina-integral-pocket-embalada.obj',raw=>{
  const meshes=allMeshes(raw),boxAll=new THREE.Box3(),temp=[];
  meshes.forEach((mesh,index)=>{mesh.geometry.computeBoundingBox();const box=mesh.geometry.boundingBox.clone(),center=box.getCenter(new THREE.Vector3());boxAll.expandByPoint(box.min);boxAll.expandByPoint(box.max);mesh.geometry.translate(-center.x,-center.y,-center.z);mesh.material=pocketMaterial(mesh.name||'');addPieceEdges(mesh);mesh.castShadow=true;mesh.receiveShadow=true;const holder=new THREE.Group();holder.name=mesh.name||`Pieza ${index+1}`;holder.userData.pieceName=holder.name;mesh.userData.pieceName=holder.name;holder.add(mesh);pocketPackedRoot.add(holder);temp.push({holder,name:holder.name,packed:center.clone(),world:center.clone(),box,index})});
  const center=boxAll.getCenter(new THREE.Vector3());
  assignPocketSequence(temp);
  correctPocketStack(temp);
  temp.forEach(p=>{p.packed.sub(center);p.holder.position.copy(p.packed);pocketPackedPieces.push(p)});
  pocketLayerCount=pocketSequence.length;pocketLayerNames=pocketSequence.map(step=>step.label);if(product==='pocket'&&mode==='current')activeLayer=pocketLayerCount;
  refreshStatus();configureProgress();applyState();
},undefined,console.error);

function ready(){return casaPieces.length&&casaPackView&&pocketAssembledPieces.length&&pocketPackedPieces.length}
function refreshStatus(){const el=document.querySelector('#loadStatus');if(!product){el.textContent='Cargando modelos…';return}const count=product==='casa60'?casaPieces.length:pocketAssembledPieces.length;el.textContent=count?`Modelo listo · ${count} grupos`:'Cargando modelo…';document.querySelector('.status').classList.toggle('loaded',!!count)}
function isPacking(){return mode==='current'||mode==='optimized'}
function layerCount(){return product==='casa60'?7:pocketLayerCount}
function layerNames(){return product==='casa60'?casaLayerNames:pocketLayerNames}
function modelCenter(pieces,key){const b=new THREE.Box3();pieces.forEach(p=>b.expandByPoint(p[key]));return b.getCenter(new THREE.Vector3())}

function applyExploded(pieces,key,amount){const c=modelCenter(pieces,key);pieces.forEach((p,i)=>{const base=p[key].clone().sub(c),dir=base.clone().normalize();if(dir.length()<.1)dir.set(Math.sin(i),.4,Math.cos(i));p.holder.position.lerp(base.add(dir.multiplyScalar(amount)),.2);p.holder.visible=true})}
function applyState(){
  const casa=product==='casa60',packed=isPacking();casaRoot.visible=casa&&!packed;pocketAssembledRoot.visible=!casa&&!packed;pocketPackedRoot.visible=!casa&&packed;
  if(casaPackView)casaPackView.update(casa&&packed,activeLayer/7,mode==='optimized'?7:0,'c');
  if(!packed){grid.visible=true;document.querySelector('#layerCard').hidden=true;if(casa&&casaPieces.length)applyExploded(casaPieces,'assembled',explode*48);if(!casa&&pocketAssembledPieces.length)applyExploded(pocketAssembledPieces,'assembled',explode*42);return}
  if(!casa&&pocketPackedPieces.length){const count=pocketLayerCount;for(const p of pocketPackedPieces){const pos=p.packed.clone();if(mode==='optimized')pos.y+=(p.layer-(count-1)/2)*2.65;p.holder.position.lerp(pos,.22);p.holder.visible=p.layer<activeLayer}}
  const names=layerNames(),idx=Math.max(0,Math.min(activeLayer-1,names.length-1)),showLayer=isPacking();document.querySelector('#layerCard').hidden=!showLayer;if(showLayer){document.querySelector('#layerName').textContent=`Capa ${activeLayer} · ${names[idx]}`;document.querySelector('#layerNote').textContent='Esto es lo que se agrega en esta capa.'}
}

const copy={
  casa60:{exploded:['ARMADO','Casa 60 · armada','Modelo completo en su posición de uso.'],current:['EMBALADO','Casa 60 · paquete completo','Todas las piezas en su posición final de embalaje.'],optimized:['CAPAS','Casa 60 · capas separadas','Cada plano se eleva para revisar su contenido.']},
  pocket:{exploded:['ARMADO','Cocina Integral Pocket · armada','Modelo completo en su posición de uso.'],current:['EMBALADO','Cocina Pocket · paquete completo','Todas las piezas en su posición final de embalaje.'],optimized:['CAPAS','Cocina Pocket · capas separadas','Inspección del apilado, una capa por vez.']}
};
function setCamera(){const mobile=matchMedia('(max-width: 800px)').matches;const cam=product==='casa60'?(isPacking()?(mobile?[125,180,205]:[105,145,150]):(mobile?[210,175,250]:[170,130,195])):(isPacking()?(mobile?[135,165,175]:[110,125,120]):(mobile?[225,185,260]:[190,145,210]));camera.position.set(...cam);controls.target.set(0,0,0);controls.update()}
function configureProgress(){const range=document.querySelector('#progress'),stepper=document.querySelector('#layerStepper');if(isPacking()){const count=layerCount();activeLayer=Math.max(1,Math.min(activeLayer,count));range.min=1;range.max=count;range.step=1;range.value=activeLayer;range.setAttribute('aria-label','Capa activa');document.querySelector('#progressTitle').textContent='Capas';document.querySelector('#progressLabel').textContent=`${activeLayer}/${count}`;document.querySelector('#layerStepLabel').textContent=`Capa ${activeLayer} de ${count}`;document.querySelector('#previousLayer').disabled=activeLayer<=1;document.querySelector('#nextLayer').disabled=activeLayer>=count;stepper.hidden=false}else{range.min=0;range.max=100;range.step=1;range.value=Math.round(explode*100);range.setAttribute('aria-label','Separación del despiece');document.querySelector('#progressTitle').textContent='Separación';document.querySelector('#progressLabel').textContent=`${Math.round(explode*100)}%`;stepper.hidden=true}}
function setMode(next,reset=true){mode=next;document.body.classList.toggle('packing-mode',isPacking());document.body.classList.toggle('assembled-mode',!isPacking());document.querySelectorAll('.mode').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));if(reset){if(isPacking())activeLayer=layerCount();else explode=0}const t=copy[product][mode];document.querySelector('#eyebrow').textContent=t[0];document.querySelector('#viewHeading').textContent=t[1];document.querySelector('#viewCopy').textContent=t[2];document.querySelector('#playSequence').hidden=true;document.querySelector('#pieceInfo').hidden=true;configureProgress();setCamera();applyState()}
function selectProduct(next){product=next;document.querySelector('#library').hidden=true;document.querySelector('#appShell').hidden=false;document.querySelector('#productMark').textContent=product==='casa60'?'C60':'CIP';document.querySelector('#productTitle').textContent=product==='casa60'?'Casa 60':'Cocina Integral Pocket';document.querySelector('#productSubtitle').textContent='Armado · embalado · insumos';document.title=`${document.querySelector('#productTitle').textContent} · Visualizador 3D`;refreshStatus();setMode('current',true)}

document.querySelectorAll('[data-choose]').forEach(b=>b.addEventListener('click',()=>selectProduct(b.dataset.choose)));
document.querySelector('#changeProduct').addEventListener('click',()=>{document.body.classList.remove('packing-mode','assembled-mode');document.querySelector('#library').hidden=false;document.querySelector('#appShell').hidden=true;if(animation){cancelAnimationFrame(animation);animation=null}});
document.querySelectorAll('.mode').forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.mode,true)));
document.querySelector('#resetView').addEventListener('click',setCamera);
document.querySelector('#progress').addEventListener('input',e=>{if(isPacking())activeLayer=+e.target.value;else explode=+e.target.value/100;configureProgress();applyState()});
function changeLayer(delta){activeLayer=Math.max(1,Math.min(layerCount(),activeLayer+delta));configureProgress();applyState()}
document.querySelector('#previousLayer').addEventListener('click',()=>changeLayer(-1));document.querySelector('#nextLayer').addEventListener('click',()=>changeLayer(1));
document.querySelector('#playSequence').addEventListener('click',()=>{if(animation){cancelAnimationFrame(animation);animation=null;return}activeLayer=1;configureProgress();applyState();let last=performance.now();const tick=now=>{if(now-last>720){last=now;if(activeLayer<layerCount()){activeLayer++;configureProgress();applyState()}else{animation=null;return}}animation=requestAnimationFrame(tick)};animation=requestAnimationFrame(tick)});

const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();let pointerStart=null;
canvas.addEventListener('pointerdown',e=>{pointerStart=[e.clientX,e.clientY]});
canvas.addEventListener('pointerup',e=>{if(!pointerStart||Math.hypot(e.clientX-pointerStart[0],e.clientY-pointerStart[1])>6)return;const r=canvas.getBoundingClientRect();pointer.x=((e.clientX-r.left)/r.width)*2-1;pointer.y=-((e.clientY-r.top)/r.height)*2+1;raycaster.setFromCamera(pointer,camera);const hits=raycaster.intersectObjects(scene.children,true);let name=null;for(const hit of hits){let o=hit.object;while(o&&!name){name=o.userData?.pieceName;o=o.parent}if(name)break}if(name){document.querySelector('#pieceName').textContent=name;document.querySelector('#pieceInfo').hidden=false}});
document.querySelector('#closePiece').addEventListener('click',()=>{document.querySelector('#pieceInfo').hidden=true});

const suppliesSheet=document.querySelector('#suppliesSheet');
function closeSupplies(){suppliesSheet.hidden=true;document.body.classList.remove('supplies-open')}
function selectSupply(button,item,data){document.querySelectorAll('.hardware-item').forEach(el=>el.classList.toggle('active',el===button));document.querySelector('#supplyName').textContent=item.name;document.querySelector('#supplyMeta').textContent=`${item.qty} unidades · ${data.code}`}
function supplyIcon(item){if(item.kind==='dowel')return `<svg class="hardware-svg" viewBox="0 0 96 72" aria-hidden="true"><defs><linearGradient id="wood" x1="0" x2="1"><stop stop-color="#8a5a32"/><stop offset=".45" stop-color="#d19a5e"/><stop offset="1" stop-color="#8b5c35"/></linearGradient></defs><rect x="32" y="7" width="32" height="58" rx="15" fill="url(#wood)" stroke="#6f4527" stroke-width="2"/><path d="M39 10v52M47 8v56M55 9v54" stroke="#704625" stroke-width="2" opacity=".75"/><path d="M34 20h28M33 30h30M33 41h30M34 52h28" stroke="#e0b176" stroke-width="2" opacity=".8"/></svg>`;const end=item.length>=20?88:item.length>=12?78:72,base=item.finish==='black'?'#353b3e':'#b9862d',light=item.finish==='black'?'#7b8487':'#e6bd63',threads=Array.from({length:Math.max(5,Math.floor((end-31)/7))},(_,i)=>{const x=33+i*7;return `<path d="M${x} 27l7 18"/>`}).join('');return `<svg class="hardware-svg" viewBox="0 0 96 72" aria-hidden="true"><defs><linearGradient id="metal-${item.finish}" x1="0" x2="0" y1="0" y2="1"><stop stop-color="${light}"/><stop offset=".55" stop-color="${base}"/><stop offset="1" stop-color="#5b4729"/></linearGradient></defs><path d="M10 23h17l7 8v10l-7 8H10z" fill="url(#metal-${item.finish})" stroke="#2e3132" stroke-width="2"/><path d="M15 27l12 18M27 27L15 45" stroke="#f3dfae" stroke-width="2" opacity=".8"/><path d="M32 30H${end-7}L${end} 36l-${end-(end-7)} 6H32z" fill="url(#metal-${item.finish})" stroke="#2e3132" stroke-width="2"/><g stroke="${light}" stroke-width="2">${threads}</g></svg>`}
function renderSupplies(){const data=supplies[product],bag=document.querySelector('#bagItems');bag.replaceChildren();bag.classList.toggle('single',data.items.length===1);data.items.forEach((item,index)=>{const button=document.createElement('button');button.className=`hardware-item${index===0?' active':''}`;button.innerHTML=`${supplyIcon(item)}<span>${item.name}</span><b>${item.qty} u.</b>`;button.addEventListener('click',()=>selectSupply(button,item,data));bag.append(button)});document.querySelector('#suppliesProduct').textContent=data.product;document.querySelector('#suppliesFooter').textContent=`Código de producto: ${data.code}`;selectSupply(bag.firstElementChild,data.items[0],data)}
document.querySelector('#openSupplies').addEventListener('click',()=>{renderSupplies();suppliesSheet.hidden=false;document.body.classList.add('supplies-open')});
document.querySelector('#closeSupplies').addEventListener('click',closeSupplies);document.querySelector('#suppliesBackdrop').addEventListener('click',closeSupplies);
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!suppliesSheet.hidden)closeSupplies()});

const requested=new URLSearchParams(location.search).get('product');if(requested==='casa60'||requested==='pocket')selectProduct(requested);
function resize(){const w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h)return;if(canvas.width!==w*renderer.getPixelRatio()||canvas.height!==h*renderer.getPixelRatio()){renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()}}
function loop(){resize();applyState();controls.update();renderer.render(scene,camera);requestAnimationFrame(loop)}loop();
