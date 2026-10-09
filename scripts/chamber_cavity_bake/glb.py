import os
HERE=os.path.dirname(os.path.abspath(__file__))
import json,struct,numpy as np
def load(path):
    b=open(path,'rb').read();jl=struct.unpack('<I',b[12:16])[0];j=json.loads(b[20:20+jl]);bin=b[20+jl+8:]
    out={}
    for n in j['nodes']:
        if 'mesh' not in n: continue
        prim=j['meshes'][n['mesh']]['primitives'][0];acc=j['accessors'][prim['attributes']['POSITION']];bv=j['bufferViews'][acc['bufferView']]
        off=bv.get('byteOffset',0)+acc.get('byteOffset',0);P=np.frombuffer(bin,np.float32,acc['count']*3,off).reshape(-1,3).astype(np.float64)
        ia=j['accessors'][prim['indices']];ib=j['bufferViews'][ia['bufferView']];io=ib.get('byteOffset',0)+ia.get('byteOffset',0)
        dt={5121:np.uint8,5123:np.uint16,5125:np.uint32}[ia['componentType']];I=np.frombuffer(bin,dt,ia['count'],io).reshape(-1,3).astype(np.int64)
        out[n['name']]=(P,I,n)
    return out
