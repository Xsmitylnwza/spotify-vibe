import csv,json,math,statistics,hashlib
from pathlib import Path
HERE=Path(__file__).resolve().parent
BASE=HERE.parents[1]/'p0'/'footprint-raw'
ROOT=HERE.parents[4]
def summary(path):
 rows=list(csv.DictReader(path.open(encoding='utf-8-sig',newline='')))
 assert rows
 def stats(key):
  a=[float(r[key]) for r in rows]
  return dict(avg=statistics.mean(a),p95=sorted(a)[math.ceil(.95*len(a))-1],max=max(a),min=min(a))
 for row in rows:
  assert abs(float(row['tree_cpu_percent'])-100*float(row['tree_cpu_delta_seconds'])/(float(row['interval_seconds'])*12))<1e-8
  assert abs(float(row['tree_cpu_percent'])-sum(p['cpu_percent'] for p in json.loads(row['per_process_json'])))<1e-8
 by={}
 names={p['name'] for row in rows for p in json.loads(row['per_process_json'])}
 for name in names:
  values=[json.loads(row['per_process_json']) for row in rows]
  by[name]={'cpu_avg':statistics.mean(sum(p['cpu_percent'] for p in v if p['name']==name) for v in values),'ws_avg':statistics.mean(sum(p['ws_mb'] for p in v if p['name']==name) for v in values)}
 return {'rows':len(rows),'elapsed':sum(float(r['interval_seconds']) for r in rows),'cpu':stats('tree_cpu_percent'),'ws':stats('working_set_mb'),'machine':stats('machine_cpu_percent'),'interval':stats('interval_seconds'),'processes':stats('process_count'),'per_process':by}
result={}
for mode,count in [('S1',120),('S6',36)]:
 before=summary(BASE/(mode+'.csv'));after=summary(HERE/(mode+'.csv'))
 assert after['rows']==count
 metadata=json.loads((HERE/(mode+'.metadata.json')).read_text(encoding='utf-8-sig'))
 assert metadata['error'] is None
 assert not metadata['electronRunItemPresent']
 assert metadata['isolationDirectoryRemoved']
 assert not any(c.get('stillSameIdentity') for c in metadata['cleanup'] if isinstance(c,dict))
 for name,digest in metadata['sourceHashes'].items():
  assert hashlib.sha256((HERE/(mode+'-source')/name).read_bytes()).hexdigest().upper()==digest
  if name in ['scripts/windows-apps.ps1','scripts/windows-apps.mjs','scripts/studio-server.mjs','scripts/app-presence.mjs']:
   assert hashlib.sha256((ROOT/name).read_bytes()).hexdigest().upper()==digest
 result[mode]={'before':before,'after':after,'cpu_reduction_percent':100*(1-after['cpu']['avg']/before['cpu']['avg'])}
 if mode=='S6':
  events=metadata['focusEvents']
  assert len(events)>=10
  failed=[e for e in events if not e['serverMatched'] or e['foregroundPid']!=e['requestedPid']]
  switches=[e for e in events if e['previousForegroundPid']!=e['requestedPid'] and e['serverMatched'] and e['foregroundPid']==e['requestedPid']]
  assert len(switches)>=10
  a=[e['latencyMs'] for e in switches]
  result['focus_latency']={'switches':len(a),'attempts':len(events),'failed_observations':failed,'avg_ms':statistics.mean(a),'p95_ms':sorted(a)[math.ceil(.95*len(a))-1],'max_ms':max(a),'all_under_1s':all(x<=1000 for x in a)}
def latency(directory):
 metadata=json.loads((directory/'S6.metadata.json').read_text(encoding='utf-8-sig'))
 assert metadata['error'] is None and metadata['isolationDirectoryRemoved'] and not metadata['electronRunItemPresent']
 assert not any(c.get('stillSameIdentity') for c in metadata['cleanup'] if isinstance(c,dict))
 events=metadata['focusEvents']
 valid=[e for e in events if e['serverMatched'] and e['foregroundPid']==e['requestedPid'] and e['previousForegroundPid']!=e['requestedPid']]
 assert len(valid)>=10
 values=[e['latencyMs'] for e in valid]
 launch=json.loads((directory/'launch-latency.json').read_text(encoding='utf-8-sig'))
 assert len(launch['events'])==3 and not any(c['stillSameIdentity'] for c in launch['cleanup'])
 def distribution(values):
  present=[v for v in values if v is not None]
  return {'n':len(present),'avg_ms':statistics.mean(present),'p95_ms':sorted(present)[math.ceil(.95*len(present))-1],'max_ms':max(present),'timeouts':len(values)-len(present)}
 return {'focus':{'valid_switches':len(valid),'attempts':len(events),'failed_observations':[e for e in events if not e['serverMatched'] or e['foregroundPid']!=e['requestedPid']],**distribution(values),'under_1s':sum(v<=1000 for v in values)},'launch_running':distribution([e['runningLatencyMs'] for e in launch['events']]),'launch_selected':distribution([e['selectedLatencyMs'] for e in launch['events']]),'exit':distribution([e['exitLatencyMs'] for e in launch['events']]),'launch_events':launch['events']}
pre=HERE/'pre-p4-latency'
manifest=json.loads((HERE/'pre-p4-source.json').read_text(encoding='utf-8-sig'))
metadata=json.loads((pre/'S6.metadata.json').read_text(encoding='utf-8-sig'))
for name,digest in metadata['sourceHashes'].items():
 assert manifest['hashes'][name].upper()==digest
 assert hashlib.sha256((pre/'S6-source'/name).read_bytes()).hexdigest().upper()==digest
result['latency_comparison']={'before_pre_p4_head':latency(pre),'after_final':latency(HERE),'before_machine':summary(pre/'S6.csv')['machine']}
result['native_only_s1_prior']=summary(HERE/'pre-legacy-alias-fix'/'S1.csv')
result['synchronous_cached_prior_latency']=latency(HERE/'pre-async-correction')
fault=json.loads((HERE/'async-scan-probe.json').read_text(encoding='utf-8-sig'))
assert fault.get('error') is None and fault['recovered'] and fault['timeoutExitCode']==1 and fault['focusDeliveredBeforeTimeout'] and not fault['livePidsAtRecheck']
assert fault['sourceSha256']==hashlib.sha256((ROOT/'scripts/windows-apps.ps1').read_bytes()).hexdigest()
result['fault_probe']={k:fault[k] for k in ['foregroundDuringBlockedScanMs','deliveryToTimeoutMs','timeoutExitCode','recovered','livePidsAtRecheck']}
(HERE/'summary.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
print(json.dumps(result,indent=2))
