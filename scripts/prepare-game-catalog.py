"""Build a pinned, immutable game catalog. Python is needed only at build time."""
import argparse
import copy
import hashlib
import json
import os
import re
import tempfile
from concurrent.futures import ThreadPoolExecutor
from urllib.request import Request, urlopen
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GROUPS = {'heroes':'heroes', 'troops':'troops', 'siege-machines':'troops', 'spells':'spells',
          'pets':'pets', 'hero-equipment':'heroEquipment'}


def load(path):
    return json.loads(path.read_text(encoding='utf-8'))


def body(data):
    return (json.dumps(data, ensure_ascii=False, sort_keys=True, separators=(',', ':')) + '\n').encode('utf-8')


def atomic(path, raw):
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temp = tempfile.mkstemp(dir=path.parent)
    try:
        with os.fdopen(fd, 'wb') as stream:
            stream.write(raw)
        os.replace(temp, path)
    finally:
        if os.path.exists(temp):
            os.unlink(temp)


def verified_sources(lock, source):
    if lock['repository'] != 'https://github.com/chiefpansancolt/clash-of-clans-data' or not re.fullmatch('[a-f0-9]{40}', lock['revision']):
        raise ValueError('Unsupported source')
    result = {}
    for entry in lock['files']:
        name = entry['path']
        if not re.fullmatch(r'(LICENSE|package\.json|data/home/[a-z-]+/[a-z0-9-]+\.json)', name) or name in result:
            raise ValueError('Invalid or duplicate source path')
        raw = (source / name).read_bytes()
        if len(raw) != entry['bytes'] or hashlib.sha256(raw).hexdigest() != entry['sha256']:
            raise ValueError('Source checksum mismatch: ' + name)
        result[name] = raw
    license_text = result['LICENSE'].decode()
    if 'MIT License' not in license_text or 'Christopher Pezza' not in license_text:
        raise ValueError('Source license mismatch')
    return result


def download(lock, source):
    if lock['repository'] != 'https://github.com/chiefpansancolt/clash-of-clans-data' or not re.fullmatch('[a-f0-9]{40}', lock['revision']):
        raise ValueError('Unsupported download source')
    def fetch(entry):
        name = entry['path']
        if not re.fullmatch(r'(LICENSE|package\.json|data/home/[a-z-]+/[a-z0-9-]+\.json)', name) or not 0 < entry['bytes'] <= 2097152:
            raise ValueError('Invalid locked file')
        path = source / name
        if path.exists() and hashlib.sha256(path.read_bytes()).hexdigest() == entry['sha256']:
            return
        url = 'https://raw.githubusercontent.com/chiefpansancolt/clash-of-clans-data/' + lock['revision'] + '/' + name
        with urlopen(Request(url, headers={'User-Agent':'ClanIntel pinned catalog importer'}), timeout=30) as response:
            raw = response.read(2097153)
        if len(raw) != entry['bytes'] or hashlib.sha256(raw).hexdigest() != entry['sha256']:
            raise ValueError('Downloaded checksum mismatch: ' + name)
        atomic(path, raw)
    with ThreadPoolExecutor(max_workers=6) as pool:
        list(pool.map(fetch, lock['files']))


