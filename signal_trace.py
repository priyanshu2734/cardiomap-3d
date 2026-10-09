"""Visual QA for the front-end-only Cardiac Signal Trace.

Run with the repository's mock server on :8000 (python tests/mock_server.py 8000).
Three.js/CDN requests are stubbed by probe.py; /predict is replaced with a
deterministic payload (real SHAP record shape) so every number is checked
against known inputs. Usage: python tests/visual_qa/signal_trace.py
"""
import json
import urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright
from probe import setup

HERE = Path(__file__).resolve().parent
VPS = [(1360, 768), (1024, 768), (768, 768), (390, 844)]
SCHEMA = {u["column"]: u for u in json.load(urllib.request.urlopen("http://localhost:8000/schema"))}
SEG = {"LAD": "1 · 2 · 7 · 8 · 13 · 14 · 17", "RCA": "3 · 4 · 9 · 10 · 15", "LCX": "5 · 6 · 11 · 12 · 16"}
CNT = {"LAD": 7, "RCA": 5, "LCX": 5}
PROBS = {"CAD": 0.52, "LAD": 0.634, "LCX": 0.41, "RCA": 0.22}
IVS = {
    "CAD": {"lo": 0.45, "hi": 0.60, "level": 0.8, "range_label": "moderate range"},
    "LAD": {"lo": 0.52, "hi": 0.78, "level": 0.8, "range_label": "moderate range"},
    "LCX": {"lo": 0.30, "hi": 0.55, "level": 0.8, "range_label": "wide range"},
    "RCA": {"lo": 0.18, "hi": 0.25, "level": 0.8, "range_label": "narrow range"},
}
# (column, submitted/display, SHAP value) per target, unsorted on purpose
RAW = {
    "LAD": [("Age", "58 y", 0.182, False), ("Region RWMA", "3", 0.121, False), ("St Depression", "1.4", -0.064, False),
            ("BMI", "26.2 kg/m2", 0.03, True), ("HTN", "Yes", -0.02, False), ("Sex", "Male", 0.0, False)],
    "LCX": [("HTN", "Yes", 0.20, False), ("Age", "58 y", -0.11, False), ("EF-TTE", "45 %", 0.09, False), ("BMI", "26 kg/m2", 0.01, True)],
    "RCA": [("Typical Chest Pain", "Yes", 0.30, False), ("Sex", "Male", 0.12, False), ("Age", "58 y", -0.05, False), ("HTN", "Yes", 0.01, False)],
    "CAD": [("Region RWMA", "3", 0.40, False), ("Age", "58 y", 0.20, False), ("Typical Chest Pain", "Yes", -0.10, False)],
}


def records(target):
    recs = []
    for col, shown, val, dflt in RAW[target]:
        u = SCHEMA[col]
        recs.append({"feature": col, "label": u["label"], "submitted_value": None if dflt else 1, "display_value": shown,
                     "unit": u["unit"], "is_default": dflt, "value": val, "abs_value": abs(val),
                     "direction": "up" if val > 0 else ("down" if val < 0 else "none")})
    recs.sort(key=lambda r: r["abs_value"], reverse=True)
    tot = sum(r["abs_value"] for r in recs) or 1
    for i, r in enumerate(recs, 1):
        r["rank"], r["share_pct"] = i, round(100 * r["abs_value"] / tot, 1)
    return recs


def pack(t):
    recs = records(t)
    total = round(sum(r["value"] for r in recs), 6)
    return {"target": t, "model": "StubModel", "method": "TreeExplainer", "output_space": "probability", "base_value": 0.30,
            "output_value": round(0.30 + total, 6), "sum_shap": total, "base_probability": 0.30,
            "output_probability": round(0.30 + total, 6), "model_probability": PROBS[t], "n_features": len(recs), "records": recs,
            "limitations": ["SHAP explains the fitted predictive model; it is not a causal effect."]}


def payload(with_shap=True):
    d = {"model": {}, "explanation": "SHAP is model explanation, not causation", "explainability": {},
         "shap": {"method": "Real SHAP", "status": "available", "errors": {}, "targets": {t: pack(t) for t in PROBS}} if with_shap else None}
    if not with_shap:
        del d["shap"]
    for t in PROBS:
        d[t] = {"p": PROBS[t], "c": {}, "interval": IVS[t]}
    return d


