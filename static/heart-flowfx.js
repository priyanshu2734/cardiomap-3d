/* HeartFlowFx: display-only helpers for the Heart Function Lab 3D stage (plaque sleeve, clot plug, red-cell colours, speed map,
   cross-section flow profile, post-narrowing turbulence, HUD sentence). Pure browser + Node module: no THREE, no DOM, no physics.
   It never changes a flow number: every input comes from CoronaryFlow / CoronaryFlow2 results. Schematic teaching visuals only. */
(function(root,factory){
  if(typeof module==='object'&&module.exports) module.exports=factory();
  else root.HeartFlowFx=factory();
})(typeof self!=='undefined'?self:this,function(){
  'use strict';
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const BLOCK_AT=97;                       /* second-narrowing percent from which the clot plug is drawn (flow is ~0 there) */
  const LOOKS=Object.freeze(['blood','speed']);
  const lerp=(a,b,t)=>a+(b-a)*t;
  function mix(c0,c1,t,o){o[0]=lerp(c0[0],c1[0],t);o[1]=lerp(c0[1],c1[1],t);o[2]=lerp(c0[2],c1[2],t);return o}

  /* local speed relative to a healthy artery at resting flow: continuity v = Q / (pi r^2); r0 = healthy radius, r = local lumen radius */
  function relSpeed(flowMlMin,qRestMlMin,r0,r,profile){
    const q=qRestMlMin>0?Math.max(0,flowMlMin)/qRestMlMin:0,k=Math.max(1e-3,r)/Math.max(1e-9,r0);
    return q/(k*k)*(profile==null?1:profile);
  }
  /* 0..1 colour position from relative speed: log-ish so a 10x jet does not wash out ordinary flow */
  function speedT(v){return clamp(Math.log(1+Math.max(0,v))/Math.log(13),0,1)}
  const BLOOD=[[0.36,0.02,0.05],[0.78,0.07,0.09],[1.0,0.30,0.18]];                       /* slow dark red, normal red, fast bright orange-red */
  const SPEED=[[0.18,0.42,1.0],[0.10,0.85,0.80],[0.98,0.88,0.20],[1.0,0.22,0.16]];       /* blue, teal, yellow, red */
  function ramp(stops,t,o){const n=stops.length-1,x=clamp(t,0,1)*n,i=Math.min(n-1,Math.floor(x));return mix(stops[i],stops[i+1],x-i,o)}
  function color(look,t,o){o=o||[0,0,0];return ramp(look==='speed'?SPEED:BLOOD,t,o)}

  /* position across the lumen: rho2 is uniform in [0,1) so cells fill the cross-section evenly; centre cells move faster (parabolic profile, mean 1) */
  function profile(rho2){return 0.2+1.6*(1-clamp(rho2,0,1))}
  /* post-narrowing turbulence amplitude (fraction of the lumen radius). 0 below 50%, strongest just beyond the throat, fades with distance */
  function turbulence(dPct,uBeyond){
    if(!(dPct>=50)||!(uBeyond>=0)) return 0;
    return 0.30*clamp((dPct-50)/45,0,1)*Math.exp(-uBeyond/0.12);
  }
  /* radial position (0..~0.9 of the local radius) and angle of one red cell; tm = seconds; i = particle index */
  function cellPlace(rho2,th,amp,tm,i){
    const sw=amp>0?amp:0;
    return {rad:clamp(Math.sqrt(clamp(rho2,0,1))*0.82+sw*Math.sin(tm*11+i*5.3),0,0.9),ang:th+sw*4*Math.sin(tm*7+i*3.1)};
  }

  /* plaque sleeve: outer wall stays at the healthy radius where the lumen is narrowed; collapsed (nearly zero) elsewhere */
  const PLAQUE_OUT=1.04,PLAQUE_OFF=0.02;
  function plaqueScale(r0,r){return r<r0*0.999?1:PLAQUE_OFF}
  /* where (0..1 along the path) a clot plug sits, or null. d2 is drawn at lesion2, d1 at lesion1 */
  function clotAt(d1,d2,pos){
    if(Number(d2)>=BLOCK_AT) return pos.lesion2;
    if(Number(d1)>=BLOCK_AT) return pos.lesion1;
    return null;
  }

  /* one plain sentence under the stage. res = effective() result, ve = {r0,qRest}. Numbers are the solver's own. */
  function hudText(id,res,ve,blocked){
    if(!res) return '';
    const area=res.areaPct>0?res.areaPct:0,flow=Math.round(res.flowPct);
    if(blocked&&(res.antegradeFlow!=null?res.antegradeFlow:res.flow)<0.5)
      return id+' is completely blocked in this what-if: blood backs up behind the clot and the heart wall downstream gets '+flow+'% of its demand'+(res.collateral>0?' (from collateral vessels only).':'.');
    if(!(res.d>0)) return id+': open artery. Blood moves at an even speed and the heart wall gets all it asks for.';
    const jet=area>0?relSpeed(res.flow,ve.qRest,1,Math.sqrt(area/100),1):0;
    return id+': narrowed by '+Math.round(res.d)+'% (diameter). Blood speeds up to about '+jet.toFixed(1)+'× normal resting speed at the narrowest point, the pressure falls by about '+Math.round(res.dropMmHg)+' mmHg across it, and the heart wall downstream gets '+flow+'% of its demand.';
  }
  return {BLOCK_AT,LOOKS,relSpeed,speedT,color,profile,turbulence,cellPlace,plaqueScale,PLAQUE_OUT,PLAQUE_OFF,clotAt,hudText};
});
