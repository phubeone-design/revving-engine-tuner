#!/usr/bin/env python3
"""Check snapshot completeness, references and predicted control consistency."""
import json, math, re, sys
from pathlib import Path

def main():
    root=Path(sys.argv[1] if len(sys.argv)>1 else Path(__file__).resolve().parents[1])
    load=lambda p:json.loads((root/p).read_text(encoding='utf-8'))
    manifest=load('data/manifest.json'); controls=load('data/controls.json')['controls']; index=load('data/engines.json')['engines']; hidden=load('data/hidden-engines.json')['engines']; ids={c['id']:c for c in controls}
    assert len(ids)==len(controls)==manifest['tune_control_count']
    assert len(index)==manifest['visible_engine_count']
    assert len(hidden)==manifest['hidden_engine_count']
    assert len({e['id'] for e in index})==len(index)
    assert len(list((root/'data/engines').glob('*.json')))==len(index), 'Orphaned or missing engine files'
    for e in index:
        p=load(e['file']); assert p['name']==e['name'] and p['id']==e['id'] and p['visible_in_picker']
        for k in ['tune_defaults_fresh_session','rendered_control_values_fresh_session','effective_tune_defaults_fresh_session']:
            assert set(p[k])==set(ids), (e['name'],k)
        for key,value in p['rendered_control_values_fresh_session'].items():
            c=ids[key]
            if c['type']=='range':
                assert c['min']-1e-8<=value<=c['max']+1e-8,(e['name'],key,value)
                assert math.isclose((value-c['min'])/c['step'],round((value-c['min'])/c['step']),abs_tol=1e-6),(e['name'],key,'step')
            if c['type']=='select' and value is not None: assert value in [x['value'] for x in c['options']]
        for key,diff in p['source_vs_control_differences'].items():
            assert diff['source']==p['tune_defaults_fresh_session'][key] and diff['control']==p['rendered_control_values_fresh_session'][key] and diff['source']!=diff['control']
        if p['open_air']: assert p['effective_tune_defaults_fresh_session']['cabin']==0
    assert all(not p['visible_in_picker'] for p in hidden)
    assert all(re.fullmatch('[0-9a-f]{64}',v) for v in manifest['sha256'].values())
    print(f'Validated {len(index)} selectable engines, {len(hidden)} hidden definitions, {len(controls)} controls and all file references.')
if __name__=='__main__': main()
