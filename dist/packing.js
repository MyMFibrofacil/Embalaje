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
 return {update(show,progress,spread){root.visible=show;for(const {g,p} of groups){g.visible=progress>=((p.layer+1)/7)-.01;g.position.y=-20+heights.slice(0,p.layer).reduce((a,b)=>a+b+.1,0)+p.layer*spread;}}};
}
