"""Offline TH19 baseline audit. Never activates or downloads application data.

Run from the repository root: python scripts/audit-th19.py
The checked-in baseline is immutable; a changed manifest requires a new audit.
"""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'audits/th19'


def read(path):
    return json.loads(path.read_text(encoding='utf-8'))


def checksum(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    baseline = read(OUT / 'baseline.json')
    manifest_path = ROOT / 'public/assets/data/zapquake/manifest.json'
    lock_path = ROOT / 'scripts/zapquake/source-lock.json'
    frozen_manifest_path = OUT / 'manifest.before.json'
    # The immutable baseline survives later, deliberately published releases.
    # The saved JSON is re-encoded for readability, so verify its dataset hash below.
    assert checksum(lock_path) == baseline['sourceLockSha256'], 'Source lock changed; review the baseline first.'
    active_manifest = read(manifest_path)
    active_path = manifest_path.parent / active_manifest['dataset']
    assert checksum(active_path) == active_manifest['sha256'], 'Active dataset checksum mismatch.'
    manifest = read(frozen_manifest_path)
    dataset_path = manifest_path.parent / manifest['dataset']
    assert checksum(dataset_path) == manifest['sha256'] == baseline['datasetSha256'], 'Dataset checksum mismatch.'
    dataset = read(dataset_path)
    changes = read(OUT / 'announced-changes.json')
    indexed = {}
    rows = []
    for category in ['buildings', 'heroes', 'spells', 'equipment']:
        for item in dataset[category]:
            indexed[item['id']] = item
            levels = item['levels']
            fields = sorted({field for level in levels for field in level})
            # Null values remain missing; presence of a key is not verification.
            coverage = {field: sum(level.get(field) is not None for level in levels) for field in fields}
            rows.append({'category': category, 'id': item['id'], 'baselineMax': max(level['level'] for level in levels),
                         'sourceFile': item['sourceFile'], 'sourceRevision': dataset['source']['revision'],
                         'levelCount': len(levels), 'fieldCoverage': coverage,
                         'th19Status': 'unverified', 'note': 'Existing rows do not establish post-update TH19 coverage.'})
    for name, levels in dataset['requirements'].items():
        rows.append({'category': 'requirements', 'id': name, 'baselineMax': max(row['level'] for row in levels),
                     'th19Status': 'unverified', 'sourceRevision': dataset['source']['revision']})
    diff = []
    for change in changes['items']:
        item = indexed.get(change['id'])
        old = max(row['level'] for row in item['levels']) if item else None
        status = 'missing' if item is None else 'conflict' if old != change.get('maxLevel') else 'unverified'
        diff.append({**change, 'baselineMax': old, 'status': status,
                     'provenance': changes['source'], 'simulationReady': False})
    report = {'auditVersion': 1, 'reviewedAt': baseline['reviewedAt'], 'baseline': baseline,
              'scope': 'All active dataset categories plus announced changes; not a complete upstream game-data import.',
              'statuses': {'available': 'Source explicitly provides this field; not automatically simulation-ready.',
                           'missing': 'Absent from active normalized dataset.', 'conflict': 'Announced cap differs from active cap.',
                           'unverified': 'No post-update verification; unchanged is not assumed.'},
              'categoriesNotInBaseline': ['troops', 'pets', 'squads', 'guardians', 'traps', 'walls'],
              'baselineInventory': rows, 'announcedDiff': diff,
              'otherAnnouncedChanges': changes['otherChanges'],
              'upstreamFileDiff': read(OUT / 'upstream-diff.json'),
              'runtimeBaselineBefore': {'homeProgress': 'TH18 used global API maxima; other THs used a partial TH11-17 fallback.',
                                        'zapquakeMaxTownHall': 18,
                                        'rules': 'No modifier or historical Ranked/CWL rules activated by this phase.'},
              'liveTh19Fixture': 'pending: no TH19 response found in the inspected local cache',
              'activeZapquakeVersion': active_manifest['dataVersion'],
              'activation': 'Audit is read-only; original baseline remains immutable.'}
    (OUT / 'report.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print(f'Audited {len(rows)} baseline entities and {len(diff)} announced changes. Frozen baseline preserved; audit does not activate data.')


if __name__ == '__main__':
    main()