def build(lock, source, overlay=None):
    files = verified_sources(lock, source)
    raw_items = {json.loads(raw)['id']: (path, json.loads(raw)) for path, raw in files.items() if path.startswith('data/')}
    if len(raw_items) != sum(path.startswith('data/') for path in files):
        raise ValueError('Duplicate source item ID')
    for identity, (path, raw) in raw_items.items():
        if raw.get('base') != 'home' or Path(path).stem != identity:
            raise ValueError('Source identity mismatch: ' + path)
    inventory = {category:sum(GROUPS.get(path.split('/')[2]) == category for path, raw in raw_items.values()) for category in ['heroes','troops','spells','pets']}
    complete_inventory = bool(lock.get('completeCapInventory')) and inventory == lock.get('completeCapInventory')
    requirements = {key: raw_items[key][1]['levels'] for key in ['hero-hall', 'blacksmith', 'laboratory', 'pet-house']}
    conflicts = []
    items = []
    for identity, (path, raw) in sorted(raw_items.items()):
        group = path.split('/')[2]
        category = GROUPS.get(group, 'reference')
        if category == 'reference':
            category = group
        rows = []
        charges = []
        for row in raw.get('levels', []):
            if row.get('supercharge'):
                charges.append({'step':row['level'], 'sourceHitpoints':row.get('hitpoints'), 'status':'unverified-base-binding'})
                continue
            selected = {k: row[k] for k in ['level', 'townHallRequired', 'laboratoryRequired', 'heroHallLevelRequired',
                                         'petHouseLevelRequired', 'blacksmithLevelRequired', 'hitpoints', 'damage',
                                         'damagePerSecond', 'buildingDamagePercent', 'troopDamagePercent'] if k in row}
            if not isinstance(selected.get('level'), int) or selected['level'] < 1:
                raise ValueError('Invalid source level: ' + identity)
            selected['sourceId'] = 'upstream'
            rows.append(selected)
        caps = {}
        for th in range(1, 19):
            eligible = []
            unlocked = True
            for row in rows:
                if identity == 'town-hall':
                    ok = row['level'] == th
                else:
                    ok = row.get('townHallRequired', 1) <= th
                for field, requirement in [('heroHallLevelRequired', 'hero-hall'), ('laboratoryRequired', 'laboratory'),
                                           ('petHouseLevelRequired', 'pet-house'), ('blacksmithLevelRequired', 'blacksmith')]:
                    needed = row.get(field)
                    if needed is not None:
                        available = max((r['level'] for r in requirements[requirement] if r['townHallRequired'] <= th), default=0)
                        ok = ok and needed <= available
                if category == 'heroEquipment':
                    hero = raw_items.get(raw.get('hero'), (None, {}))[1]
                    hall = max((r['level'] for r in requirements['hero-hall'] if r['townHallRequired'] <= th), default=0)
                    unlocked = any(r.get('heroHallLevelRequired', 99) <= hall for r in hero.get('levels', []))
                    smith = [r for r in requirements['blacksmith'] if r['townHallRequired'] <= th]
                    rarity_cap = smith[-1].get('maxEquipmentLevel', {}).get(raw.get('rarity', '').lower(), 0) if smith else 0
                    ok = ok and unlocked and row['level'] <= rarity_cap
                if ok:
                    eligible.append(row['level'])
            counts = raw.get('availablePerTownHall')
            availability = next((r for r in counts or [] if r['townHallLevel'] == th), None)
            if counts is not None and (availability is None or availability.get('countAfterMerges', availability.get('count', 0)) == 0):
                eligible = []
            if eligible:
                caps[str(th)] = {'maxLevel':max(eligible), 'sourceId':'upstream', 'exactMatch':True, 'status':'verified-requirements'}
        items.append({'id':identity, 'apiName':raw['name'], 'category':category, 'village':'home', 'sourceFile':path,
                      'hero':raw.get('hero'), 'levels':rows, 'caps':caps, 'supercharges':charges,
                      'availability':raw.get('availablePerTownHall', []), 'simulationReady':False})
        if category == 'heroes':
            camel = identity.split('-')[0] + ''.join(part.title() for part in identity.split('-')[1:])
            for row in requirements['hero-hall']:
                actual = max((r['level'] for r in rows if r.get('heroHallLevelRequired', 99) <= row['level']), default=0)
                summary = row.get('heroLevelCaps', {}).get(camel)
                if summary is not None and summary != actual:
                    conflicts.append({'id':identity, 'heroHall':row['level'], 'summaryCap':summary, 'levelRequirementsCap':actual,
                                      'resolution':'Use individual level requirements; keep summary discrepancy in audit.'})
    catalog = {'schemaVersion':1, 'dataVersion':lock['dataVersion'], 'reviewedAt':lock['reviewedAt'], 'maxTownHall':18,
               'sources':{'upstream':{'repository':lock['repository'], 'revision':lock['revision'], 'license':'MIT'}},
               'coverage':{'completeTownHalls':list(range(1, 19)) if complete_inventory else [], 'simulationReady':False}, 'items':items,
               'audit':{'requirementConflicts':conflicts, 'sourceFiles':len(files)}}
    if overlay:
        apply_overlay(catalog, overlay)
    validate(catalog)
    return catalog, files['LICENSE']


