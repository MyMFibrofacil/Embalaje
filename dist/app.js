import * as THREE from 'three';
import { OrbitControls } from './vendor/OrbitControls.js';
import { OBJLoader } from './vendor/OBJLoader.js';
import { packing } from './packing.js?v=20261030-16';
import { pocketSequence, assignPocketSequence, correctPocketStack } from './pocket-sequence.js?v=20261030-15';

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
const casaRoot=new THREE.Group();casaRoot.rotation.x=Math.PI/2;scene.add(casaRoot);
const pocketAssembledRoot=new THREE.Group();scene.add(pocketAssembledRoot);
const pocketPackedRoot=new THREE.Group();scene.add(pocketPackedRoot);
let casaPackView=null,casaPieces=[],pocketAssembledPieces=[],pocketPackedPieces=[],pocketLayerCount=1;
let product=null,mode='exploded',explode=.55,activeLayer=1,animation=null;

const casaLayerNames=['Protección MDF · 40 × 70 × 0,3 cm','Dos fondos rectangulares superpuestos','Fondo triangular + escalera en el mismo plano','Laterales + dos trabas por ventanita','Dos techos girados 90°','Dos pisos lado a lado','Tercer piso superior'];
let pocketLayerNames=['Cargando capas…'];

function allMeshes(root){const out=[];root.traverse(o=>{if(o.isMesh)out.push(o)});return out}
function casaMaterial(name){if(name.toLowerCase().includes('fondo'))return pale;if(name.startsWith('Cuerpo')||name==='Escalera')return dark;return mdf}
function pocketMaterial(name){return name.toLowerCase().includes('bacha')?aluminum:mdf}
function makePieces(raw,root,materialFor,target,keyName){
  const meshes=allMeshes(raw),boxAll=new THREE.Box3();
  meshes.forEach((mesh,index)=>{mesh.geometry.computeBoundingBox();const box=mesh.geometry.boundingBox.clone(),center=box.getCenter(new THREE.Vector3());boxAll.expandByPoint(box.min);boxAll.expandByPoint(box.max);mesh.geometry.translate(-center.x,-center.y,-center.z);mesh.material=materialFor(mesh.name||'');mesh.castShadow=true;mesh.receiveShadow=true;const holder=new THREE.Group();holder.name=mesh.name||`Pieza ${index+1}`;holder.userData.pieceName=holder.name;mesh.userData.pieceName=holder.name;holder.add(mesh);root.add(holder);target.push({holder,name:holder.name,[keyName]:center.clone(),index})});
  const center=boxAll.getCenter(new THREE.Vector3());target.forEach(p=>{p[keyName].sub(center);p.holder.position.copy(p[keyName])});
}

