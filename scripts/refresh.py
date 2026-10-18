#!/usr/bin/env python3
"""Extract published preset data without executing upstream JavaScript.
Requires Python 3.10+ and beautifulsoup4. Writes a reviewable snapshot.
"""
import argparse, datetime, hashlib, json, math, re, urllib.request
from pathlib import Path
from bs4 import BeautifulSoup
URL = 'https://keir.is/revving'
class LiteralParser:
    def __init__(self, text, pos=0, refs=None):
        self.s, self.i, self.refs = text, pos, refs or {}
    def ws(self):
        while self.i < len(self.s) and self.s[self.i].isspace(): self.i += 1
    def take(self, text):
        self.ws()
        if not self.s.startswith(text, self.i): raise ValueError(f'Expected {text} at {self.i}')
        self.i += len(text)
    def value(self):
        self.ws(); c = self.s[self.i]
        if c == '{':
            self.i += 1; out = {}
            while True:
                self.ws()
                if self.s[self.i] == '}': self.i += 1; return out
                if self.s.startswith('...', self.i):
                    self.i += 3; key = self.ident()
                    if key not in self.refs: raise ValueError(f'Unknown spread {key}')
                    out.update(self.refs[key])
                else:
                    key = self.string() if self.s[self.i] == '"' else self.ident()
                    self.take(':'); out[key] = self.value()
                self.ws()
                if self.s[self.i] == '}': continue
                self.take(',')
        if c == '[':
            self.i += 1; out = []
            while True:
                self.ws()
                if self.s[self.i] == ']': self.i += 1; return out
                out.append(self.value()); self.ws()
                if self.s[self.i] == ']': continue
                self.take(',')
        if c == '"': return self.string()
        if self.s.startswith('!0', self.i): self.i += 2; return True
        if self.s.startswith('!1', self.i): self.i += 2; return False
        m = re.match(r'-?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?', self.s[self.i:])
        if m:
            self.i += len(m[0]); n = float(m[0]); return int(n) if n.is_integer() else n
        raise ValueError(f'Unsupported literal at {self.i}: {self.s[self.i:self.i+60]}')
    def ident(self):
        self.ws(); m = re.match(r'[A-Za-z_$][\w$]*', self.s[self.i:])
        if not m: raise ValueError(f'Expected identifier at {self.i}')
        self.i += len(m[0]); return m[0]
    def string(self):
        self.take('"'); start = self.i - 1
        while True:
            if self.s[self.i] == '\\': self.i += 2; continue
            if self.s[self.i] == '"': self.i += 1; break
            self.i += 1
        text = self.s[start:self.i]
        text = re.sub(r'\\x([0-9a-fA-F]{2})', lambda m: '\\u00' + m[1], text)
        return json.loads(text)
def literal(text, marker, refs=None):
    m = re.search(marker, text)
    if not m: raise ValueError(f'Upstream structure changed: {marker}')
    return LiteralParser(text, m.end(), refs).value()
def fetch(url):
    with urllib.request.urlopen(url, timeout=45) as r:
        if r.status != 200: raise ValueError(f'HTTP {r.status}: {url}')
        return r.read().decode('utf-8')
def slug(text):
    return re.sub(r'[^a-z0-9]+', '-', text.lower()).strip('-')
def write(root, name, value):
    p = root / name; p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
def slider_value(v, c):
    if c['type'] not in ('range','number'): return v
    lo, hi, step = c.get('min'), c.get('max'), c.get('step')
    if c['type'] == 'number': return v
    v = min(hi, max(lo, v))
    if step: v = lo + math.floor((v-lo)/step + .5 + 1e-9)*step
    return round(min(hi, max(lo, v)), 8)