def apply_overlay(catalog, overlay):
    catalog['maxTownHall'] = 19
    catalog['sources']['official-th19'] = {'url':overlay['source'], 'reviewedAt':overlay['reviewedAt'],
                                           'effectiveAt':None, 'sha256':hashlib.sha256(body(overlay)).hexdigest()}
    indexed = {item['id']:item for item in catalog['items']}
    for update in overlay['items']:
        item = indexed.get(update['id'])
        if item is None:
            item = {'id':update['id'], 'apiName':update['apiName'], 'category':update['category'], 'village':'home',
                    'sourceFile':None, 'hero':None, 'levels':[], 'caps':{}, 'supercharges':[], 'availability':[], 'simulationReady':False}
            indexed[item['id']] = item
        for th, maximum in update.get('caps', {}).items():
            item['caps'][th] = {'maxLevel':maximum, 'sourceId':'official-th19', 'exactMatch':True, 'status':'verified-announcement'}
        # Unknown HP/damage stay null. A cap announcement is not a complete level-stat record.
        for row in update.get('levels', []):
            before = next((r for r in item['levels'] if r['level'] == row['level']), None)
            if before is None:
                item['levels'].append({'hitpoints':None, 'damage':None, **row, 'sourceId':'official-th19'})
            else:
                before.update(row)
                before['fieldSources'] = {key:'official-th19' for key in row if key != 'level'}
        for th, count in update.get('counts', {}).items():
            item['availability'] = [r for r in item['availability'] if r['townHallLevel'] != int(th)]
            item['availability'].append({'townHallLevel':int(th), 'count':count, 'sourceId':'official-th19'})
        if update.get('superchargesRemoved'):
            for charge in item['supercharges']:
                charge['status'] = 'removed-in-th19-update'
                charge['sourceId'] = 'official-th19'
        if update.get('note'):
            item['note'] = update['note']
    catalog['items'] = sorted(indexed.values(), key=lambda r:r['id'])
    catalog['audit']['pending'] = overlay['pending']


def validate(catalog):
    if catalog.get('schemaVersion') != 1 or not re.fullmatch('[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}', catalog.get('dataVersion', '')):
        raise ValueError('Invalid catalog identity')
    seen = set()
    for item in catalog['items']:
        if item['id'] in seen or not re.fullmatch('[a-z0-9-]+', item['id']) or not item['apiName']:
            raise ValueError('Invalid item identity')
        seen.add(item['id'])
        for th, cap in item['caps'].items():
            if not 1 <= int(th) <= catalog['maxTownHall'] or not isinstance(cap['maxLevel'], int) or not 0 < cap['maxLevel'] <= 300:
                raise ValueError('Invalid cap')
            if cap['sourceId'] not in catalog['sources']:
                raise ValueError('Unknown cap provenance')
        for row in item['levels']:
            for key in ['hitpoints', 'damage']:
                if row.get(key) is not None and (not isinstance(row[key], (int, float)) or row[key] < (1 if key == 'hitpoints' else 0)):
                    raise ValueError('Invalid statistic')