packing(scene).then(v=>{casaPackView=v;refreshStatus();applyState()});
new OBJLoader().load('./assets/casa60.obj',raw=>{makePieces(raw,casaRoot,casaMaterial,casaPieces,'assembled');refreshStatus();applyState()},undefined,console.error);
new OBJLoader().load('./assets/cocina-integral-pocket.obj',raw=>{makePieces(raw,pocketAssembledRoot,pocketMaterial,pocketAssembledPieces,'assembled');refreshStatus();applyState()},undefined,console.error);
new OBJLoader().load('./assets/cocina-integral-pocket-embalada.obj',raw=>{
  const meshes=allMeshes(raw),boxAll=new THREE.Box3(),temp=[];
  meshes.forEach((mesh,index)=>{mesh.geometry.computeBoundingBox();const box=mesh.geometry.boundingBox.clone(),center=box.getCenter(new THREE.Vector3());boxAll.expandByPoint(box.min);boxAll.expandByPoint(box.max);mesh.geometry.translate(-center.x,-center.y,-center.z);mesh.material=pocketMaterial(mesh.name||'');mesh.castShadow=true;mesh.receiveShadow=true;const holder=new THREE.Group();holder.name=mesh.name||`Pieza ${index+1}`;holder.userData.pieceName=holder.name;mesh.userData.pieceName=holder.name;holder.add(mesh);pocketPackedRoot.add(holder);temp.push({holder,name:holder.name,packed:center.clone(),world:center.clone(),box,index})});
  const center=boxAll.getCenter(new THREE.Vector3());
  assignPocketSequence(temp);
  correctPocketStack(temp);
  temp.forEach(p=>{p.packed.sub(center);p.holder.position.copy(p.packed);pocketPackedPieces.push(p)});
  pocketLayerCount=pocketSequence.length;pocketLayerNames=pocketSequence.map(step=>step.label);
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
  const names=layerNames(),idx=Math.max(0,Math.min(activeLayer-1,names.length-1));document.querySelector('#layerCard').hidden=false;document.querySelector('#layerName').textContent=`${activeLayer} · ${names[idx]}`;document.querySelector('#layerNote').textContent=product==='pocket'?'Orden de embalaje confirmado · 19 pasos':'Avance discreto, una capa por vez.';
}

const copy={
  casa60:{exploded:['DESPIECE','Casa 60','Separación progresiva de los 21 grupos del modelo.'],current:['EMBALADA','Casa 60 · bulto compacto','Secuencia real de las fotos, capa por capa.'],optimized:['CAPAS','Casa 60 · capas separadas','Cada plano se eleva para revisar su contenido.']},
  pocket:{exploded:['DESPIECE','Cocina Integral Pocket','Separación progresiva de los 40 grupos del modelo.'],current:['EMBALADA','Cocina Pocket · bulto compacto','Orden real: piezas chicas, bacha y tapa.'],optimized:['CAPAS','Cocina Pocket · capas separadas','Inspección del apilado, una capa por vez.']}
};
function setCamera(){const mobile=matchMedia('(max-width: 800px)').matches;const cam=product==='casa60'?(isPacking()?(mobile?[125,180,205]:[105,145,150]):(mobile?[210,175,250]:[170,130,195])):(isPacking()?(mobile?[135,165,175]:[110,125,120]):(mobile?[225,185,260]:[190,145,210]));camera.position.set(...cam);controls.target.set(0,0,0);controls.update()}
function configureProgress(){const range=document.querySelector('#progress'),stepper=document.querySelector('#layerStepper');if(isPacking()){const count=layerCount();activeLayer=Math.max(1,Math.min(activeLayer,count));range.min=1;range.max=count;range.step=1;range.value=activeLayer;range.setAttribute('aria-label','Capa activa');document.querySelector('#progressTitle').textContent='Capas';document.querySelector('#progressLabel').textContent=`${activeLayer}/${count}`;document.querySelector('#layerStepLabel').textContent=`Capa ${activeLayer} de ${count}`;document.querySelector('#previousLayer').disabled=activeLayer<=1;document.querySelector('#nextLayer').disabled=activeLayer>=count;stepper.hidden=false}else{range.min=0;range.max=100;range.step=1;range.value=Math.round(explode*100);range.setAttribute('aria-label','Separación del despiece');document.querySelector('#progressTitle').textContent='Separación';document.querySelector('#progressLabel').textContent=`${Math.round(explode*100)}%`;stepper.hidden=true}}
function setMode(next,reset=true){mode=next;document.body.classList.toggle('packing-mode',isPacking());document.querySelectorAll('.mode').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));if(reset){if(isPacking())activeLayer=1;else explode=.55}const t=copy[product][mode];document.querySelector('#eyebrow').textContent=t[0];document.querySelector('#viewHeading').textContent=t[1];document.querySelector('#viewCopy').textContent=t[2];document.querySelector('#playSequence').hidden=!isPacking();document.querySelector('#pieceInfo').hidden=true;configureProgress();setCamera();applyState()}
function selectProduct(next){product=next;document.querySelector('#library').hidden=true;document.querySelector('#appShell').hidden=false;document.querySelector('#productMark').textContent=product==='casa60'?'C60':'CIP';document.querySelector('#productTitle').textContent=product==='casa60'?'Casa 60':'Cocina Integral Pocket';document.querySelector('#productSubtitle').textContent='Despiece · embalaje · capas';document.title=`${document.querySelector('#productTitle').textContent} · Visualizador 3D`;document.querySelector('[data-mode="exploded"] small').textContent=product==='casa60'?'21 grupos reales':'40 grupos reales';refreshStatus();setMode('exploded',true)}

document.querySelectorAll('[data-choose]').forEach(b=>b.addEventListener('click',()=>selectProduct(b.dataset.choose)));
document.querySelector('#changeProduct').addEventListener('click',()=>{document.body.classList.remove('packing-mode');document.querySelector('#library').hidden=false;document.querySelector('#appShell').hidden=true;if(animation){cancelAnimationFrame(animation);animation=null}});
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

const requested=new URLSearchParams(location.search).get('product');if(requested==='casa60'||requested==='pocket')selectProduct(requested);
function resize(){const w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h)return;if(canvas.width!==w*renderer.getPixelRatio()||canvas.height!==h*renderer.getPixelRatio()){renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()}}
function loop(){resize();applyState();controls.update();renderer.render(scene,camera);requestAnimationFrame(loop)}loop();