def run_case(p, w, h, theme, online=True):
    b, pg, errs = setup(p, w, h, theme)
    body = json.dumps(payload(online))
    calls = []

    def handler(route):
        calls.append(1)
        route.fulfill(status=200, content_type="application/json", headers={"Access-Control-Allow-Origin": "*"}, body=body)
    pg.route("**/predict", handler)
    out = {"errors": errs, "online": online}
    pg.evaluate("document.querySelectorAll('[data-reveal]').forEach(e=>e.classList.add('visible'))")
    out["exists"] = pg.locator("#signalTraceCard").count() == 1
    out["after_territory"] = pg.evaluate("()=>{const c=document.getElementById('signalTraceCard');return c.previousElementSibling.id==='territoryCard'&&c.nextElementSibling.id==='peerCard'}")
    # Empty state: force a neutral state without touching the page's own code paths.
    out["empty"] = pg.evaluate("""()=>{const keep=res;res=null;cmSignalTracePaint();
      const o={msg:document.getElementById('stEmpty').textContent,hidden:document.getElementById('stEmpty').hidden,
      vp:document.getElementById('stVP').textContent,num:[...document.querySelectorAll('.st-num')].map(e=>e.textContent),
      seg:document.getElementById('stSegLine').hidden,txt:document.getElementById('signalTraceCard').innerText};
      res=keep;cmSignalTracePaint();return o}""")
    pg.click("#run")
    pg.wait_for_timeout(250)
    ncalls = len(calls)
    seen = {}

    def read():
        return pg.evaluate("""()=>{const q=s=>document.querySelector(s),txt=s=>(q(s)||{}).textContent;
          const rows=[...document.querySelectorAll('.st-row')].filter(r=>!r.hidden).map(r=>({rk:r.querySelector('.st-rk').textContent,
            label:(r.querySelector('.st-feat').hidden?r.querySelector('.st-feat-plain'):r.querySelector('.st-feat')).textContent,
            linked:!r.querySelector('.st-feat').hidden,val:r.querySelector('.st-val').textContent,num:r.querySelector('.st-num').textContent,
            dir:r.querySelector('.st-dir').textContent,bar:r.querySelector('.st-bar i').style.width}));
          return {sel,pressed:[...document.querySelectorAll('[data-st-vessel][aria-pressed="true"]')].map(b=>b.dataset.stVessel),
            name:txt('#stVName'),vp:txt('#stVP'),lvl:txt('#stVLvl'),range:txt('#stVRange'),tcount:txt('#stTCount'),
            segs:q('#stSegLine').hidden?'':txt('#stSegNums'),rows,desc:txt('#signalTraceDesc'),live:txt('#signalTraceLive'),
            noshap:q('#stNoShap').hidden?'':q('#stNoShap').innerText,sensBtn:!q('#stSens').hidden,
            chip:(q('#chips .chip[aria-pressed="true"]')||{dataset:{}}).dataset.t,tab:(q('#tabs button[aria-pressed="true"],#tabs button.on,#tabs button.active')||{}).textContent,
            vpanel:txt('#vesselSelectedBadge'),terrSel:[...document.querySelectorAll('#terrSvg [data-seg].selected')].map(e=>+e.dataset.seg).sort((a,b)=>a-b),
            docX:document.documentElement.scrollWidth-innerWidth}}""")
    out["net_new_calls"] = ncalls
    for v in ("LAD", "RCA", "LCX", "CAD"):
        pg.locator(f'[data-st-vessel="{v}"]').click()
        pg.wait_for_timeout(120)
        seen[v] = read()
    out["seen"] = seen
    out["fetch_in_source"] = pg.evaluate("()=>/fetch\\(|XMLHttpRequest|WebSocket/.test(cmSignalTracePaint.toString())")
    if online:
        # two-way: elsewhere -> trace
        pg.locator('#chips .chip[data-t="LAD"]').click(); pg.wait_for_timeout(100)
        out["chip_to_trace"] = read()["pressed"]
        pg.locator('[data-vessel-select="RCA"]').first.click() if pg.locator('[data-vessel-select="RCA"]').count() else None
        pg.wait_for_timeout(100)
        out["vsel_to_trace"] = read()["pressed"]
        pg.locator('#terrSvg [data-seg="5"]').click(); pg.wait_for_timeout(100)
        out["seg_to_trace"] = read()["pressed"]
        # trace -> everything else (LAD), Enter + Space on the keyboard
        pg.locator('[data-st-vessel="LAD"]').focus(); pg.keyboard.press("Enter"); pg.wait_for_timeout(100)
        out["enter"] = read()
        pg.locator('[data-st-vessel="LCX"]').focus(); pg.keyboard.press("Space"); pg.wait_for_timeout(100)
        out["space"] = read()
        pg.locator('[data-st-vessel="LAD"]').click(); pg.wait_for_timeout(100)
        # trace button
        before = pg.evaluate("JSON.stringify(v)")
        pg.locator('.st-row[data-i="0"] [data-st-trace]').click(); pg.wait_for_timeout(100)
        out["trace"] = pg.evaluate("""()=>({msg:document.getElementById('stTraceMsg').textContent,msgHidden:document.getElementById('stTraceMsg').hidden,
          row:document.querySelector('.st-row[data-i="0"]').classList.contains('st-on'),vessel:document.getElementById('stVessel').classList.contains('st-on'),
          terr:document.getElementById('stTerr').classList.contains('st-on'),hl:document.querySelectorAll('.st-input-hl').length,
          pressed:document.querySelector('.st-row[data-i="0"] [data-st-trace]').getAttribute('aria-pressed')})""")
        out["trace_calls_delta"] = len(calls) - ncalls
        out["v_unchanged_after_trace"] = pg.evaluate("JSON.stringify(v)") == before
        # click feature -> highlights existing input, no state change
        before = pg.evaluate("JSON.stringify(v)")
        pg.locator('.st-row[data-i="0"] .st-feat').click(); pg.wait_for_timeout(500)
        out["go"] = pg.evaluate("()=>({hl:document.querySelectorAll('.st-input-hl').length,inForm:!!document.querySelector('#form .st-input-hl')})")
        out["v_unchanged_after_go"] = pg.evaluate("JSON.stringify(v)") == before
        # view territory
        pg.locator('#stView').click(); pg.wait_for_timeout(500)
        out["view"] = read()["terrSel"]
        out["calls_total_delta"] = len(calls) - ncalls
    # overlap with the floating Ask-AI button: scroll the card bottom into view (honours scroll-margin-bottom)
    pg.evaluate("document.getElementById('signalTraceCard').scrollIntoView({block:'end'})"); pg.wait_for_timeout(300)
    out["fab"] = pg.evaluate("""()=>{const f=document.querySelector('.ai-fab');if(!f)return {present:false};const a=f.getBoundingClientRect();
      const n=document.querySelector('#signalTraceCard .st-foot').getBoundingClientRect();
      return {present:true,overlap:!(a.right<=n.left||a.left>=n.right||a.bottom<=n.top||a.top>=n.bottom)}}""")
    out["card_w"] = pg.evaluate("document.getElementById('signalTraceCard').getBoundingClientRect().width")
    out["card_overflow"] = pg.evaluate("""()=>{const c=document.getElementById('signalTraceCard'),r=c.getBoundingClientRect();
      return [...c.querySelectorAll('*')].filter(e=>{const x=e.getBoundingClientRect();return x.width&&(x.right>r.right+1||x.left<r.left-1)&&!e.classList.contains('sr-only')}).map(e=>e.className||e.tagName).slice(0,5)}""")
    out["required"] = pg.locator("#signalTraceCard").inner_text()
    pg.evaluate("document.getElementById('signalTraceCard').scrollIntoView({block:'start'})")
    pg.locator('[data-st-vessel="LAD"]').click(); pg.wait_for_timeout(100)
    if online:
        pg.locator('.st-row[data-i="0"] [data-st-trace]').click(); pg.wait_for_timeout(100)
    pg.screenshot(path=str(HERE / f"signal_trace_{w}x{h}_{theme}_{'online' if online else 'offline'}.png"))
    out["errors"] = errs
    b.close()
    return out


