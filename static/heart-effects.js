/* HeartEffects: wall-effect, illustrative-ECG and model-estimate helpers for the Heart Function Lab. Pure functions, no DOM, no THREE.
   Loaded by heart_function.html in the browser and by tests/test_heart_effects.js in node.
   SIMPLIFIED TEACHING MODEL, NOT PATIENT-SPECIFIC OR CLINICAL. Territories are the typical textbook pattern (AHA 17-segment style), not exact.
   Nothing here detects or locates a lesion: the estimate only preselects a vessel and suggests a starting narrowing.            */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.HeartEffects = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const VIDS = ['LAD', 'LCX', 'RCA'];
  const K = {
    gateDiameterPct: 50,   /* no wall effect below 50% narrowing (not counted as a stenosis in this dataset) */
    wReserve: 0.35,        /* weight of reserve lost in the severity index */
    wDeficit: 0.65,        /* weight of the flow shortfall (1 - flow / demand) */
    maxDarken: 0.55,       /* darkening mixes this share of a dark colour into the wall at severity 1 */
    maxWeaken: 0.30,       /* local squeeze is reduced by at most 30% at severity 1 ("slightly") */
    stMaxMv: 0.30,         /* ST depression at severity 1, mV (illustrative) */
    sugHigh: 0.65, sugMid: 0.40, sugHighPct: 70, sugMidPct: 50,   /* estimate p -> suggested starting narrowing */
    segMidStart: 0.32, segApicalStart: 0.62, segApexStart: 0.86, markedMaxReduction: 0.50,
  };
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

  /* ---------- severity index (0..1) for one artery, from the flow model's result ----------
     s = 0 below 50% narrowing, else  wReserve (1 - reserve left) + wDeficit (1 - flow/demand).
     Reserve runs out at a smaller narrowing in exercise, so exercise shows an effect first.                               */
  function severity(res) {
    if (!res || !(res.d >= K.gateDiameterPct)) return 0;
    const lostR = 1 - clamp(res.reservePct / 100, 0, 1), def = 1 - clamp(res.flowPct / 100, 0, 1);
    return clamp(K.wReserve * lostR + K.wDeficit * def, 0, 1);
  }
  function wallEffect(resById, options) {
    const s = {}, dark = [], weak = [], baseShares=[0.45,0.29,0.26], shares=options&&Array.isArray(options.shares)&&options.shares.length===3?options.shares:baseShares;
    VIDS.forEach((id,i) => { const v = severity(resById && resById[id]), scale=clamp((Number(shares[i])||0)/baseShares[i],0.25,3); s[id] = v; dark.push(clamp(K.maxDarken * v * scale,0,1)); weak.push(clamp(K.maxWeaken * v * scale,0,1)); });
    return { s, dark, weak, any: VIDS.some(id => s[id] > 0.005) };
  }

  /* ---------- wall territories (typical pattern) ----------
     frame: base B, apex A, long axis u (base to apex), anterior axis eAnt, patient-left axis eLat, LV centre C (mesh coordinates).
     theta = angle around the LV long axis, turned so the drawn LAD groove sits at -30 (the anterior / anteroseptal boundary):
       0 anterior, +90 patient's left (lateral), 180 posterior/inferior, -90 septal side.
       LAD  theta -90..+30 (anterior, anteroseptal)   LCX  +30..+165 (anterolateral, inferolateral)   RCA  the rest (inferior, inferoseptal)
       Towards the apex the LAD takes over (apex mostly LAD); the right ventricle free wall belongs to the RCA.            */
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const nrm = a => { const n = Math.sqrt(dot(a, a)) || 1; return [a[0] / n, a[1] / n, a[2] / n]; };
  const axpy = (a, k, b) => [a[0] - k * b[0], a[1] - k * b[1], a[2] - k * b[2]];
  function makeFrame(anim, lvCentre, ladPath) {
    const u = nrm(anim.long_axis_unit), B = anim.base, A = anim.apex;
    const eAnt = nrm(axpy([0, 0, 1], dot([0, 0, 1], u), u));                       /* +z (anterior) made perpendicular to u */
    let eLat = axpy(axpy([1, 0, 0], dot([1, 0, 0], u), u), dot([1, 0, 0], eAnt), eAnt); eLat = nrm(eLat);   /* +x (patient's left) */
    const f = { B, A, u, eAnt, eLat, C: lvCentre, L: Math.sqrt(dot(sub(A, B), sub(A, B))), th0: 0 };
    if (ladPath && ladPath.length) {   /* turn the frame so the mean angle of the drawn LAD groove is -30 degrees */
      let sx = 0, sy = 0; ladPath.forEach(p => { const a = rawTheta(f, p) * Math.PI / 180; sx += Math.cos(a); sy += Math.sin(a); });
      f.th0 = Math.atan2(sy, sx) * 180 / Math.PI + 30;
    }
    return f;
  }
  function rawTheta(f, p) {
    const r = sub(p, f.C), rr = axpy(r, dot(r, f.u), f.u);
    return Math.atan2(dot(rr, f.eLat), dot(rr, f.eAnt)) * 180 / Math.PI;
  }
  function thetaDeg(f, p) { let t = rawTheta(f, p) - f.th0; t = ((t + 180) % 360 + 360) % 360 - 180; return t; }
  /* part: 'lv' | 'rv' | 'septum'. Returns [wLAD, wLCX, wRCA] summing to 1. */
  function segmentForThetaHeight(theta, t) {
    let u = ((theta + 180) % 360 + 360) % 360 - 180, h = clamp(t, 0, 1);
    if (h >= K.segApexStart) return 17;
    if (h >= K.segApicalStart) { const j = Math.floor((((-u) + 45) % 360 + 360) % 360 / 90); return 13 + (j % 4); }
    if (h >= K.segMidStart) { const j = Math.floor((((-u) + 30) % 360 + 360) % 360 / 60); return 7 + (j % 6); }
    const j = Math.floor((((-u) + 30) % 360 + 360) % 360 / 60); return 1 + (j % 6);
  }
  function segmentForPoint(f, part, p) {
    if (part !== 'lv' && part !== 'septum') return null;
    const t = clamp(dot(sub(p, f.B), f.u) / f.L, 0, 1);
    return segmentForThetaHeight(thetaDeg(f, p), t);
  }

  function territory(f, part, p, options) {
    if (part === 'rv') return [0, 0, 1];
    const th = thetaDeg(f, p), t = clamp(dot(sub(p, f.B), f.u) / f.L, 0, 1);
    let wL = sstep(-105, -75, th) * (1 - sstep(15, 45, th));
    let wX = sstep(15, 45, th) * (1 - sstep(150, 180, th));
    wL = clamp(wL, 0, 1); wX = clamp(wX, 0, 1 - wL);
    const wR = 1 - wL - wX, a = sstep(0.62, 0.9, t);
    const base=[(1 - a) * wL + a * 0.8, (1 - a) * wX + a * 0.1, (1 - a) * wR + a * 0.1];
    /* Alternate dominance is a teaching re-weighting of the same angular territory logic.
       The default path intentionally returns the original numbers unchanged. */
    if(options&&options.dominance==='left'&&Array.isArray(options.shares)){
      const ref=[0.45,0.29,0.26],tar=options.shares,out=[base[0]*tar[0]/ref[0],base[1]*tar[1]/ref[1],base[2]*tar[2]/ref[2]],sum=out[0]+out[1]+out[2];
      return sum>0?out.map(x=>x/sum):base;
    }
    return base;
  }

  /* ---------- illustrative ECG ----------
     One lead, one beat as a function of beat position phi (the same phi as the heart animation): P wave just before phi = 1 (atrial kick),
     QRS at the start of systole, ST segment, T wave late in systole. ST offset lowers the ST segment by stMv (mV).             */
  const G = (x, c, w) => { let d = x - c; d -= Math.round(d); return Math.exp(-0.5 * (d / w) * (d / w)); };
  function stDepressionMv(sById) {   /* worst-case union of the three arteries: 1 - prod(1 - s) */
    let keep = 1; VIDS.forEach(id => { keep *= 1 - clamp((sById && sById[id]) || 0, 0, 1); });
    return K.stMaxMv * (1 - keep);
  }
  function ecg(phi, stMv) {
    phi = ((phi % 1) + 1) % 1;
    const st = (stMv || 0) * sstep(0.055, 0.085, phi) * (1 - sstep(0.17, 0.215, phi));
    return 0.12 * G(phi, 0.93, 0.022) - 0.10 * G(phi, 0.985, 0.006) + 1.0 * G(phi, 0.015, 0.0085) - 0.22 * G(phi, 0.045, 0.0075)
      + 0.30 * G(phi, 0.265, 0.045) - st;
  }

  /* ---------- the user's latest model estimate (dashboard snapshot "cm-case-v1") ---------- */
  function parseCase(j, now) {
    if (!j || typeof j !== 'object' || !j.res || typeof j.res !== 'object') return null;
    const p = {}, range = {}; let ok = false;
    VIDS.forEach(id => { const s = j.res[id], v = s && s.p; if (typeof v === 'number' && isFinite(v) && v >= 0 && v <= 1) {
      p[id] = v; ok = true; const iv = s.interval || s; if (typeof iv.lo === 'number' && typeof iv.hi === 'number') range[id] = [iv.lo, iv.hi]; } });
    if (!ok || VIDS.some(id => !(id in p))) return null;
    const drivers = {}, tg = j.res.shap && j.res.shap.targets;
    VIDS.forEach(id => { const recs = tg && tg[id] && Array.isArray(tg[id].records) ? tg[id].records : null; if (!recs) return;
      drivers[id] = recs.filter(r => r && typeof r.label === 'string' && isFinite(r.value)).slice(0, 3).map(r => ({
        label: r.label, shown: r.display_value == null ? '' : String(r.display_value), unit: r.unit || '', dir: r.direction === 'down' ? 'down' : 'up',
        share: typeof r.share_pct === 'number' ? r.share_pct : null })); });
    const t = typeof j.t === 'number' ? j.t : null;
    return { t, ageMin: t && now ? Math.max(0, Math.round((now - t) / 60000)) : null, p, range, drivers };
  }
  /* highest-probability artery; ties go in the order LAD, LCX, RCA */
  function preselect(est) { let best = VIDS[0]; VIDS.forEach(id => { if (est.p[id] > est.p[best] + 1e-12) best = id; }); return best; }
  function suggest(est, id) {
    const p = est.p[id];
    return { vessel: id, p, narrowing: p >= K.sugHigh ? K.sugHighPct : p >= K.sugMid ? K.sugMidPct : 0 };
  }
  function level(p) { return p < 0.4 ? 'Low' : p < 0.65 ? 'Moderate' : 'High'; }   /* same cut-offs as the dashboard */

  return { K, VIDS, severity, wallEffect, makeFrame, thetaDeg, territory, segmentForThetaHeight, segmentForPoint, stDepressionMv, ecg, parseCase, preselect, suggest, level };
});
