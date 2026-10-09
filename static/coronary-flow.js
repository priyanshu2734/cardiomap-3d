/* CoronaryFlow: a lumped, steady-state teaching model of flow through one coronary artery with one narrowing (stenosis).
   Pure functions, no DOM, no THREE. Loaded by heart_function.html in the browser and by tests/test_coronary_flow.js in node.
   SIMPLIFIED PHYSICS MODEL, NOT PATIENT-SPECIFIC OR CLINICAL. Every number below is a round textbook-scale teaching value, not a measurement.

   Circuit (one vessel):  aorta Pa --[ healthy artery Rp ]--[ stenosis dP = Rv*Q + Rt*Q^2 ]--[ small vessels Rm ]-- Pv
   * Rp  = 8 mu (L - Ls) / (pi r0^4)                      friction of the healthy part of the artery (Poiseuille)
   * Rv  = 8 mu Ls / (pi rs^4)                            viscous term, proportional to 1/rs^4
   * Rt  = Kt rho / 2 * (1/As - 1/A0)^2                   turbulent / sudden-expansion term
   * Rm  autoregulates between Rrest (resting tone) and Rmin (fully widened); Rmin is set so a healthy artery peaks at CFR_MAX x resting flow.
   Demand Qd = Qrest * m (m = 1 at rest, EXERCISE_FACTOR in exercise). Capacity Qcap solves Rt Q^2 + (Rp + Rv + Rmin) Q = Pa - Pv.
   Delivered flow Q = min(Qd, Qcap).  Everything is monotone: a larger narrowing never raises Q, Qcap or the reserve.            */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CoronaryFlow = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const PI = Math.PI, MMHG = 133.322, ML_MIN = 1e-6 / 60;            /* Pa per mmHg; m^3/s per mL/min */
  const K = {
    mu: 3.5e-3,            /* blood viscosity, Pa s (about 3.5 mPa s) */
    rho: 1060,             /* blood density, kg/m^3 */
    Kt: 1.52,              /* expansion-loss coefficient (Young and Tsai style) */
    paMmHg: 90, pvMmHg: 5, /* mean aortic and coronary outflow pressures (same at rest and exercise: simplification) */
    cfrMax: 4.0,           /* healthy peak flow = 4 x resting flow when the small vessels are fully widened */
    exerciseFactor: 3.5,   /* exercise demand, within the usual 3 to 4 x resting flow */
    stenosisLenMm: 10,     /* length of the narrowed segment */
    reserveOkFrac: 0.5,    /* "Flow maintained" while at least half of the healthy headroom (at this activity) is left */
    flowTol: 1e-6          /* Q counts as meeting demand when Q >= Qd (1 - flowTol) */
  };
  /* r0 = normal radius (mm), L = length (mm), qRest = resting flow (mL/min), at = fixed position of the narrowing along the drawn path (0..1).
     Schematic teaching values; real arteries vary a lot between people. */
  const VESSELS = {
    LAD: { r0: 1.9, L: 100, qRest: 90, at: 0.36, sysImpede: 0.70 },
    LCX: { r0: 1.7, L: 80, qRest: 60, at: 0.40, sysImpede: 0.70 },
    RCA: { r0: 1.9, L: 110, qRest: 70, at: 0.34, sysImpede: 0.40 }   /* right ventricle squeezes less, so less systolic impedance */
  };
  const STATES = ['Flow maintained', 'Reserve reduced', 'Flow limiting'];
  const BAND_NOTE_LOW = 'Below 50% is not counted as a stenosis in this dataset.';

  function vessel(id) { const v = VESSELS[id]; if (!v) throw new Error('Unknown vessel ' + id); return v; }
  function clampD(d) { d = Number(d); return !isFinite(d) ? 0 : Math.max(0, Math.min(99, d)); }

  /* ---- teaching context: optional what-if overrides of four constants. K above is the fixed REFERENCE set and is never changed.
     The page validates typed values (rejecting out-of-range ones); this layer only ignores non-positive or non-finite numbers.
     Resolution order for every call: explicit opts  >  setContext() values  >  K.  With no overrides every number is exactly as before. ---- */
  const CTX = {}, CTX_KEYS = ['exerciseFactor', 'paMmHg', 'lesionLenMm', 'mu'];
  function posNum(x) { x = Number(x); return (x != null && isFinite(x) && x > 0) ? x : null; }
  function pick(a, b, c) { const x = posNum(a); if (x != null) return x; const y = posNum(b); return y != null ? y : c; }
  function resolve(o) {
    o = o || {};
    return { mu: pick(o.mu, CTX.mu, K.mu), pa: pick(o.paMmHg, CTX.paMmHg, K.paMmHg), pv: K.pvMmHg,
      ls: pick(o.lesionLenMm, CTX.lesionLenMm, K.stenosisLenMm), ex: pick(o.exerciseFactor, CTX.exerciseFactor, K.exerciseFactor) };
  }
  const REF = { mu: K.mu, pa: K.paMmHg, pv: K.pvMmHg, ls: K.stenosisLenMm, ex: K.exerciseFactor };
  /* Teaching map from haematocrit (percent) to blood viscosity (Pa s): relative viscosity f(H) = 1 + 2.5 H + 7.35 H^2, scaled so the
     reference 45% gives exactly K.mu. A smooth, monotone teaching approximation, not a clinical formula. */
  const HCT_REF = 45;
  function viscosityFromHct(hctPct) {
    const f = h => 1 + 2.5 * h + 7.35 * h * h, h = Number(hctPct) / 100;
    return (isFinite(h) && h > 0) ? K.mu * f(h) / f(HCT_REF / 100) : K.mu;
  }
  function setContext(patch) {
    patch = patch || {};
    CTX_KEYS.forEach(k => { if (k in patch) { const x = posNum(patch[k]); if (x == null) delete CTX[k]; else CTX[k] = x; } });
    return getContext();
  }
  function getContext() { const c = {}; CTX_KEYS.forEach(k => { if (CTX[k] != null) c[k] = CTX[k]; }); return c; }
  function resetContext() { CTX_KEYS.forEach(k => { delete CTX[k]; }); }
  function isReference() { return CTX_KEYS.every(k => CTX[k] == null || CTX[k] === ({ exerciseFactor: K.exerciseFactor, paMmHg: K.paMmHg, lesionLenMm: K.stenosisLenMm, mu: K.mu })[k]); }
  function mult(mode, o) { return mode === 'exercise' ? resolve(o).ex : 1; }

  /* ---- severity bands (percent diameter reduction): green < 50, amber 50 to 69.99, red >= 70 ---- */
  function bandFor(d) {
    d = clampD(d);
    if (d < 50) return { id: 'green', label: 'Below 50%', counted: false, note: BAND_NOTE_LOW, hex: 0x2fa66a };
    if (d < 70) return { id: 'amber', label: '50 to 69%', counted: true, note: 'At least 50% counts as a stenosis in this dataset.', hex: 0xe0a21b };
    return { id: 'red', label: '70% and above', counted: true, note: 'At least 50% counts as a stenosis in this dataset.', hex: 0xd64045 };
  }

  /* ---- geometry ---- */
  function stenosisRadiusMm(id, d) { return vessel(id).r0 * (1 - clampD(d) / 100); }
  /* drawn radius along the path, u in 0..1: smooth cosine taper into a throat of radius rs (display geometry; resistance uses the lumped throat) */
  function radiusMm(id, d, u) {
    const v = vessel(id), r0 = v.r0, rs = stenosisRadiusMm(id, d), half = resolve().ls / v.L; /* full taper width = 2*half */
    const x = Math.abs(u - v.at) / half; if (x >= 1) return r0;
    return r0 - (r0 - rs) * 0.5 * (1 + Math.cos(PI * x));
  }

  /* ---- resistances (SI) ---- */
  function partsWith(id, d, c) {
    const v = vessel(id), mu = c.mu, r0 = v.r0 * 1e-3, rs = stenosisRadiusMm(id, d) * 1e-3, L = v.L * 1e-3, Ls = c.ls * 1e-3;
    const A0 = PI * r0 * r0, As = PI * rs * rs;
    return {
      r0, rs, A0, As,
      Rp: 8 * mu * (L - Ls) / (PI * Math.pow(r0, 4)),
      Rv: 8 * mu * Ls / (PI * Math.pow(rs, 4)),
      Rt: K.Kt * K.rho / 2 * Math.pow(1 / As - 1 / A0, 2)
    };
  }
  function parts(id, d, o) { return partsWith(id, d, resolve(o)); }
  function partsRef(id, d) { return partsWith(id, d, REF); }   /* reference conditions: used to calibrate the small vessels */
  /* pressure drop across the narrowing alone, mmHg, at flow q (mL/min): dP = Rv q + Rt q^2 */
  function stenosisDrop(id, d, qMlMin, o) {
    const p = parts(id, d, o), q = Math.max(0, qMlMin) * ML_MIN, visc = p.Rv * q, turb = p.Rt * q * q;
    return { viscous: visc / MMHG, turbulent: turb / MMHG, total: (visc + turb) / MMHG };
  }
  function rmin(id) {  /* fully widened small-vessel resistance: calibrated ONCE at the reference conditions (healthy artery peaks at cfrMax x resting flow); a physical property, so what-if pressure/viscosity/length do not move it */
    const v = vessel(id), p0 = partsRef(id, 0), dp = (REF.pa - REF.pv) * MMHG;
    return dp / (K.cfrMax * v.qRest * ML_MIN) - p0.Rp;
  }
  /* peak (fully widened) flow capacity, mL/min */
  function capacity(id, d, o) {
    const c = resolve(o), p = partsWith(id, d, c), dp = (c.pa - c.pv) * MMHG, a = p.Rt, b = p.Rp + p.Rv + rmin(id);
    const q = a < 1e-30 ? dp / b : (-b + Math.sqrt(b * b + 4 * a * dp)) / (2 * a);
    return q / ML_MIN;
  }

  /* ---- main solver ---- */
  function solve(id, d, mode, opts) {
    d = clampD(d); const v = vessel(id), m = mult(mode, opts);
    const qd = v.qRest * m, qcap = capacity(id, d, opts), qcap0 = capacity(id, 0, opts), q = Math.min(qd, qcap);
    const flowPct = 100 * q / qd, headroom0 = qcap0 - qd;
    const h = headroom0 > 1e-9 ? Math.max(0, Math.min(1, (qcap - qd) / headroom0)) : (qcap >= qd ? 1 : 0);
    const limiting = q < qd * (1 - K.flowTol);
    const state = limiting ? 2 : (h < K.reserveOkFrac ? 1 : 0);
    const drop = stenosisDrop(id, d, q, opts), p = parts(id, d, opts), cx = resolve(opts);
    const dp = (cx.pa - cx.pv);
    /* how far the small vessels have widened to hold flow: 0 = resting tone, 1 = fully widened (no autoregulation left) */
    const rmn = rmin(id), rrest = dp * MMHG / (v.qRest * ML_MIN) - parts(id, 0, opts).Rp;
    const rmNeeded = ((dp * MMHG) - (p.Rp * q * ML_MIN + drop.total * MMHG)) / (q * ML_MIN);
    const widened = rrest - rmn > 1e-12 ? Math.max(0, Math.min(1, (rrest - Math.max(rmNeeded, rmn)) / (rrest - rmn))) : 1;
    return {
      id, mode: mode === 'exercise' ? 'exercise' : 'rest', d, band: bandFor(d), rsMm: stenosisRadiusMm(id, d),
      areaPct: 100 * p.As / p.A0, demand: qd, capacity: qcap, flow: q, flowPct,
      cfr: qcap / v.qRest, cfrHealthy: qcap0 / v.qRest, reservePct: 100 * h, widenedPct: 100 * widened,
      dropMmHg: drop.total, dropViscMmHg: drop.viscous, dropTurbMmHg: drop.turbulent,
      state, stateLabel: STATES[state], plain: plain(state, mode === 'exercise', widened, d),
      conditions: { exerciseFactor: cx.ex, paMmHg: cx.pa, lesionLenMm: cx.ls, muMPas: cx.mu * 1000 }
    };
  }
  function plain(state, ex, widened, d) {
    const act = ex ? 'During exercise' : 'At rest';
    if (d <= 0 && state === 2) return act + (resolve().pa < K.paMmHg - 1e-9
      ? ' even this healthy artery cannot deliver what its part of the heart wall asks for at the chosen aortic pressure: too little pressure is available to push the blood through, even with the small vessels fully widened.'
      : ' the heart wall asks for about the most blood even a healthy artery can deliver (peak capacity is about ' + K.cfrMax + ' times resting flow), so no spare capacity is left.');
    if (d <= 0 && state === 1) return act + ' this healthy artery still meets demand, but at the chosen pressure and effort the small vessels downstream are nearly fully widened and little spare capacity is left.';
    if (d <= 0) return act + ' this artery delivers all the blood its part of the heart wall asks for' + (ex ? '; the small vessels downstream widen to meet the higher demand.' : '.');
    if (state === 0) return act + ' this artery still delivers all the blood its part of the heart wall asks for' + (widened > 0.02 ? ', with the small vessels downstream widened a little to make up for the narrowing.' : '.');
    if (state === 1) return act + ' this artery still meets demand, but the small vessels downstream have widened to hold flow and little spare capacity is left.';
    return act + ' this artery can no longer deliver what its part of the heart wall asks for, even with the small vessels fully widened.' + (ex ? '' : ' Flow falls short even at rest.');
  }
  /* largest narrowing (percent) at which demand is still fully met, by bisection (valid because flow is monotone in d) */
  function toleratedNarrowing(id, mode, opts) {
    let lo = 0, hi = 99;
    if (solve(id, hi, mode, opts).state !== 2) return hi;
    for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if (solve(id, mid, mode, opts).state !== 2) lo = mid; else hi = mid; }
    return lo;
  }

  /* ---- flow-versus-narrowing curve (the Heart Function Lab chart). No new maths: every point is solve(), and the thresholds are
     toleratedNarrowing(). Unit is mL/min throughout. ---- */
  const CURVE = { dMax: 99, step: 1 };
  /* points from 0 to dMax percent narrowing: { d, demand, capacity, flow, flowPct, state } for one activity mode */
  function curve(id, mode, step, opts) {
    vessel(id); step = Number(step); if (!(step > 0)) step = CURVE.step; step = Math.max(0.25, step);
    const out = []; let d = 0;
    for (let i = 0; d < CURVE.dMax - 1e-9; i++) { d = i * step; if (d > CURVE.dMax) d = CURVE.dMax; out.push(point(id, d, mode, opts)); if (d >= CURVE.dMax) break; }
    if (out[out.length - 1].d < CURVE.dMax) out.push(point(id, CURVE.dMax, mode, opts));
    return out;
  }
  function point(id, d, mode, opts) { const r = solve(id, d, mode, opts); return { d: r.d, demand: r.demand, capacity: r.capacity, flow: r.flow, flowPct: r.flowPct, state: r.state }; }
  /* the narrowing (percent) up to which demand is still fully met, per activity; CURVE.dMax means "still met at the largest narrowing drawn" */
  function thresholds(id, opts) { return { rest: toleratedNarrowing(id, 'rest', opts), exercise: toleratedNarrowing(id, 'exercise', opts) }; }
  /* the sentence under the chart, built from thresholds() so it cannot drift from the maths */
  function summary(id, opts) {
    const t = thresholds(id, opts), f = x => Math.floor(x + 1e-9), at = x => x >= CURVE.dMax ? 'even at ' + CURVE.dMax + '% narrowing' : x <= 1e-6 ? 'not even with no narrowing, under the current pressure and effort settings' : 'until about ' + f(x) + '% narrowing';
    let s = 'In this model ' + id + ' meets demand at rest ' + at(t.rest) + ' and in exercise ' + at(t.exercise) + '.';
    if (t.rest > t.exercise + 1e-9) s += ' Between ' + f(t.exercise) + '% and ' + f(t.rest) + '% it is fine at rest but falls short with exertion.';
    return s;
  }

  /* ---- cardiac cycle (same constants and curve as the page's CYCLE block; a node test keeps them identical) ---- */
  const SYS_END = 0.35, RELAX_END = 0.55;
  function squeeze(phi) {
    phi = ((phi % 1) + 1) % 1;
    if (phi < SYS_END) return 0.5 * (1 - Math.cos(PI * phi / SYS_END));
    if (phi < RELAX_END) return 0.5 * (1 + Math.cos(PI * (phi - SYS_END) / (RELAX_END - SYS_END)));
    return 0;
  }
  const NORM = {};
  function inflowRaw(id, phi) { return 1 - vessel(id).sysImpede * squeeze(phi); }
  function inflowNorm(id) {
    if (NORM[id]) return NORM[id];
    let s = 0; const n = 2000; for (let i = 0; i < n; i++) s += inflowRaw(id, (i + 0.5) / n);
    return (NORM[id] = n / s);
  }
  /* multiplier on the mean flow at beat position phi; its cycle mean is exactly 1; lowest at peak squeeze, highest in diastole */
  function inflowFactor(id, phi) { return inflowRaw(id, phi) * inflowNorm(id); }

  /* ---- particles: continuity. Each particle carries a fixed volume coordinate w in 0..1 (fraction of the tube's lumen volume), so it moves at
     dV/dt = Q and its speed along the tube is v(u) = Q / A(u): fastest in the throat. ---- */
  const TAB = {};
  function volumeTable(id, d) {
    d = Math.round(clampD(d) * 4) / 4; const key = id + ':' + d + ':' + resolve().ls; if (TAB[key]) return TAB[key];
    const n = 240, us = new Array(n + 1), cum = new Array(n + 1); let acc = 0; us[0] = 0; cum[0] = 0;
    for (let i = 1; i <= n; i++) {
      const u0 = (i - 1) / n, u1 = i / n, r = radiusMm(id, d, (u0 + u1) / 2);
      acc += PI * r * r * (u1 - u0) * vessel(id).L; us[i] = u1; cum[i] = acc;
    }
    return (TAB[key] = { id, d, us, cum, volMm3: acc });
  }
  function uAtFraction(tab, w) {   /* w in 0..1 of total lumen volume -> position u along the path */
    w = Math.max(0, Math.min(1, w)); const target = w * tab.volMm3, c = tab.cum; let lo = 0, hi = c.length - 1;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (c[mid] <= target) lo = mid; else hi = mid; }
    const span = c[hi] - c[lo]; return tab.us[lo] + (span > 0 ? (target - c[lo]) / span : 0) * (tab.us[hi] - tab.us[lo]);
  }
  /* speed along the tube, mm/s, for flow q (mL/min) at position u */
  function speedMmS(id, d, u, qMlMin) {
    const r = radiusMm(id, d, u); return (Math.max(0, qMlMin) * 1000 / 60) / (PI * r * r);
  }
  /* fraction of particles drawn beyond the narrowing: scales with delivered flow as a share of demand (illustrative "thinner" flow) */
  function distalFraction(res) { return Math.max(0.15, Math.min(1, res.flowPct / 100)); }
  /* advance a particle by dt seconds at instantaneous flow q (mL/min); returns the new w (wraps at 1) */
  function advanceFraction(tab, w, qMlMin, dt) { const x = w + Math.max(0, qMlMin) * 1000 / 60 * dt / tab.volMm3; return x - Math.floor(x); }

  return { K, VESSELS, STATES, resolve, setContext, getContext, viscosityFromHct, HCT_REF, resetContext, isReference, partsRef, bandFor, stenosisRadiusMm, radiusMm, parts, stenosisDrop, capacity, solve, toleratedNarrowing, CURVE, curve, thresholds, summary,
    squeeze, inflowFactor, volumeTable, uAtFraction, speedMmS, distalFraction, advanceFraction };
});
