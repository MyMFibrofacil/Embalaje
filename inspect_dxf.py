import ezdxf
import matplotlib.pyplot as plt
from ezdxf import path
doc=ezdxf.readfile(r'G:\Mi unidad\Produccion\Maquinas\Diseños 3D Productos\Productos\Casa 60 Desarmada\Casa 60 desarmada.dxf')
fig,ax=plt.subplots(figsize=(16,12))
for i,e in enumerate(doc.modelspace()):
 try:
  pts=list(path.make_path(e).flattening(.3)); x=[p.x for p in pts]; y=[p.y for p in pts]
  ax.plot(x,y,linewidth=.5)
  if max(x)-min(x)>50 or max(y)-min(y)>50:
   ax.text(min(x),min(y),str(i),fontsize=6)
   print(i,e.dxftype(),round(min(x),2),round(min(y),2),round(max(x)-min(x),2),round(max(y)-min(y),2))
 except Exception: pass
ax.set_aspect('equal');fig.savefig('dxf-review.png',dpi=160)
