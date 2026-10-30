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
  {label:'Grifo + manija',pieces:['Grifo','manija 1']},
  {label:'Suplementos + manija arriba',pieces:['Cuerpo122','Cuerpo123','Cuerpo124','Cuerpo125','manija 2 (1)']},
  {label:'Puerta horno + estante',pieces:['Pta Horno','estante heladera','estante heladera (1) (1)']},
  {label:'Rejilla horno + estante',pieces:['Cuerpo126','estante heladera (1)']},
  {label:'Puerta heladera superior + puerta lavarropas',pieces:['Pta Heladera Sup','Pta Lavarropas','Frente Lavarropas']},
  {label:'Puerta alzada + hornallas + frente alzada + manija + parante alzada',pieces:['Pta Alzada','hornalla','hornalla (1)','frente alzada','manija 2','Parante Alzada']},
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
