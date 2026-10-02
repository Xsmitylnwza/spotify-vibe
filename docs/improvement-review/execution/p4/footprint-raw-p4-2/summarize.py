import csv
import json
import statistics
from pathlib import Path

HERE = Path(__file__).resolve().parent
BASELINE = HERE.parents[1] / 'p0' / 'footprint-raw' / 'S5.csv'

def read(path):
    with path.open(encoding='utf-8-sig', newline='') as source:
        rows = list(csv.DictReader(source))
    assert len(rows) == 120, (path, len(rows))
    result = {'rows': len(rows)}
    for field in ['working_set_mb', 'private_mb', 'tree_cpu_percent', 'interval_seconds']:
        values = [float(row[field]) for row in rows]
        result[field] = {'avg': statistics.mean(values), 'max': max(values), 'min': min(values)}
    result['elapsed_seconds'] = sum(float(row['interval_seconds']) for row in rows)
    result['first'] = rows[0]['timestamp']
    result['last'] = rows[-1]['timestamp']
    electron = {'ws': [], 'private': [], 'count': []}
    for row in rows:
        parts = json.loads(row['per_process_json'])
        for field, total in [('ws_mb', 'working_set_mb'), ('private_mb', 'private_mb')]:
            assert abs(sum(part[field] for part in parts) - float(row[total])) < 0.001
        items = [part for part in parts if part['name'] == 'electron.exe']
        electron['ws'].append(sum(part['ws_mb'] for part in items))
        electron['private'].append(sum(part['private_mb'] for part in items))
        electron['count'].append(len(items))
    result['electron'] = {key: {'avg': statistics.mean(values), 'max': max(values), 'min': min(values)} for key, values in electron.items()}
    result['tree_count_first_last'] = [int(rows[0]['process_count']), int(rows[-1]['process_count'])]
    for previous, current in zip(rows, rows[1:]):
        lost = set(previous['tree_pids'].split(';')) - set(current['tree_pids'].split(';'))
        if lost:
            result['first_process_exit'] = {
                'before': previous['timestamp'], 'after': current['timestamp'],
                'lost_pids': sorted(lost),
                'tree_ws_drop_mb': float(previous['working_set_mb']) - float(current['working_set_mb']),
                'tree_private_drop_mb': float(previous['private_mb']) - float(current['private_mb']),
                'lost_parts_previous_row': [part for part in json.loads(previous['per_process_json']) if str(part['pid']) in lost],
            }
            break
    return result

result = {'before': read(BASELINE), 'after': read(HERE / 'S5.csv')}
with (HERE / 'reopen.csv').open(encoding='utf-8-sig') as source:
    latency = [float(row['visible_ms']) for row in csv.DictReader(source)]
assert len(latency) >= 5
result['reopen_ms'] = {'samples': latency, 'avg': statistics.mean(latency), 'max': max(latency), 'min': min(latency)}
(HERE / 'summary.json').write_text(json.dumps(result, indent=2), encoding='utf-8')
for label, values in result.items():
    print(label, json.dumps(values))