def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--output', default=str(Path(__file__).resolve().parents[1])); ap.add_argument('--source-dir', help='Use page.html, app.js and data.js fixtures offline'); args = ap.parse_args()
    root = Path(args.output); fixture = Path(args.source_dir) if args.source_dir else None
    html = (fixture/'page.html').read_text() if fixture else fetch(URL)
    soup = BeautifulSoup(html, 'html.parser'); srcs = [x['src'] for x in soup.find_all('script',src=True)]
    app_url = 'https://keir.is' + next(x for x in srcs if '/revving/page-' in x)
    data_url = 'https://keir.is' + next(x for x in srcs if '/2856-' in x)
    app = (fixture/'app.js').read_text() if fixture else fetch(app_url)
    data = (fixture/'data.js').read_text() if fixture else fetch(data_url)
    # Fail on source structure changes rather than guessing or executing arbitrary JS.
    common = literal(data, r'let h=\.06,d=')
    race = literal(data, r',u=')
    cars = literal(data, r',c=', {'d':common,'u':race})
    initial_sound = literal(app, r',w=(?=\{pops:)')
    switch_sound = literal(app, r'let N=(?=\{induction:)')
    controls = []
    for section in soup.select('#tunepanel section'):
        title = section.h3.get_text(' ',strip=True)
        for label in section.find_all('label'):
            el = label.find(['input','select'])
            if not el or not el.get('id'): continue
            out = {'id':el['id'],'section':title,'label':label.span.get_text(' ',strip=True) if label.span else label.get_text(' ',strip=True),'type':'select' if el.name=='select' else el.get('type','text')}
            for key in ('min','max','step'):
                if el.has_attr(key): out[key] = float(el[key])
            if el.name == 'select': out['options'] = [{'value':o.get('value'), 'label':o.get_text(' ',strip=True)} for o in el.find_all('option')]
            if el.get('type') == 'checkbox': out['html_initial'] = el.has_attr('checked')
            elif el.has_attr('value'): out['html_initial'] = float(el['value'])
            controls.append(out)
    byid = {c['id']:c for c in controls}
    state = re.search(r'd=\{\.\.\.p,gears:\[\.\.\.p.gears\]\},u=([^,]+),m=([^,]+),f=([^,]+),g=([^,]+),v=(\"[^\"]+\"),b=([^,]+),x=([^,]+),y=([^,]+),M=([^,]+),k=([^,]+),w=', app)
    if not state: raise ValueError('Initial app state changed; review source before refreshing')
    vals = [LiteralParser(x).value() for x in state.groups()]
    mic,body,room,tunnel,scene,tc,master,clip,cabin,wind = vals
    listening = dict(mic=mic,body=body,room=room,cabin=cabin,wind=wind,clip=clip,master=master)
    driver = {'autoclutch':byid['autoclutch']['html_initial'],'tc':tc}
    units = {'bankAngle':'degrees','redline':'rpm','idleRpm':'rpm','peakTorque':'Nm','headerLength':'m','collectorLength':'m','tailLength':'m','intakeLength':'m','valveRpm':'rpm','valveCold':'s','mass':'kg','popSpread':'ms'}
    for c in controls:
        c['unit'] = units.get(c['id'], 'choice' if c['type']=='select' else 'boolean' if c['type']=='checkbox' else 'simulator scalar (no UI unit)')
        if c['id']=='chamber': c['readout'] = 'round(343 / (2 * input)) Hz; input is an acoustic length-like scalar'
        if c['id']=='mic': c['readout'] = 'tail if <0.33; mixed if <0.66; otherwise bay'
    manifest = {'source_url':URL,'captured_at_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'source_assets':{'app':app_url,'presets':data_url},'sha256':{k:hashlib.sha256(v.encode()).hexdigest() for k,v in [('html',html),('app',app),('presets',data)]},'visible_engine_count':sum(not x.get('hidden',False) for x in cars),'hidden_engine_count':sum(bool(x.get('hidden')) for x in cars),'tune_control_count':len(controls),'schema_version':1}
    declared = re.search(r'(\d+) engines, no samples',html)
    if not declared or int(declared[1])!=manifest['visible_engine_count']: raise ValueError('Visible engine count does not match page metadata')
    records=[]
    for p in cars:
        sound = {**initial_sound,**switch_sound,**p.get('sound',{})}
        values = {**{k:p[k] for k in byid if k in p}, **{k:v for k,v in sound.items() if k in byid}, **listening,**driver}
        missing = set(byid)-set(values)
        if missing: raise ValueError(f'Missing defaults {p["name"]}: {missing}')
        ui = {k:slider_value(v,byid[k]) for k,v in values.items()}
        # O() does not refresh flutter controls on selection/startup, though sound overrides take effect.
        for k in ['flRate','flPitch','flPitchEnd','flDur','flHiss','flLevel']: ui[k]=byid[k]['html_initial']
        if p['layout']=='inline' and p['crank']=='shared': ui['crank']='even'
        if p['layout'] not in [x['value'] for x in byid['layout']['options']]: ui['layout']=None
        effective = dict(values)
        if p.get('openAir'): effective['cabin']=0
        effective['wind'] *= p.get('sound',{}).get('wind',1)
        records.append({'id':slug(p['name']),'name':p['name'],'visible_in_picker':not p.get('hidden',False),'source_preset':p,'resolved_sound_fresh_session':sound,'tune_defaults_fresh_session':values,'effective_tune_defaults_fresh_session':effective,'rendered_control_values_fresh_session':ui,'source_vs_control_differences':{k:{'source':v,'control':ui[k]} for k,v in values.items() if v!=ui[k]},'disabled_controls':['bankAngle'] if p['layout']!='v' else [],'open_air':bool(p.get('openAir'))})
        if p.get('openAir'): records[-1]['disabled_controls'].append('cabin')
    # App uses localeCompare; a stable ASCII-insensitive index is sufficient for lookup.
    records.sort(key=lambda p:p['name'].casefold())
    write(root,'data/manifest.json',manifest)
    write(root,'data/controls.json',{'controls':controls,'global_controls':{'volume':{'min':0,'max':1,'step':.01,'default':1,'persistent':True},'tunnel':tunnel,'scene':scene},'listening_initial':listening,'driver_initial':driver,'sound_initial':initial_sound,'sound_reset_on_engine_switch':switch_sound,'sound_fields_not_reset_on_engine_switch':sorted(set(initial_sound)-set(switch_sound))})
    write(root,'data/engines.json',{'engines':[{'id':x['id'],'name':x['name'],'file':'data/engines/'+x['id']+'.json','cylinders':x['source_preset']['cylinders'],'layout':x['source_preset']['layout'],'crank':x['source_preset']['crank'],'induction':x['resolved_sound_fresh_session']['induction'],'redline':x['source_preset']['redline']} for x in records if x['visible_in_picker']]})
    write(root,'data/hidden-engines.json',{'engines':[x for x in records if not x['visible_in_picker']]})
    for x in records:
        if x['visible_in_picker']: write(root,'data/engines/'+x['id']+'.json',x)
    lines=['# Current engine picker','','Captured from the published simulator assets; see [manifest](../data/manifest.json). Hidden definitions are excluded.','','| Engine | Layout | Crank | Induction | Redline | Defaults |','| --- | --- | --- | --- | --- | --- |']
    for x in records:
        if not x['visible_in_picker']: continue
        p=x['source_preset'];lines.append(f'| {p["name"]} | {p["layout"]} {p["cylinders"]} | {p["crank"]} | {x["resolved_sound_fresh_session"]["induction"]} | {p["redline"]} | [JSON](../data/engines/{x["id"]}.json) |')
    (root/'docs').mkdir(exist_ok=True);(root/'docs/engines.md').write_text('\n'.join(lines)+'\n')
    lines=['# Tune controls','','All tune-pane controls from published HTML. Preset values may exceed slider limits; see [semantics](semantics.md).','','| Section | Label | ID | Type | Range / choices | Step | Unit / readout |','| --- | --- | --- | --- | --- | --- | --- |']
    for c in controls:
        choices='; '.join(f'{x["value"]}: {x["label"]}' for x in c.get('options',[])) if c['type']=='select' else f'{c.get("min", "")} to {c.get("max", "")}' if c['type'] in ('range','number') else 'true / false'
        lines.append(f'| {c["section"]} | {c["label"]} | `{c["id"]}` | {c["type"]} | {choices} | {c.get("step", "")} | {c.get("readout",c["unit"])} |')
    (root/'docs/controls.md').write_text('\n'.join(lines)+'\n')
    assert len({x['id'] for x in records})==len(records), 'Duplicate engine slugs'
    print(json.dumps(manifest,indent=2));print('Snapshot validated:',len(records),'definitions;',len(controls),'controls')
if __name__=='__main__': main()
