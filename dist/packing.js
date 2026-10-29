import * as THREE from 'three';
export async function packing(scene){
 const root=new THREE.Group();scene.add(root);const data=await (await fetch('./assets/packing.json')).json();
 const heights=[.3,.3,.3,.9,.9,.9,.3], groups=[];
 for(const p of data){
  const shape=new THREE.Shape(p.outline.map(v=>new THREE.Vector2(...v)));
  for(const h of p.holes)shape.holes.push(new THREE.Path(h.map(v=>new THREE.Vector2(...v))));
  const geo=new THREE.ExtrudeGeometry(shape,{depth:p.t,bevelEnabled:false});geo.rotateX(-Math.PI/2);
  const mesh=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:p.layer<3?0xeee6d6:0xb98d62,roughness:.8}));
  const g=new THREE.Group();g.add(mesh);g.position.set(p.x,0,p.z);root.add(g);
  const edges=new THREE.LineSegments(new THREE.EdgesGeometry(geo),new THREE.LineBasicMaterial({color:0x60462f}));g.add(edges);
  for(const ln of p.lines){const gg=new THREE.BufferGeometry().setFromPoints(ln.map(v=>new THREE.Vector3(v[0],p.t+.01,-v[1])));g.add(new THREE.Line(gg,new THREE.LineBasicMaterial({color:0x60462f})));}
  groups.push({g,p});
 }
 const planB={
  'Piso base':{layer:3,x:0,z:-10.5},'Piso con hueco':{layer:3,x:0,z:11},
  'Piso superior':{layer:4,x:12,z:0,rot:Math.PI/2},
  'Lateral izquierdo':{layer:4,x:-10,z:0},'Lateral derecho':{layer:4,x:-10,z:0,lift:.9}
 };
 function layout(p,plan){return plan==='b'&&planB[p.name]?{layer:p.layer,...planB[p.name]}:{layer:p.layer,x:p.x,z:p.z};}
 function layerHeights(plan){return plan==='b'?[.3,.3,.3,.9,1.8,.9,.3]:heights;}
 return {update(show,progress,spread,plan='a'){
  root.visible=show;const h=layerHeights(plan);
  for(const {g,p} of groups){const q=layout(p,plan);g.visible=progress>=((q.layer+1)/7)-.01;g.position.x=q.x;g.position.z=q.z;g.position.y=-20+h.slice(0,q.layer).reduce((a,b)=>a+b+.1,0)+q.layer*spread+(q.lift||0);g.rotation.y=q.rot||0;}
 }};
}
