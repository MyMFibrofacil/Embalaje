// Explicit production order. Names match the packed OBJ groups exactly.
export const pocketSequence = [
  {label:'Fondo alzada',pieces:['fondo alzada']},
  {label:'Fondo bajo',pieces:['fondo bajo']},
  {label:'Lateral derecho',pieces:['lateral der']},
  {label:'Frente perillas + dos suplementos',pieces:['Frente Perillas','Cuerpo120','Cuerpo121']},
  {label:'Lateral medio',pieces:['lateral med']},
  {label:'Canillas + perillas + tiradores',pieces:['Canilla','Canilla (1)','perillas','perillas 2','perillas 3','perillas (2)','perillas (2) (1)','tirador','tirador (1)']},
  {label:'Bacha',pieces:['bacha']},
  {label:'Lateral izquierdo + zócalo',pieces:['lateral izq','zocalo']},
  {label:'Tapa',pieces:['Tapa','parante bajo']},
  {label:'Grifo + manija inferior',pieces:['Grifo','manija 2 (1)']},
  {label:'Suplementos + manija superior',pieces:['Cuerpo122','Cuerpo123','Cuerpo124','Cuerpo125','manija 2']},
  {label:'Puerta horno + estante',pieces:['Pta Horno','estante heladera','estante heladera (1) (1)']},
  {label:'Rejilla horno + estante',pieces:['Cuerpo126','estante heladera (1)']},
  {label:'Puerta heladera superior + puerta lavarropas',pieces:['Pta Heladera Sup','Pta Lavarropas','Frente Lavarropas']},
  {label:'Puerta alzada + hornallas + frente alzada + manija + parante alzada',pieces:['Pta Alzada','hornalla','hornalla (1)','frente alzada','manija 1','Parante Alzada']},
  {label:'Puerta heladera inferior',pieces:['Pta Heladera Inf']},
  {label:'Techo y base alzada',pieces:['techo alzada','base alzada']},
  {label:'Piso',pieces:['piso']},
  {label:'Fondo heladera',pieces:['fondo heladera']}
];
export function assignPocketSequence(pieces){
  const lookup=new Map();pocketSequence.forEach((step,layer)=>step.pieces.forEach(name=>{if(lookup.has(name))throw new Error(`Pieza repetida: ${name}`);lookup.set(name,layer)}));
  for(const p of pieces){if(!lookup.has(p.name))throw new Error(`Pieza sin paso de embalaje: ${p.name}`);p.layer=lookup.get(p.name)}
  for(const name of lookup.keys())if(!pieces.some(p=>p.name===name))throw new Error(`Pieza faltante: ${name}`);
}

// Change packed coordinates as well as reveal order. Boxes stay in world space.
export function correctPocketStack(pieces){
  const find=name=>{const p=pieces.find(p=>p.name===name);if(!p)throw new Error(`Pieza faltante: ${name}`);return p};
  const move=(p,x,y,z)=>{p.packed.x+=x;p.packed.y+=y;p.packed.z+=z;for(const side of ['min','max']){p.box[side].x+=x;p.box[side].y+=y;p.box[side].z+=z}};
  const above=(p,top)=>move(p,0,top+.02-p.box.min.y,0);
  const fondoBajo=find('fondo bajo');
  for(const name of ['Cuerpo120','Cuerpo121']){
    const supplement=find(name),width=supplement.box.max.x-supplement.box.min.x,depth=supplement.box.max.z-supplement.box.min.z;
    const targetX=fondoBajo.box.max.x-width/2,targetZ=fondoBajo.box.min.z+depth/2;
    move(supplement,targetX-supplement.packed.x,fondoBajo.box.max.y+.02-supplement.box.min.y,targetZ-supplement.packed.z);
  }
  const supportTop=Math.max(...pocketSequence[10].pieces.filter(n=>n.startsWith('Cuerpo')).map(n=>find(n).box.max.y));
  const lowerHandle=find('manija 2 (1)'),upperHandle=find('manija 2');
  const supportBottom=Math.min(...pocketSequence[10].pieces.filter(n=>n.startsWith('Cuerpo')).map(n=>find(n).box.min.y));
  move(lowerHandle,0,supportBottom-.02-lowerHandle.box.max.y,0);
  above(upperHandle,supportTop);
  const rack=find('Cuerpo126'),door=find('Pta Heladera Sup');
  move(door,(rack.box.min.x+rack.box.max.x-door.box.min.x-door.box.max.x)/2,0,(rack.box.min.z+rack.box.max.z-door.box.min.z-door.box.max.z)/2);
  above(door,rack.box.max.y);
  // Keep the alzada handle inside its own layer instead of floating between layers:
  // same height as the alzada front, centered between the nearest burner and washer door.
  const alzadaHandle=find('manija 1'),alzadaFront=find('frente alzada'),nearBurner=find('hornalla'),washerDoor=find('Pta Lavarropas');
  const handleTargetX=(nearBurner.box.max.x+washerDoor.box.min.x)/2;
  const handleTargetZ=(nearBurner.packed.z+washerDoor.packed.z)/2;
  move(alzadaHandle,handleTargetX-alzadaHandle.packed.x,alzadaFront.box.min.y-alzadaHandle.box.min.y,handleTargetZ-alzadaHandle.packed.z);
  const lowerDoor=find('Pta Heladera Inf');
  const roof=[find('techo alzada'),find('base alzada')];
  roof.forEach(p=>above(p,lowerDoor.box.max.y));
  // The following closing panels must follow the newly raised roof/base pair.
  const floor=find('piso');above(floor,Math.max(...roof.map(p=>p.box.max.y)));
  above(find('fondo heladera'),floor.box.max.y);
}