def check(r, key):
    on = r["online"]
    assert r["exists"] and r["after_territory"], key
    e = r["empty"]
    assert "Run a prediction to build the cardiac signal trace." in e["msg"] and not e["hidden"], key
    assert e["vp"] == "—" and all(n == "—" for n in e["num"]) and e["seg"], (key, e)
    assert r["net_new_calls"] <= 1 and r["fetch_in_source"] is False, key
    for v in ("LAD", "RCA", "LCX"):
        s = r["seen"][v]
        assert s["sel"] == v and s["pressed"] == [v] and s["name"] == v, (key, v)
        assert s["vp"] == f"{round(PROBS[v] * 100)}%", (key, v, s["vp"])
        iv = IVS[v]
        assert s["range"] == f"Range {round(iv['lo']*100)}–{round(iv['hi']*100)}% (80% bootstrap) · {iv['range_label']}", (key, s["range"])
        assert s["tcount"] == f"{CNT[v]} typical myocardial segments" and s["segs"] == SEG[v], (key, v, s["tcount"], s["segs"])
        assert s["chip"] == v and s["vpanel"] == f"{v} selected", (key, v, s["chip"], s["vpanel"])
        assert s["terrSel"] == sorted(int(x) for x in SEG[v].split(" · ")), (key, v, s["terrSel"])
        assert s["tab"] and v in s["tab"], (key, v, s["tab"])
        assert "typical myocardial territory segments" in s["desc"] and f"Estimated probability {round(PROBS[v]*100)} percent" in s["desc"], (key, s["desc"])
        if on:
            exp = [x for x in sorted(records(v), key=lambda x: x["rank"]) if x["direction"] != "none"][:3]
            assert [x["label"] for x in s["rows"]] == [x["label"] for x in exp], (key, v, s["rows"])
            assert [x["num"] for x in s["rows"]] == [("+" if x["value"] > 0 else "-") + f"{abs(x['value']):.3f}" for x in exp], (key, v)
            assert [x["rk"] for x in s["rows"]] == [str(x["rank"]) for x in exp], key
            assert all(x["linked"] for x in s["rows"]), (key, v, s["rows"])
            assert all(("raises" in x["dir"]) or ("lowers" in x["dir"]) for x in s["rows"]), key
            assert "Top model contributors are" in s["desc"], key
        else:
            assert s["rows"] == [] or all(x["num"] in ("—",) for x in s["rows"]), (key, v, s["rows"])
    c = r["seen"]["CAD"]
    assert c["name"] == "Overall CAD" and c["vp"] == "52%" and "Overall estimate · territory mapping applies to individual vessels." in c["range"], (key, c)
    assert "Territory mapping applies to individual vessels" in c["tcount"] and c["segs"] == "", key
    if on:
        assert "SHAP attribution unavailable offline" not in r["required"], key
        for v in ("LAD", "RCA", "LCX"):
            assert "SHAP attribution unavailable" not in r["seen"][v]["noshap"], key
        assert r["chip_to_trace"] == ["LAD"] and r["vsel_to_trace"] == ["RCA"] and r["seg_to_trace"] == ["LCX"], (key, r["chip_to_trace"], r["vsel_to_trace"], r["seg_to_trace"])
        assert r["enter"]["sel"] == "LAD" and r["enter"]["chip"] == "LAD", key
        assert r["space"]["sel"] == "LCX" and r["space"]["chip"] == "LCX", key
        t = r["trace"]
        assert t["row"] and t["vessel"] and t["terr"] and t["hl"] == 1 and t["pressed"] == "true" and not t["msgHidden"], (key, t)
        assert t["msg"].startswith("Model trace: Age has a SHAP contribution of +0.182 for LAD. The vessel's estimated probability is 63%."), (key, t["msg"])
        assert "This does not identify a lesion." in t["msg"], key
        assert r["trace_calls_delta"] == 0 and r["v_unchanged_after_trace"] and r["v_unchanged_after_go"], key
        assert r["go"]["hl"] == 1 and r["go"]["inForm"], (key, r["go"])
        assert r["view"] == [1, 2, 7, 8, 13, 14, 17], (key, r["view"])
        assert r["calls_total_delta"] == 0, key
        assert "sensitivity" not in " ".join(x["dir"].lower() for x in r["seen"]["LAD"]["rows"]), key
    else:
        for v in ("LAD", "RCA", "LCX", "CAD"):
            s = r["seen"][v]
            assert "SHAP attribution unavailable offline." in s["noshap"] and "Real SHAP attribution needs the Python API." in s["noshap"], (key, v, s["noshap"])
            assert s["sensBtn"], key
            assert "+0." not in s["noshap"], key
            assert all(x["num"] == "—" for x in s["rows"]), (key, s["rows"])
        assert "Real SHAP attribution needs the Python API." in r["required"], key
    for s in ("Cardiac Signal Trace", "Model-linked · not lesion localization", "Model-linked explanation, not lesion localization.",
              "This trace connects patient inputs to model attribution and typical coronary territory. It does not identify a lesion, infarct size, or myocardium at risk.",
              "Decision support and educational use only; not a substitute for formal diagnostic imaging."):
        assert s in r["required"], (key, s)
    for bad in ("caused", "causes", "% infarct", "affected myocardium", "risk reduction", "lesion is located"):
        assert bad not in r["required"].lower(), (key, bad)
    assert r["seen"]["LAD"]["docX"] <= 1 and r["card_overflow"] == [], (key, r["seen"]["LAD"]["docX"], r["card_overflow"])
    assert not r["fab"].get("overlap"), (key, r["fab"])
    assert r["errors"] == [], (key, r["errors"])


if __name__ == "__main__":
    results = {}
    with sync_playwright() as p:
        for w, h in VPS:
            for theme in ("light", "dark"):
                results[f"{w}x{h}_{theme}_online"] = run_case(p, w, h, theme, True)
        results["1360x768_light_offline"] = run_case(p, 1360, 768, "light", False)
        results["390x844_dark_offline"] = run_case(p, 390, 844, "dark", False)
    failed = []
    for k, r in results.items():
        try:
            check(r, k)
            print("PASS", k, "card_w=%d" % r["card_w"])
        except AssertionError as ex:
            failed.append(k)
            print("FAIL", k, str(ex)[:400])
    raise SystemExit(1 if failed else 0)