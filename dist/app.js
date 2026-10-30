import * as THREE from 'three';
import { OrbitControls } from './vendor/OrbitControls.js';
import { OBJLoader } from './vendor/OBJLoader.js';
import { packing } from './packing.js?v=20261030-5';
let packView;

const canvas=document.querySelector('#viewer');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2)); renderer.shadowMap.enabled=true; renderer.outputColorSpace=THREE.SRGBColorSpace;
const scene=new THREE.Scene();
packing(scene).then(p=>{packView=p;});
const camera=new THREE.PerspectiveCamera(34,1,.1,1200); camera.position.set(145,105,165);
const controls=new OrbitControls(camera,canvas); controls.enableDamping=true; controls.target.set(0,0,0); controls.minDistance=55; controls.maxDistance=390;
scene.add(new THREE.HemisphereLight(0xfaf7ef,0x64717a,2.1));
const key=new THREE.DirectionalLight(0xfff2dd,3.5);key.position.set(80,130,110);key.castShadow=true;scene.add(key);
const rim=new THREE.DirectionalLight(0xb8d6e5,1.2);rim.position.set(-120,40,-80);scene.add(rim);
const grid=new THREE.GridHelper(260,26,0xadb2ad,0xcfd1cc);grid.position.y=-48;grid.material.opacity=.32;grid.material.transparent=true;scene.add(grid);

const mdf=new THREE.MeshStandardMaterial({color:0xb88d63,roughness:.78,metalness:0});
const pale=new THREE.MeshStandardMaterial({color:0xe8dcc9,roughness:.82});
const dark=new THREE.MeshStandardMaterial({color:0x6b4a33,roughness:.72});
const modelRoot=new THREE.Group(); scene.add(modelRoot);
const pocketRoot=new THREE.Group(); pocketRoot.visible=false; scene.add(pocketRoot);
const baseMaterial=new THREE.MeshStandardMaterial({color:0xd7b48f,roughness:.9});
const packBase=new THREE.Mesh(new THREE.BoxGeometry(60,.8,94),baseMaterial);packBase.position.y=-43;packBase.castShadow=true;packBase.receiveShadow=true;packBase.visible=false;modelRoot.add(packBase);
let pieces=[], pocketPieces=[], pocketLayerCount=1, product='casa60', mode='assembled', progress=1, animation=null, plan='a';
const layerNames=['Tapa exterior','Fondos impresos','Pisos y entrepisos','Laterales','Techos y escalera'];
const layerNotes=['Placa lisa y cantoneras de cartón','Alinear los tres paños; impresión contra impresión','Separador fino entre caras mecanizadas','Ventanas enfrentadas para crear un bolsillo central','Bolsa de piezas chicas fijada, nunca suelta'];

function materialFor(name){if(name.toLowerCase().includes('fondo'))return pale;if(name.startsWith('Cuerpo')||name==='Escalera')return dark;return mdf}
function allMeshes(root){const out=[];root.traverse(o=>{if(o.isMesh)out.push(o)});return out}
function proxySize(name,size){
  if(name.includes('Lateral'))return [22,.9,69.6];
  if(name==='Piso'||name.includes('piso')||name.includes('Piso'))return [58.2,.9,22];
  if(name.includes('Fondo'))return [58.9,.3,name==='Fondo arriba'?28.6:32.3];
  if(name==='techo'||name==='Techo chimenea')return [35.4,.9,38];
  if(name==='Cuerpo12'||name==='Cuerpo13')return [13.3,1.1,37.4];
  return [9.7,.65,1.65];
}

new OBJLoader().load('./assets/casa60.obj', raw=>{
  const groupMeshes=allMeshes(raw);
  groupMeshes.forEach((mesh,index)=>{
    mesh.geometry.computeBoundingBox();
    const box=mesh.geometry.boundingBox; const center=box.getCenter(new THREE.Vector3());
    mesh.geometry.translate(-center.x,-center.y,-center.z); mesh.geometry.computeBoundingBox();
    mesh.material=materialFor(mesh.name); mesh.castShadow=true; mesh.receiveShadow=true;
    const holder=new THREE.Group(); holder.name=mesh.name||`Pieza ${index+1}`; holder.add(mesh);
    const sz=proxySize(holder.name,box.getSize(new THREE.Vector3()));const proxy=new THREE.Mesh(new THREE.BoxGeometry(...sz),materialFor(holder.name));proxy.visible=false;proxy.castShadow=true;proxy.receiveShadow=true;holder.add(proxy);modelRoot.add(holder);
    pieces.push({holder,mesh,proxy,name:holder.name,assembled:center.clone(),index,layer:layerOf(holder.name),baseRot:new THREE.Euler(),packRot:packingRotation(holder.name)});
  });
  document.querySelector('#loadStatus').textContent=`Modelo listo · ${pieces.length} grupos`;
  document.querySelector('.status').classList.add('loaded');
  setMode('assembled',true);
},undefined,err=>{document.querySelector('#loadStatus').textContent='No se pudo cargar el OBJ';console.error(err)});

