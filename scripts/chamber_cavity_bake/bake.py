import os
HERE=os.path.dirname(os.path.abspath(__file__))
import numpy as np,json,glb
from scipy import ndimage as ndi
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import dijkstra
from vox import H,LO,SHAPE,WALLS
import cav
M=json.load(open(HERE+'/../../static/models/heart_function_mesh.json'));GV=M['great_vessels']
S=cav.S;dist=cav.dist;solid=cav.solid
VAL={'mitral':[0.0261,0.4746,0.0145],'tricuspid':[-0.0024,0.4589,0.0466],'aortic':[0.0089,0.4971,0.0279],'pulmonary':[0.0179,0.5086,0.0432]}
def vidx(p): return np.floor((np.array(p)-LO)/H).astype(int)
def clr_at(p):
    # trilinear-free: nearest voxel distance to solid (m)
    i=vidx(p);i=np.clip(i,0,np.array(SHAPE)-1);return float(dist[tuple(i)])
def insolid(p):
    i=vidx(p);return bool(solid[tuple(np.clip(i,0,np.array(SHAPE)-1))])
# --- cavity lattice at 2 mm, labelled by which chamber wall most of the 14 rays hit
names=['LV','RV','LA','RA']
def lattice(step=2):
    g=[np.arange(0,SHAPE[a],step) for a in range(3)]
    ix=np.stack(np.meshgrid(*g,indexing='ij'),-1).reshape(-1,3)
    ok=~solid[tuple(ix.T)]&(dist[tuple(ix.T)]>=0.004);ix=ix[ok];fr=cav.enclosed(ix);ix=ix[fr>=0.85];return ix
IX=lattice(2);POS=LO+(IX+0.5)*H
lab=np.zeros(SHAPE,np.int8)-1
for k,n in enumerate(['LV','RV','LA','RA','SEP']): lab[S[n]]=k
def raylabel(ix):
    pos=LO+(ix+0.5)*H;cnt=np.zeros((len(ix),5),int)
    for d in cav.dirs:
        alive=np.ones(len(ix),bool)
        for s in np.arange(1,int(0.08/H)+1)*H*0.9:
            q=np.floor((pos+d*s-LO)/H).astype(int);inb=(q>=0).all(1)&(q<SHAPE).all(1)
            l=np.full(len(ix),-1);l[inb]=lab[q[inb,0],q[inb,1],q[inb,2]]
            h=alive&(l>=0)
            for k in range(5): cnt[h&(l==k),k]+=1
            alive&=~h&inb
            if not alive.any():break
    return cnt[:,:4].argmax(1)
CL=raylabel(IX)
print({n:int((CL==i).sum()) for i,n in enumerate(names)},'points at 2 mm')
def chamber_nodes(c): return np.where(CL==names.index(c))[0]
def route(c,a,b):
    """min-cost path (high clearance) in chamber c's 2 mm cavity lattice from the node nearest a to the node nearest b"""
    nodes=chamber_nodes(c);P=POS[nodes];I=IX[nodes];key={tuple(i):k for k,i in enumerate(I)}
    rows=[];cols=[];w=[]
    for k,i in enumerate(I):
        for dx in(-2,0,2):
            for dy in(-2,0,2):
                for dz in(-2,0,2):
                    if dx==dy==dz==0:continue
                    j=key.get((i[0]+dx,i[1]+dy,i[2]+dz))
                    if j is None or j<k:continue
                    d=np.linalg.norm(P[k]-P[j]);cc=0.5*(dist[tuple(i)]+dist[tuple(I[j])])
                    rows+= [k,j];cols+=[j,k];w+=[d/(cc+0.003)]*2
    g=coo_matrix((w,(rows,cols)),shape=(len(nodes),)*2).tocsr()
    sa=int(np.argmin(np.linalg.norm(P-np.array(a),axis=1)));sb=int(np.argmin(np.linalg.norm(P-np.array(b),axis=1)))
    dd,pr=dijkstra(g,indices=sa,return_predecessors=True);path=[sb]
    assert np.isfinite(dd[sb]),'no route in '+c
    while path[-1]!=sa:path.append(pr[path[-1]])
    return P[path[::-1]]
def smooth_pts(P,win=5):
    if len(P)<=win:return P
    out=P.copy();h=win//2
    for i in range(1,len(P)-1):
        lo=max(0,i-h);hi=min(len(P),i+h+1);out[i]=P[lo:hi].mean(0)
    return out
