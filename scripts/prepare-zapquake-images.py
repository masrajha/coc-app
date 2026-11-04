"""Download pinned target artwork and the supplied Fireball icon as small local WebP assets."""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.request import Request, urlopen
from PIL import Image
import io
import json
import hashlib

ROOT = Path(__file__).resolve().parents[1]
COMMIT = '431f8da169ba93b730d182dfec0ca4820998db0d'
FIREBALL = 'https://static.wikia.nocookie.net/clashofclans/images/4/49/Fireball_Equipment.png/revision/latest/scale-to-width-down/200?cb=20240311163556'
OUT = ROOT / 'public/assets/images/zapquake'

def main():
    manifest = json.loads((ROOT / 'public/assets/data/zapquake/manifest.json').read_text())
    data = json.loads((ROOT / 'public/assets/data/zapquake' / manifest['dataset']).read_text())
    tree = json.loads((ROOT / 'data/zapquake-source/tree.json').read_text(encoding='utf-8-sig'))
    assert tree['sha'] == COMMIT
    paths = [item['path'] for item in tree['tree'] if item['path'].endswith('.png')]
    jobs = []
    for target in data['buildings']:
        if target['id'] == 'town-hall':
            continue  # Existing local level-specific Town Hall assets.
        for level in target['levels']:
            candidates = [p for p in paths if '/'+target['id']+'/' in p and p.endswith('/level-'+str(level['level'])+'.png')]
            candidates.sort(key=lambda p: ('/normal/' not in p, '/single-target/' not in p, '/stage-1/' not in p, p))
            if not candidates:
                raise ValueError('Missing artwork: '+target['id']+' '+str(level['level']))
            jobs.append((target['id']+'-'+str(level['level'])+'.webp', 'https://raw.githubusercontent.com/chiefpansancolt/clash-of-clans-data/'+COMMIT+'/'+candidates[0]))
    jobs.append(('fireball.webp', FIREBALL))
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / 'LICENSE.txt').write_bytes((ROOT / 'data/zapquake-source/LICENSE').read_bytes())
    def convert(job):
        name, url = job
        with urlopen(Request(url, headers={'User-Agent':'ClanIntel asset preparation'}), timeout=40) as response:
            raw = response.read(5_000_001)
        if len(raw) > 5_000_000:
            raise ValueError('Image exceeds size limit')
        with Image.open(io.BytesIO(raw)) as image:
            image = image.convert('RGBA')
            image.thumbnail((144,144), Image.Resampling.LANCZOS)
            image.save(OUT / name, 'WEBP', quality=82, method=6)
        output = (OUT / name).read_bytes()
        return {'file':name,'source':url,'bytes':len(output),'sha256':hashlib.sha256(output).hexdigest()}
    with ThreadPoolExecutor(max_workers=8) as pool:
        assets = list(pool.map(convert, jobs))
    (OUT / 'sources.json').write_text(json.dumps({'targetSourceCommit':COMMIT,'note':'Target artwork from the pinned clash-of-clans-data repository; Fireball supplied by the user from Clash of Clans Wiki. Game artwork belongs to Supercell.','assets':assets},indent=2)+'\n')
    print(str(len(assets))+' images; '+str(sum(a['bytes'] for a in assets))+' bytes total')

if __name__ == '__main__':
    main()