def publish(output, catalog, license_raw, activate=True):
    validate(catalog)
    raw = body(catalog)
    version = catalog['dataVersion']
    target = output / version
    manifest = {'schemaVersion':1, 'dataVersion':version, 'catalog':version+'/catalog.json',
                'sha256':hashlib.sha256(raw).hexdigest(), 'bytes':len(raw), 'license':version+'/LICENSE.txt',
                'licenseSha256':hashlib.sha256(license_raw).hexdigest(), 'simulationReady':False}
    contents = [('catalog.json', raw), ('LICENSE.txt', license_raw), ('release.json', body(manifest))]
    for filename, content in contents:
        path = target / filename
        if path.exists() and path.read_bytes() != content:
            raise ValueError('Immutable release differs; choose a new version: ' + version)
    for filename, content in contents:
        atomic(target / filename, content)
    if activate:
        atomic(output / 'manifest.json', body(manifest))
    return manifest


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source-dir', type=Path, default=ROOT/'data/game-catalog-source')
    parser.add_argument('--lock', type=Path, default=ROOT/'scripts/game-catalog/source-lock.json')
    parser.add_argument('--overlay', type=Path, default=ROOT/'scripts/game-catalog/th19-overlay.json')
    parser.add_argument('--output-dir', type=Path, default=ROOT/'public/assets/data/game-catalog')
    parser.add_argument('--report-dir', type=Path, default=ROOT/'audits/th19/catalog')
    parser.add_argument('--publish', action='store_true')
    parser.add_argument('--download', action='store_true', help='Download checksum-pinned public JSON sources; does not activate data.')
    parser.add_argument('--activate')
    args = parser.parse_args()
    if args.activate:
        if args.publish or args.download or not re.fullmatch('[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}', args.activate):
            raise ValueError('Invalid activation options')
        folder = args.output_dir / args.activate
        catalog = load(folder/'catalog.json')
        release = load(folder/'release.json')
        if catalog['dataVersion'] != args.activate or hashlib.sha256((folder/'catalog.json').read_bytes()).hexdigest() != release['sha256'] or hashlib.sha256((folder/'LICENSE.txt').read_bytes()).hexdigest() != release['licenseSha256']:
            raise ValueError('Release identity mismatch')
        publish(args.output_dir, catalog, (folder/'LICENSE.txt').read_bytes())
        print('Activated', args.activate)
        return
    lock, overlay = load(args.lock), load(args.overlay)
    if args.download:
        download(lock, args.source_dir)
    baseline, license_raw = build(lock, args.source_dir)
    baseline['dataVersion'] += '-baseline'
    catalog = copy.deepcopy(baseline)
    catalog['dataVersion'] = lock['dataVersion']
    apply_overlay(catalog, overlay)
    validate(catalog)
    before = {r['id']:r for r in baseline['items']}
    changes = [{'id':r['id'], 'before':before.get(r['id']), 'after':r} for r in catalog['items'] if r != before.get(r['id'])]
    report = {'dataVersion':catalog['dataVersion'], 'sourceRevision':lock['revision'], 'overlay':catalog['sources']['official-th19'],
              'entities':len(catalog['items']), 'changes':changes, 'conflicts':catalog['audit']['requirementConflicts'],
              'coverage':{str(th):{key:sum(str(th) in r['caps'] for r in catalog['items'] if r['category']==key)
                                  for key in ['heroes','troops','spells','pets','heroEquipment']} for th in [17,18,19]},
              'pending':overlay['pending'], 'zapquakeManifestChanged':False}
    atomic(args.report_dir/'report.json', body(report))
    atomic(args.report_dir/'catalog.preview.json', body(catalog))
    if args.publish:
        publish(args.output_dir, baseline, license_raw, activate=False)
        publish(args.output_dir, catalog, license_raw)
    print(('Published' if args.publish else 'Previewed'), catalog['dataVersion'], len(catalog['items']), 'entities;', len(changes), 'changes.')


if __name__ == '__main__':
    main()
