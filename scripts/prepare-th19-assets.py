"""Prepare checksum-locked TH19 artwork as bounded local WebP files."""
import argparse
import hashlib
import io
import json
import re
from pathlib import Path
from urllib.request import Request, urlopen
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source-dir', type=Path, default=ROOT/'data/th19-artwork-source')
    parser.add_argument('--download', action='store_true')
    args = parser.parse_args()
    lock = json.loads((ROOT/'scripts/th19/artwork-lock.json').read_text(encoding='utf-8'))
    prepared = []
    for entry in lock['assets']:
        if not re.fullmatch(r'[A-Za-z0-9_]+\.png',entry['input']) or not re.fullmatch(r'(town-hall/th-19|zapquake/(spiky-tower|firecracker-tower)-[12]|th19/(guardian-shrine|squad-barracks|heroic-spell))\.webp',entry['output']):
            raise ValueError('Invalid artwork path')
        source = args.source_dir / entry['input']
        if not source.exists() and args.download:
            if not entry['source'].startswith('https://static.wikia.nocookie.net/clashofclans/images/'):
                raise ValueError('Unsupported artwork source')
            with urlopen(Request(entry['source'], headers={'User-Agent':'ClanIntel artwork importer'}), timeout=25) as response:
                raw = response.read(5000001)
            if len(raw) != entry['sourceBytes'] or hashlib.sha256(raw).hexdigest() != entry['sourceSha256']:
                raise ValueError('Downloaded artwork checksum mismatch: '+entry['input'])
            source.parent.mkdir(parents=True, exist_ok=True)
            source.write_bytes(raw)
        raw = source.read_bytes()
        if len(raw) != entry['sourceBytes'] or hashlib.sha256(raw).hexdigest() != entry['sourceSha256']:
            raise ValueError('Artwork checksum mismatch: '+entry['input'])
        with Image.open(io.BytesIO(raw)) as image:
            image = image.convert('RGBA')
            image.thumbnail((lock['maxDimension'],lock['maxDimension']), Image.Resampling.LANCZOS)
            buffer = io.BytesIO()
            image.save(buffer, 'WEBP', quality=lock['quality'], method=6)
            content = buffer.getvalue()
            if len(content) > 24000:
                raise ValueError('Artwork exceeds per-file budget')
            prepared.append((entry,content,list(image.size)))
    # Validate the whole batch before replacing any application asset.
    result = []
    for entry, content, size in prepared:
        path = ROOT/'public/assets/images'/entry['output']
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(content)
        result.append({**entry,'bytes':len(content),'sha256':hashlib.sha256(content).hexdigest(),'dimensions':size})
    total = sum(entry['bytes'] for entry in result)
    manifest = {'version':lock['version'],'reviewedAt':lock['reviewedAt'],
                'attribution':'Game artwork belongs to Supercell; downloaded from Clash of Clans Wiki. Source hashes are locked before compression.',
                'maxDimension':lock['maxDimension'],'totalBytes':total,'assets':result,'pending':lock['pending']}
    (ROOT/'public/assets/images/th19/sources.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
    print(f'Prepared {len(result)} local WebP assets, {total} bytes total.')


if __name__ == '__main__':
    main()
