/* HeartAnatomy: teaching controls for dominance, named side branches and collateral flow.
   Pure browser + Node module. Nothing here is read from the dashboard snapshot.
   Dominance shares are a typical textbook teaching pattern, not population percentages. */
(function(root,factory){
  if(typeof module==='object'&&module.exports) module.exports=factory(require('./coronary-flow.js'),require('./coronary-flow2.js'));
  else root.HeartAnatomy=factory(root.CoronaryFlow,root.CoronaryFlow2);
})(typeof self!=='undefined'?self:this,function(CF,CF2){
  'use strict';
  if(!CF||!CF2)throw new Error('HeartAnatomy requires CoronaryFlow and CoronaryFlow2');
  const FIDS=['LAD','LCX','RCA'];
  const SHARES=Object.freeze({
    right:Object.freeze({LAD:.45,LCX:.29,RCA:.26}),
    left:Object.freeze({LAD:.45,LCX:.35,RCA:.20})
  });
  const DEFAULT_DOMINANCE='right',COLLATERAL_MAX=.35;
  const BRANCHES=Object.freeze({
    diagonal:Object.freeze({id:'diagonal',label:'Diagonal',short:'D1',parent:'LAD',origin:.48,share:.20,description:'Schematic LAD side branch; origin and territory share are teaching values.'}),
    obtuseMarginal:Object.freeze({id:'obtuseMarginal',label:'Obtuse marginal',short:'OM',parent:'LCX',origin:.55,share:.25,description:'Schematic LCX side branch; origin and territory share are teaching values.'}),
    pda:Object.freeze({id:'pda',label:'Posterior descending artery (PDA)',short:'PDA',origin:.78,share:.35,description:'Schematic inferior branch; its parent switches with the teaching dominance setting.'})
  });
  const LEFT_SEGMENT_OVERRIDES=Object.freeze({4:'LCX',10:'LCX',15:'LCX'});
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const finite=x=>typeof x==='number'&&isFinite(x);
  function dominanceKey(x){return x==='left'?'left':'right'}
  function shares(dominance){return SHARES[dominanceKey(dominance)]}
  function sharesSum(dominance){const s=shares(dominance);return s.LAD+s.LCX+s.RCA}
  function restDemand(id,dominance){
    const d=dominanceKey(dominance);const base=CF.VESSELS[id].qRest;if(d==='right')return base;
    if(id==='LAD')return base;
    const total=CF.VESSELS.LCX.qRest+CF.VESSELS.RCA.qRest,s=SHARES.left[id];return total*s/(SHARES.left.LCX+SHARES.left.RCA);
  }
  function pdaParent(dominance){return dominanceKey(dominance)==='left'?'LCX':'RCA'}
  function territoryScale(base,dominance){
    const dom=dominanceKey(dominance);if(dom==='right')return base.slice();
    const ref=SHARES.right,tar=SHARES.left,out=[base[0]*tar.LAD/ref.LAD,base[1]*tar.LCX/ref.LCX,base[2]*tar.RCA/ref.RCA],sum=out[0]+out[1]+out[2];return sum>0?out.map(x=>x/sum):base.slice();
  }
  function segmentInfo(segment,dominance){
    if(!segment)return null;const dom=dominanceKey(dominance),v=dom==='left'&&LEFT_SEGMENT_OVERRIDES[segment.n]?LEFT_SEGMENT_OVERRIDES[segment.n]:segment.vessel;
    let alt=Array.isArray(segment.alt)?segment.alt.slice():(segment.alt?[segment.alt]:[]);
    if(v!==segment.vessel&&!alt.includes(segment.vessel))alt.push(segment.vessel);
    return Object.assign({},segment,{vessel:v,alt});
  }
  function segmentVessel(segment,dominance){const x=segmentInfo(segment,dominance);return x&&x.vessel}
  function branchList(dominance){
    const pdaParentId=pdaParent(dominance);
    return ['diagonal','obtuseMarginal','pda'].map(id=>{
      const b=BRANCHES[id];return Object.assign({},b,{parent:b.parent||pdaParentId,share:b.share,origin:b.origin});
    });
  }
  function branchDemand(parentDemand,branchId,dominance){
    const b=branchList(dominance).find(x=>x.id===branchId);return b?parentDemand*b.share:0;
  }
  function collateralResult(r,c){
    const coll=clamp(Number(c)||0,0,COLLATERAL_MAX);if(coll<=0)return Object.assign({},r,{antegradeFlow:r.flow,collateral:0,collateralAdded:0});
    const shortfall=Math.max(0,r.demand-r.flow),added=Math.min(coll*r.demand,shortfall),flow=r.flow+added,flowPct=100*flow/r.demand,fillFrac=shortfall>1e-12?added/shortfall:0;
    const reserve=shortfall>1e-12?Math.max(r.reservePct,r.reservePct+(100-r.reservePct)*fillFrac):r.reservePct;
    const state=flow<r.demand*(1-CF.K.flowTol)?2:(reserve<100*CF.K.reserveOkFrac?1:0);
    return Object.assign({},r,{antegradeFlow:r.flow,flow,flowPct,reservePct:reserve,state,stateLabel:CF.STATES[state],collateral:coll,collateralAdded:added,
      plain:added>0?r.plain+' A teaching collateral share adds about '+added.toFixed(1)+' mL/min from neighbouring arteries, capped at the remaining demand.':r.plain});
  }
  function effective(id,d1,d2,mode,opts){
    const o=opts&&typeof opts==='object'?opts:{},dom=dominanceKey(o.dominance),coll=clamp(Number(o.collateral)||0,0,COLLATERAL_MAX),d2n=Number(d2)||0;
    /* Preserve today's exact solver object when all new teaching options are at defaults. */
    if(dom==='right'&&coll===0&&d2n===0&&!o.qRest)return CF.solve(id,d1,mode,o);
    const qRest=restDemand(id,dom),r=CF2.solveSeries(id,d1,d2n,mode,Object.assign({},o,{qRest}));
    return collateralResult(r,coll);
  }
  function normalise(opts){
    const o=opts&&typeof opts==='object'?opts:{};return {dominance:dominanceKey(o.dominance),collateral:clamp(Number(o.collateral)||0,0,COLLATERAL_MAX),branches:Object.assign({diagonal:false,obtuseMarginal:false,pda:false},o.branches||{})};
  }
  function isDefault(o){const x=normalise(o);return x.dominance==='right'&&x.collateral===0&&!x.branches.diagonal&&!x.branches.obtuseMarginal&&!x.branches.pda}
  return {FIDS,SHARES,DEFAULT_DOMINANCE,COLLATERAL_MAX,BRANCHES,LEFT_SEGMENT_OVERRIDES,shares,sharesSum,restDemand,pdaParent,territoryScale,segmentInfo,segmentVessel,branchList,branchDemand,collateralResult,effective,normalise,isDefault};
});