const pocketMdf=new THREE.MeshStandardMaterial({color:0xb98d62,roughness:.78});
const pocketLight=new THREE.MeshStandardMaterial({color:0xe8dcc9,roughness:.82});
const pocketMetal=new THREE.MeshStandardMaterial({color:0x8b969b,roughness:.42,metalness:.55});
function pocketMaterial(name){const n=name.toLowerCase();if(n.includes('canilla')||n.includes('grifo')||n.includes('bacha')||n.includes('perilla'))return pocketMetal;if(n.includes('fondo'))return pocketLight;return pocketMdf}
new OBJLoader().load('./assets/cocina-integral-pocket-embalada.obj',raw=>{
  const meshes=allMeshes(raw),boxAll=new THREE.Box3();
  meshes.forEach((mesh,index)=>{
    mesh.geometry.computeBoundingBox();const box=mesh.geometry.boundingBox.clone(),center=box.getCenter(new THREE.Vector3());
    boxAll.expandByPoint(box.min);boxAll.expandByPoint(box.max);
    mesh.geometry.translate(-center.x,-center.y,-center.z);mesh.material=pocketMaterial(mesh.name||'');mesh.castShadow=true;mesh.receiveShadow=true;
    const holder=new THREE.Group();holder.name=mesh.name||`Pieza ${index+1}`;holder.add(mesh);pocketRoot.add(holder);
    pocketPieces.push({holder,name:holder.name,packed:center.clone(),layer:0,index});
  });
  const center=boxAll.getCenter(new THREE.Vector3()),minY=boxAll.min.y;
  pocketPieces.forEach(p=>{p.packed.sub(center);p.layer=Math.max(0,Math.round(((p.packed.y+center.y)-minY-.15)/.9));p.holder.position.copy(p.packed)});
  pocketLayerCount=Math.max(...pocketPieces.map(p=>p.layer))+1;
  if(product==='pocket'){renderPocketLayers();applyState()}
  document.querySelector('#loadStatus').textContent=product==='pocket'?`Cocina lista · ${pocketPieces.length} grupos · ${pocketLayerCount} capas`:`Modelos listos · Casa 60 + Cocina Pocket`;
  document.querySelector('.status').classList.add('loaded');
},undefined,err=>{console.error(err);if(product==='pocket')document.querySelector('#loadStatus').textContent='No se pudo cargar Cocina Pocket'});