def pick(P,n):
    """n points evenly spaced by arc length, always including both ends"""
    L=np.r_[0,np.cumsum(np.linalg.norm(np.diff(P,axis=0),axis=1))];t=np.linspace(0,L[-1],n)
    return np.stack([np.interp(t,L,P[:,a]) for a in range(3)],1)
RING={'mitral':0.0140,'tricuspid':0.0150,'aortic':0.0106,'pulmonary':0.0106}
def vr(name):
    v=VAL[name];return max(0.0,min(0.5*RING[name],0.7*clr_at(v)))
def trim(mid,near_start=None,near_end=None,tol=0.0025):
    mid=[p for p in mid]
    if near_start is not None and len(mid)>2 and np.linalg.norm(np.array(mid[0])-np.array(near_start))<tol: mid=mid[1:]
    if near_end is not None and len(mid)>2 and np.linalg.norm(np.array(mid[-1])-np.array(near_end))<tol: mid=mid[:-1]
    return mid
SAFE=0.7  # lateral radius = 70 % of clearance
def cavwp(c,a,b,n):
    P=smooth_pts(route(c,a,b),7);return pick(P,n)
def wpr(p): return max(0.0,SAFE*clr_at(p))
in_valve_name=['']
def build_atrium_chain(entry,valve,chamber,n):
    """entry: vessel near end (outside or inside wall), valve: valve centre. returns list of [x,y,z,r]: cavity waypoints, ending at the valve centre"""
    e=np.array(entry);v=np.array(valve)
    nodes=chamber_nodes(chamber);P=POS[nodes]
    a=P[np.argmin(np.linalg.norm(P-e,axis=1))];b=P[np.argmin(np.linalg.norm(P-v,axis=1))]
    mid=trim(list(cavwp(chamber,a,b,n)),None,v)
    out=[]
    # wall crossing: point on the line entry->a just before the cavity, tiny radius
    d=a-e;L=np.linalg.norm(d);u=d/L;last_in=None
    for s in np.linspace(0,L,60):
        if insolid(e+u*s): last_in=s
    if last_in is not None and last_in<L:
        x=e+u*min(L,last_in+0.0012);out.append([*x,min(0.0012,wpr(x)) if not insolid(x) else 0.0])
    for p in mid: out.append([*p,wpr(p)])
    out.append([*v,vr(in_valve_name[0])])
    return out
def vessel(k,reverse):
    g=GV[k];pts=[list(p)+[g['radius']*0.6] for p in g['points']]
    return pts[::-1] if reverse else pts
def build(entry_vessel,atrium,in_valve,ventricle,out_valve,outlet,ns=(4,4)):
    v=vessel(entry_vessel,True);wp=[list(x) for x in v];s0=len(wp)-1   # seg0 ends at the vessel's near end
    in_valve_name[0]=in_valve;wp+=build_atrium_chain(v[-1][:3],VAL[in_valve],atrium,ns[0]);s1=len(wp)-1  # seg1 ends at the AV valve centre
    # ventricle: from AV valve centre to semilunar valve centre
    nodes=chamber_nodes(ventricle);P=POS[nodes];a=P[np.argmin(np.linalg.norm(P-np.array(VAL[in_valve]),axis=1))];b=P[np.argmin(np.linalg.norm(P-np.array(VAL[out_valve]),axis=1))]
    mid=trim(list(cavwp(ventricle,a,b,ns[1])),VAL[in_valve],VAL[out_valve]);wp+=[[*p,wpr(p)] for p in mid]
    wp.append([*VAL[out_valve],vr(out_valve)]);s2=len(wp)-1
    out=vessel(outlet,False)
    # drop the vessel's first point when it sits within 4 mm of the valve centre
    if np.linalg.norm(np.array(out[0][:3])-np.array(VAL[out_valve]))<0.004: out=out[1:]
    wp+=out
    return {'wp':wp,'segEnd':[s0,s1,s2]}
if __name__=='__main__':
    right=[build('svc','RA','tricuspid','RV','pulmonary','pulm_trunk')]
    left=[build(v,'LA','mitral','LV','aortic','aorta') for v in('lpv_up','lpv_low','rpv_up','rpv_low')]
    json.dump({'right':right,'left':left},open(HERE+'/defs.json','w'))
    for nm,ps in(('right',right),('left',left)):
        for p in ps:
            print(nm,len(p['wp']),'waypoints segEnd',p['segEnd'])
            for i,w in enumerate(p['wp']): print('  ',i,[round(x,4) for x in w[:3]],'r=%.1f mm'%(w[3]*1000),'clr=%.1f mm'%(clr_at(w[:3])*1000),'solid' if insolid(w[:3]) else '')
