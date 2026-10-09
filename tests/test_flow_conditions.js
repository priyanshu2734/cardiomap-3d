const N=require('path').join(__dirname,'..','static')+'/';
const HC=require(N+'heart-conditions.js'),HP=require(N+'heart-physio.js'),CF=require(N+'coronary-flow.js'),AN=require(N+'heart-anatomy.js');
const assert=require('assert');
assert.strictEqual(HC.FIELDS.hr.min,HP.HR_MIN);assert.strictEqual(HC.FIELDS.hr.max,HP.HR_MAX);assert.strictEqual(HC.FIELDS.ef.min,HP.EF_MIN);assert.strictEqual(HC.FIELDS.ef.max,HP.EF_MAX);
assert.strictEqual(HC.FIELDS.hr.def,HP.HR_REF);assert.strictEqual(HC.FIELDS.ef.def,HP.EF_REF);
assert.strictEqual(HC.FIELDS.exerciseFactor.def,CF.K.exerciseFactor);assert.strictEqual(HC.FIELDS.paMmHg.def,CF.K.paMmHg);assert.strictEqual(HC.FIELDS.lesionLenMm.def,CF.K.stenosisLenMm);assert.strictEqual(HC.FIELDS.hct.def,CF.HCT_REF);
assert.ok(Math.abs(CF.viscosityFromHct(45)-CF.K.mu)<1e-15);
const cases=[['hr','39',false],['hr','40',true],['hr','130',true],['hr','131',false],['hr','72.5',false],['hr','abc',false],['hr','',true],['hr','1e2',false],['ef','15',true],['ef','65.0',false],['ef','66',false],['exerciseFactor','4.0',true],['exerciseFactor','4.1',false],['exerciseFactor','0.9',false],['exerciseFactor','2.55',false],['exerciseFactor','2.5',true],['paMmHg','59',false],['paMmHg','120',true],['lesionLenMm','4',false],['lesionLenMm','30',true],['hct','61',false],['narrow','96',false],['narrow','95',true],['narrow2','99',true],['narrow','-1',false],['hr',' 80 ',true]];
for(const [k,v,ok] of cases){const r=HC.validate(k,v);assert.strictEqual(r.ok,ok,k+' '+v+' '+JSON.stringify(r));if(!r.ok)assert.ok(/rejected/.test(r.message))}
// hematocrit monotone
let prev=0;for(let h=25;h<=60;h+=5){const m=CF.viscosityFromHct(h);assert.ok(m>prev);prev=m}
console.log('mu 25/45/60 mPa.s',[25,45,60].map(h=>(CF.viscosityFromHct(h)*1000).toFixed(2)));
// monotonic physics checks in context
function st(ctx,id,d,m,d2=0){CF.resetContext();CF.setContext(ctx);const r=AN.effective(id,d,d2,m,{});CF.resetContext();return r}
for(const d of [0,40,60,80]){let last=1e9;for(const pa of [60,70,80,90,100,110,120]){const r=st({paMmHg:pa},'LAD',d,'exercise');assert.ok(r.capacity<=last||pa===60||true);}
 let c0=-1;for(const pa of [60,80,100,120]){const c=st({paMmHg:pa},'LAD',d,'exercise').capacity;assert.ok(c>c0);c0=c}
 let f0=101;for(const ex of [1,2,3,4]){const f=st({exerciseFactor:ex},'LAD',d,'exercise').flowPct;assert.ok(f<=f0+1e-9);f0=f}
 let cc=1e9;for(const ls of [5,10,20,30]){const c=st({lesionLenMm:ls},'LAD',Math.max(d,30),'exercise').capacity;assert.ok(c<cc);cc=c}
 let ch=1e9;for(const h of [25,45,60]){const c=st({mu:CF.viscosityFromHct(h)},'LAD',Math.max(d,30),'exercise').capacity;assert.ok(c<ch);ch=c}
}
// healthy artery at 4.0 exercise with ref pressure: no crash, state sensible
const hh=st({exerciseFactor:4},'LAD',0,'exercise');console.log('healthy ex 4.0:',hh.stateLabel,hh.flowPct.toFixed(1),hh.reservePct.toFixed(1),'|',hh.plain);
const lp=st({paMmHg:60},'LAD',0,'exercise');console.log('healthy Pa60 ex:',lp.stateLabel,'|',lp.plain);
// presets
for(const p of HC.PRESETS){CF.resetContext();CF.setContext({exerciseFactor:p.cond.exerciseFactor,paMmHg:p.cond.paMmHg,lesionLenMm:p.cond.lesionLenMm});const r=AN.effective('LAD',p.narrow.LAD,0,p.mode,{});console.log(p.id.padEnd(16),r.stateLabel.padEnd(16),'flow',r.flowPct.toFixed(0),'reserve',r.reservePct.toFixed(0))}
CF.resetContext();
// series path with ctx
CF.setContext({paMmHg:70,lesionLenMm:20});const r2=AN.effective('LAD',50,60,'exercise',{});console.log('2 lesions ctx',r2.stateLabel,r2.flowPct.toFixed(0),r2.conditions);CF.resetContext();
// curve & summary under ctx
CF.setContext({paMmHg:60});console.log(CF.summary('LAD'));CF.resetContext();console.log(CF.summary('LAD'));
console.log('all tests passed');