function layerOf(name){
  if(name.includes('Fondo'))return 1;
  if(name==='Piso'||name.includes('piso')||name.includes('Piso'))return 2;
  if(name.includes('Lateral'))return 3;
  return 4;
}
function packingRotation(name){
  if(name==='techo')return new THREE.Euler(-.68,0,0);
  if(name==='Techo chimenea')return new THREE.Euler(.68,0,0);
  if(name.includes('Lateral'))return new THREE.Euler(0,0,Math.PI/2);
  if(name==='Piso'||name.includes('piso')||name.includes('Piso'))return new THREE.Euler(Math.PI/2,0,0);
  if(name==='Escalera'||name.startsWith('Cuerpo'))return new THREE.Euler(0,0,Math.PI/2);
  return new THREE.Euler();
}
function assembledCenter(){const b=new THREE.Box3();pieces.forEach(p=>b.expandByPoint(p.assembled));return b.getCenter(new THREE.Vector3())}
function packPosition(p,optimized){
  const y=-38+p.layer*10;
  if(p.layer===1){const order=['Fondo bajo','Fondo medio','Fondo arriba'];const i=Math.max(0,order.indexOf(p.name));return new THREE.Vector3(0,y,(i-1)*30)}
  if(p.layer===2){const order=['Piso','Piso agujero','piso arriba'];const i=Math.max(0,order.indexOf(p.name));return new THREE.Vector3(0,y,(i-1)*24)}
  if(p.layer===3){const i=p.name==='Lateral'? -1:1;return new THREE.Vector3(i*11,y,optimized?0:(i*3))}
  const roof=p.name==='techo'||p.name==='Techo chimenea';
  if(roof)return new THREE.Vector3(0,y,p.name==='techo'?-20:20);
  if(p.name==='Cuerpo12'||p.name==='Cuerpo13')return new THREE.Vector3(p.name==='Cuerpo12'?-20:20,y,18);
  const smallIndex=Math.max(0,p.index-11);return new THREE.Vector3(-22+(smallIndex%5)*11,y,-7+Math.floor(smallIndex/5)*6);
}
function applyState(){
  if(product==='pocket'){
    modelRoot.visible=false;if(packView)packView.update(false,0,0,plan);pocketRoot.visible=true;grid.visible=true;
    if(!pocketPieces.length)return;
    const separated=mode==='exploded'||mode==='optimized',sequential=mode==='current'||mode==='optimized';
    pocketPieces.forEach(p=>{
      const pos=p.packed.clone();if(separated)pos.y+=(p.layer-(pocketLayerCount-1)/2)*2.8;
      p.holder.position.lerp(pos,.2);p.holder.visible=!sequential||progress+.001>=(p.layer+1)/pocketLayerCount;
    });
    document.querySelector('#layerCard').hidden=!(mode==='current'||mode==='optimized');
    if(sequential){const active=Math.max(1,Math.ceil(progress*pocketLayerCount));document.querySelector('#layerName').textContent=`Capa ${active} de ${pocketLayerCount}`;document.querySelector('#layerNote').textContent='Orden y posición tomados directamente del OBJ embalado';}
    return;
  }
  pocketRoot.visible=false;
  if(!pieces.length)return;
  modelRoot.rotation.x=THREE.MathUtils.lerp(modelRoot.rotation.x,(mode==='assembled'||mode==='exploded')?Math.PI/2:0,.18);
  const packing=mode==='current'||mode==='optimized';packBase.visible=packing&&progress>=.18;
  modelRoot.visible=!packing;
  if(packView)packView.update(packing,progress,mode==='current'?0:7,plan);
  const c=assembledCenter();
  pieces.forEach((p,i)=>{
    let pos,rot=new THREE.Euler(),scale=1,visible=true;
    if(mode==='assembled')pos=p.assembled.clone().sub(c);
    else if(mode==='exploded'){
      const base=p.assembled.clone().sub(c);const dir=base.clone().normalize(); if(dir.length()<.1)dir.set(Math.sin(i),.4,Math.cos(i));
      pos=base.add(dir.multiplyScalar((1-progress)*75));
    }else{
      const optimized=mode==='optimized'; pos=packPosition(p,optimized); rot=new THREE.Euler();
      const threshold=(p.layer+1)/5;visible=progress+.02>=threshold;
      if(!optimized){pos.y+=(p.index%3)*1.2;pos.x+=Math.sin(p.index*2.1)*2.2}
    }
    p.mesh.visible=!packing;p.proxy.visible=packing;p.holder.visible=visible;p.holder.position.lerp(pos,.18);p.holder.rotation.x=THREE.MathUtils.lerp(p.holder.rotation.x,rot.x,.18);p.holder.rotation.y=THREE.MathUtils.lerp(p.holder.rotation.y,rot.y,.18);p.holder.rotation.z=THREE.MathUtils.lerp(p.holder.rotation.z,rot.z,.18);p.holder.scale.setScalar(scale);
  });
  if(packing){const count=7;document.querySelector('#layerName').textContent=`Capa ${Math.max(1,Math.ceil(progress*count))} de ${count}`;document.querySelector('#layerNote').textContent=plan==='c'?'Orden de las fotos · protección de 40 × 70 cm incluida':'Fondos independientes · troquel y 4 trabas incluidos';}
}
const copy={assembled:['MODELO ARMADO','Casa completa','Modelo original de Fusion, a escala real.'],exploded:['DESPIECE','21 grupos del modelo','Separación progresiva de cada componente real.'],current:['SECUENCIA ACTUAL','Embalaje fotografiado','Apilado superpuesto con piezas chicas alojadas en huecos.'],optimized:['PROPUESTA DE EMBALAJE','Capas protegidas','Orden sugerido para reducir juego y proteger caras visibles.']};
const pocketCopy={assembled:['OBJ EMBALADO','Cocina Integral Pocket','Acomodado exacto recibido, sin reinterpretar posiciones.'],exploded:['LECTURA POR CAPAS','Separación del apilado','Las capas se abren sobre el eje de espesor para inspección.'],current:['SECUENCIA DEL OBJ','Bulto compacto','Revelado progresivo respetando el orden del archivo embalado.'],optimized:['CAPAS SEPARADAS','Cocina Integral Pocket','Posiciones originales con separación vertical para revisar cada plano.']};
function setMode(next,instant=false){mode=next;document.querySelectorAll('.mode').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));const t=(product==='pocket'?pocketCopy:copy)[mode];document.querySelector('#eyebrow').textContent=t[0];document.querySelector('#viewHeading').textContent=t[1];document.querySelector('#viewCopy').textContent=t[2];document.querySelector('#layerCard').hidden=!(mode==='current'||mode==='optimized');grid.visible=product==='pocket'||mode!=='assembled';if(product==='pocket'){camera.position.set(100,115,105);controls.target.set(0,0,0)}else if(mode==='assembled'||mode==='exploded'){camera.position.set(145,105,165);controls.target.set(0,0,0)}else{camera.position.set(105,145,150);controls.target.set(0,0,0)}if(instant&&product==='casa60')pieces.forEach(p=>p.holder.position.copy(p.assembled.clone().sub(assembledCenter())));applyState()}
function updateLayer(i){document.querySelector('#layerName').textContent=`${i+1} · ${layerNames[i]}`;document.querySelector('#layerNote').textContent=layerNotes[i];document.querySelectorAll('.layer-list li').forEach((el,j)=>el.classList.toggle('active',i===j))}

