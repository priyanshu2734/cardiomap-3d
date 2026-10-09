import os
HERE=os.path.dirname(os.path.abspath(__file__))
import numpy as np,glb
from scipy import ndimage as ndi
H=0.001
LO=np.array([-0.056,0.418,-0.024]);HI=np.array([0.092,0.534,0.098])
SHAPE=tuple(np.ceil((HI-LO)/H).astype(int))
WALLS={'LV':'VH_M_heart_left_ventricle','RV':'VH_M_heart_right_ventricle','LA':'VH_M_left_cardiac_atrium','RA':'VH_M_right_cardiac_atrium','SEP':'VH_M_interventricular_septum'}
def shell(P,I):
    A,B,C=P[I[:,0]],P[I[:,1]],P[I[:,2]]
    e=np.maximum.reduce([np.linalg.norm(B-A,axis=1),np.linalg.norm(C-B,axis=1),np.linalg.norm(A-C,axis=1)])
    n=np.clip(np.ceil(e/0.0004).astype(int),1,60);occ=np.zeros(SHAPE,bool)
    for k in np.unique(n):
        sel=n==k;a,b,c=A[sel],B[sel],C[sel]
        u,v=np.meshgrid(np.arange(k+1)/k,np.arange(k+1)/k);m=(u+v)<=1+1e-9;u=u[m];v=v[m]
        pts=a[:,None,:]*(1-u-v)[None,:,None]+b[:,None,:]*u[None,:,None]+c[:,None,:]*v[None,:,None]
        ix=np.floor((pts.reshape(-1,3)-LO)/H).astype(int)
        ok=(ix>=0).all(1)&(ix<SHAPE).all(1);ix=ix[ok];occ[ix[:,0],ix[:,1],ix[:,2]]=True
    return occ
def solids(d):
    out={}
    for k,nm in WALLS.items():
        P,I,_=d[nm];sh=shell(P,I);out[k]=ndi.binary_fill_holes(sh)
    return out
if __name__=='__main__':
    d=glb.load(HERE+'/../../static/models/VH_M_Heart.glb');S=solids(d)
    for k,v in S.items(): print(k,'vol mL',v.sum()*H**3*1e6)
    np.savez_compressed(HERE+'/solids.npz',**S)
