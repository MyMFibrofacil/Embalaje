import ezdxf,json,math
from ezdxf import path
es=list(ezdxf.readfile(r'G:\Mi unidad\Produccion\Maquinas\Diseños 3D Productos\Productos\Casa 60 Desarmada\Casa 60 desarmada.dxf').modelspace())
def pts(i): return [[p.x/10,p.y/10] for p in path.make_path(es[i]).flattening(.2)]
parts=[]
def add(name,i,layer,x,z,t,holes=[],lines=[],rotate=False):
 p=pts(i); a=0
 if rotate:
  a=min([j*math.pi/720 for j in range(720)],key=lambda a: (max(v[0]*math.cos(a)-v[1]*math.sin(a) for v in p)-min(v[0]*math.cos(a)-v[1]*math.sin(a) for v in p))*(max(v[0]*math.sin(a)+v[1]*math.cos(a) for v in p)-min(v[0]*math.sin(a)+v[1]*math.cos(a) for v in p)))
 def rot(q):return [[v[0]*math.cos(a)-v[1]*math.sin(a),v[0]*math.sin(a)+v[1]*math.cos(a)] for v in q]
 p=rot(p); mn=[min(v[k] for v in p) for k in [0,1]];mx=[max(v[k] for v in p) for k in [0,1]];c=[(mn[k]+mx[k])/2 for k in [0,1]]
 def norm(q):return [[round(v[0]-c[0],4),round(v[1]-c[1],4)] for v in q]
 parts.append(dict(name=name,layer=layer,x=x,z=z,t=t,outline=norm(p),holes=[norm(rot(pts(h))) for h in holes],lines=[norm(rot(pts(h))) for h in lines],size=[round(mx[k]-mn[k],3) for k in [0,1]]))
add('Fondo bajo',0,0,0,0,.3)
add('Fondo medio',252,1,0,0,.3)
add('Fondo superior',1,2,0,0,.3)
add('Piso base',401,3,0,-23,.9)
add('Piso con hueco',402,3,0,0,.9,[398])
add('Piso superior',403,3,0,21,.9)
add('Lateral izquierdo',385,4,-11.1,0,.9,list(range(375,383)))
add('Lateral derecho',396,4,11.1,0,.9,list(range(386,394)))
add('Techo izquierdo',404,5,-14.5,0,.9,rotate=True)
add('Techo derecho',397,5,14.5,0,.9,rotate=True)
add('Larguero escalera 1',308,6,-23,0,.3,[304,305,306])
add('Larguero escalera 2',308,6,23,0,.3,[304,305,306])
add('Troquel completo de escalones · 3 mm',373,6,0,0,.3,lines=list(range(328,373)))
for j,i in enumerate(range(291,295)):add('Traba '+str(j+1),i,6,-9+j*6,12,.3)
open('dist/assets/packing.json','w',encoding='utf8').write(json.dumps(parts,ensure_ascii=False))
for p in parts: print(p['name'],p['size'])
