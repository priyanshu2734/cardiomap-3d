import os
HERE=os.path.dirname(os.path.abspath(__file__))
import numpy as np
from scipy import ndimage as ndi
from vox import H,LO,SHAPE
S=dict(np.load(HERE+'/solids.npz'))
solid=np.zeros(SHAPE,bool)
for v in S.values(): solid|=v
dist=ndi.distance_transform_edt(~solid,sampling=H)   # metres to nearest solid voxel
dirs=[(1,0,0),(-1,0,0),(0,1,0),(0,-1,0),(0,0,1),(0,0,-1)]+[(sx,sy,sz) for sx in(-1,1) for sy in(-1,1) for sz in(-1,1)]
dirs=[np.array(d,float)/np.linalg.norm(d) for d in dirs]
def enclosed(idx,maxd=0.08):
    """fraction of 14 rays from voxel indices idx (N,3) that hit solid within maxd"""
    pos=LO+(idx+0.5)*H;hit=np.zeros(len(idx),int)
    for d in dirs:
        alive=np.ones(len(idx),bool);found=np.zeros(len(idx),bool)
        for s in np.arange(1,int(maxd/H)+1)*H*0.9:
            q=np.floor((pos+d*s-LO)/H).astype(int);inb=(q>=0).all(1)&(q<SHAPE).all(1)
            hitv=np.zeros(len(idx),bool);hitv[inb]=solid[q[inb,0],q[inb,1],q[inb,2]]
            found|=hitv&alive;alive&=~hitv&inb
            if not alive.any():break
        hit+=found
    return hit/len(dirs)
def cavity(step=4,thr=0.85,clr=0.004):
    g=np.arange(0,SHAPE[0],step),np.arange(0,SHAPE[1],step),np.arange(0,SHAPE[2],step)
    ix=np.stack(np.meshgrid(*g,indexing='ij'),-1).reshape(-1,3)
    ok=~solid[ix[:,0],ix[:,1],ix[:,2]]&(dist[ix[:,0],ix[:,1],ix[:,2]]>=clr)
    ix=ix[ok];fr=enclosed(ix);ix=ix[fr>=thr];return ix
if __name__=='__main__':
    # try several lattice offsets to see sensitivity
    ix=cavity(4)
    pos=LO+(ix+0.5)*H
    # label by nearest chamber wall
    names=['LV','RV','LA','RA'];D=np.stack([ndi.distance_transform_edt(~S[n],sampling=H)[tuple(ix.T)] for n in names],1)
    lab=D.argmin(1)
    for i,n in enumerate(names):
        m=lab==i;print(n,m.sum(),'max clearance mm',(dist[tuple(ix[m].T)].max()*1000).round(1) if m.any() else 0,'centroid',pos[m].mean(0).round(4))
    np.savez(HERE+'/cav.npz',pos=pos,lab=lab,clr=dist[tuple(ix.T)])