document.querySelectorAll('.mode').forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.mode)));
document.querySelector('#progress').addEventListener('input',e=>{progress=+e.target.value/100;document.querySelector('#progressLabel').textContent=e.target.value+'%';applyState()});
document.querySelectorAll('.layer-list li').forEach(el=>el.addEventListener('click',()=>{setMode('optimized');const s=+el.dataset.step;progress=(s+1)/5;document.querySelector('#progress').value=Math.round(progress*100);document.querySelector('#progressLabel').textContent=Math.round(progress*100)+'%';updateLayer(s);applyState()}));
document.querySelector('#resetView').addEventListener('click',()=>setMode(mode));
document.querySelector('#playSequence').addEventListener('click',()=>{if(animation){cancelAnimationFrame(animation);animation=null;return}if(mode!=='current'&&mode!=='optimized')setMode('optimized');progress=0;const start=performance.now();const tick=now=>{progress=Math.min(1,(now-start)/6000);const v=Math.round(progress*100);document.querySelector('#progress').value=v;document.querySelector('#progressLabel').textContent=v+'%';applyState();if(progress<1)animation=requestAnimationFrame(tick);else animation=null};animation=requestAnimationFrame(tick)});
copy.current=['BULTO COMPACTO','Propuesta apilada','Contornos DXF · separadores de 1 mm entre capas.'];
copy.optimized=['CAPAS SEPARADAS','Orden de embalaje','Separación vertical ampliada para inspeccionar las siete capas.'];
document.querySelector('[data-mode="current"] span:last-child').innerHTML='<b>Bulto compacto</b><small>Propuesta apilada</small>';
document.querySelector('[data-mode="optimized"] span:last-child').innerHTML='<b>Capas separadas</b><small>Contornos del DXF</small>';
document.querySelector('.metric-grid article:last-child').innerHTML='<span id="planMetricTitle">Plan A · huella</span><strong id="planMetric">58,9 × 69,6 cm</strong><small id="planMetricNote">Sin caja ni protección exterior</small>';
document.querySelector('.saving').innerHTML='<p>Espesor de escalones: 3 mm confirmado. Resto de espesores y cantidad final de trabas: validar con producción. No se declara ahorro porcentual.</p>';
document.querySelector('.layer-list').previousElementSibling.innerHTML='<span>Capas propuestas</span><span>7</span>';
document.querySelector('#layerList').innerHTML=['Fondo bajo','Fondo medio','Fondo superior','Tres pisos, lado a lado','Dos laterales, lado a lado','Dos techos, lado a lado','Troquel, largueros y cuatro trabas'].map((n,i)=>`<li data-layer="${i}"><i>${i+1}</i><div><b>${n}</b></div></li>`).join('');
document.querySelectorAll('[data-layer]').forEach(el=>el.addEventListener('click',()=>{setMode('optimized');progress=(+el.dataset.layer+1)/7;document.querySelector('#progress').value=progress*100;document.querySelector('#progressLabel').textContent=`${+el.dataset.layer+1}/7 capas`;}));
document.querySelector('.callout').innerHTML='<b>Escalones en un único troquel</b><p>155,2 × 110 × 3 mm. Las cuatro trabas se muestran con sus contornos del DXF. Los dos largueros se representan con el contorno izquierdo; confirmar el derecho antes de producir.</p>';
function setPlan(next){
  plan=next;const isB=plan==='b',isC=plan==='c';
  document.querySelectorAll('.plan').forEach(b=>b.classList.toggle('active',b.dataset.plan===plan));
  document.querySelector('#planMetricTitle').textContent=isC?'Según fotos · huella':isB?'Plan B · huella':'Plan A · huella';
  document.querySelector('#planMetric').textContent=isC?'45,6 × 70 cm':'58,9 × 69,6 cm';
  document.querySelector('#planMetricNote').textContent=isC?'Base protectora: 40 × 70 × 0,3 cm':isB?'Misma huella · +0,9 cm estimada de altura':'Sin caja ni protección exterior';
  document.querySelector('.saving').innerHTML=isC?'<p>Secuencia copiada de las fotos. Los techos rotados definen el ancho máximo de 45,6 cm; la protección inferior mide 40 × 70 cm.</p>':isB?'<p>Plan B: dos pisos quedan juntos. El tercero gira 90° y comparte capa con los laterales, que se apilan. La capa de pisos queda más chica; la huella exterior la siguen definiendo los laterales.</p>':'<p>Plan A: los tres pisos se mantienen juntos. Es la referencia original para comparar el cambio.</p>';
  document.querySelector('.callout').innerHTML=isC?'<b>Orden real de embalaje</b><p>El fondo triangular y la escalera completa comparten el mismo plano, sin piezas apoyadas encima. Las cuatro trabas se reparten de a dos en cada ventanita. Dos pisos comparten la capa 6 y el tercero cierra en la capa 7.</p>':isB?'<b>Plan B · piso reubicado</b><p>El piso superior se coloca girado junto a los dos laterales superpuestos. Agrega 9 mm de altura en esa capa, pero conserva el bulto exterior.</p>':'<b>Plan A · tres pisos</b><p>Los tres pisos comparten una misma capa. Escalones, largueros y cuatro trabas viajan en el troquel de 3 mm.</p>';
  const names=isC?['Protección MDF · 40 × 70 × 0,3 cm','Dos fondos rectangulares superpuestos','Fondo triangular + escalera en el mismo plano','Laterales + 2 trabas por ventanita','Dos techos girados 90°','Dos pisos lado a lado','Tercer piso superior']:isB?['Fondo bajo','Fondo medio','Fondo superior','Dos pisos juntos','Piso superior + laterales','Dos techos, lado a lado','Troquel, largueros y cuatro trabas']:['Fondo bajo','Fondo medio','Fondo superior','Tres pisos, lado a lado','Dos laterales, lado a lado','Dos techos, lado a lado','Troquel, largueros y cuatro trabas'];
  const count=names.length;
  document.querySelector('.layer-list').previousElementSibling.innerHTML=`<span>Capas propuestas</span><span>${count}</span>`;
  document.querySelector('#layerList').innerHTML=names.map((n,i)=>`<li data-layer="${i}"><i>${i+1}</i><div><b>${n}</b></div></li>`).join('');
  document.querySelectorAll('[data-layer]').forEach(el=>el.addEventListener('click',()=>{setMode('optimized');progress=(+el.dataset.layer+1)/count;document.querySelector('#progress').value=progress*100;document.querySelector('#progressLabel').textContent=`${+el.dataset.layer+1}/${count} capas`;applyState();}));
  copy.optimized[2]=isC?'Separación vertical para revisar las siete capas en el orden de las fotos.':'Separación vertical ampliada para inspeccionar las siete capas.';
  if(mode==='optimized')document.querySelector('#viewCopy').textContent=copy.optimized[2];
  applyState();
}
document.querySelectorAll('.plan').forEach(b=>b.addEventListener('click',()=>setPlan(b.dataset.plan)));
setPlan('c');
function renderPocketLayers(){
  if(!pocketPieces.length)return;
  const byLayer=Array.from({length:pocketLayerCount},()=>[]);pocketPieces.forEach(p=>byLayer[p.layer]?.push(p.name));
  document.querySelector('.layer-list').previousElementSibling.innerHTML=`<span>Capas del OBJ</span><span>${pocketLayerCount}</span>`;
  document.querySelector('#layerList').innerHTML=byLayer.map((names,i)=>{const shown=names.slice(0,2).join(' + ')||'Piezas';const more=names.length>2?` + ${names.length-2} más`:'';return `<li data-pocket-layer="${i}"><i>${i+1}</i><div><b>${shown}${more}</b><small>posición original del archivo</small></div></li>`}).join('');
  document.querySelectorAll('[data-pocket-layer]').forEach(el=>el.addEventListener('click',()=>{setMode('optimized');progress=(+el.dataset.pocketLayer+1)/pocketLayerCount;document.querySelector('#progress').value=progress*100;document.querySelector('#progressLabel').textContent=`${+el.dataset.pocketLayer+1}/${pocketLayerCount} capas`;applyState()}));
}
function setProduct(next){
  product=next;const pocket=product==='pocket';document.title=pocket?'Cocina Integral Pocket · Embalaje 3D':'Casa 60 · Embalaje 3D';document.body.classList.toggle('pocket-mode',pocket);document.querySelectorAll('.product').forEach(b=>b.classList.toggle('active',b.dataset.product===product));
  document.querySelector('.plan-switch').hidden=pocket;document.querySelector('.mark').textContent=pocket?'CIP':'C60';document.querySelector('#productTitle').textContent=pocket?'Cocina Integral Pocket':'Casa 60';document.querySelector('#productSubtitle').textContent=pocket?'OBJ embalado · capas de producción':'Estudio de embalaje · modelo de producción';
  const labels=pocket?[['Embalada','Acomodado original'],['Capas','Separación vertical'],['Secuencia','Orden del OBJ'],['Inspección','Capas separadas']]:[['Armada','Producto terminado'],['Despiece','21 grupos reales'],['Bulto compacto','Propuesta apilada'],['Capas separadas','Contornos del DXF']];
  document.querySelectorAll('.mode').forEach((b,i)=>{b.querySelector('b').textContent=labels[i][0];b.querySelector('small').textContent=labels[i][1]});
  if(pocket){
    document.querySelector('.metric-grid').innerHTML='<article><span>Huella embalada</span><strong>88,4 × 42,7</strong><small>cm · envolvente exacta del OBJ</small></article><article><span>Altura apilada</span><strong>11,1 cm</strong><small>desde la primera hasta la última capa</small></article>';
    document.querySelector('.saving').innerHTML='<p>El archivo ya viene acomodado. El visor conserva las coordenadas de las 47 piezas y sólo agrega separación vertical cuando se inspeccionan las capas.</p>';
    document.querySelector('.callout').innerHTML='<b>Importación directa</b><p>No se reordenaron piezas. La clasificación por capas se toma del eje de espesor del OBJ embalado.</p>';renderPocketLayers();
  }else{
    document.querySelector('.metric-grid').innerHTML='<article><span>Producto armado</span><strong>70,4 × 24,4 × 94,4</strong><small>cm · envolvente del OBJ</small></article><article><span id="planMetricTitle">Según fotos · huella</span><strong id="planMetric">45,6 × 70 cm</strong><small id="planMetricNote">Base protectora: 40 × 70 × 0,3 cm</small></article>';setPlan(plan);
  }
  progress=1;document.querySelector('#progress').value=100;document.querySelector('#progressLabel').textContent='100%';document.querySelector('#loadStatus').textContent=pocket?(pocketPieces.length?`Cocina lista · ${pocketPieces.length} grupos · ${pocketLayerCount} capas`:'Cargando Cocina Pocket…'):(pieces.length?'Modelos listos · Casa 60 + Cocina Pocket':'Cargando Casa 60…');setMode('assembled',true);
}
document.querySelectorAll('.product').forEach(b=>b.addEventListener('click',()=>setProduct(b.dataset.product)));
if(new URLSearchParams(location.search).get('product')==='pocket')setProduct('pocket');
function resize(){const w=canvas.clientWidth,h=canvas.clientHeight;if(canvas.width!==w*renderer.getPixelRatio()||canvas.height!==h*renderer.getPixelRatio()){renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()}}
function loop(){resize();applyState();controls.update();renderer.render(scene,camera);requestAnimationFrame(loop)}loop();
