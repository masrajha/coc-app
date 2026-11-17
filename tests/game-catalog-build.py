"""Offline pipeline regressions using tiny sources, not the ignored download cache."""
import importlib.util
import json
import hashlib
import sys
import tempfile
import unittest
from pathlib import Path

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('catalog_builder', ROOT/'scripts/prepare-game-catalog.py')
B = importlib.util.module_from_spec(spec)
spec.loader.exec_module(B)


class CatalogBuildTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='clanintel-catalog-')
        self.root = Path(self.temp.name)
        records = {
            'army-buildings/hero-hall':{'id':'hero-hall','name':'Hero Hall','levels':[{'level':1,'townHallRequired':7,'heroLevelCaps':{'archerQueen':1}}]},
            'army-buildings/laboratory':{'id':'laboratory','name':'Laboratory','levels':[{'level':1,'townHallRequired':3}]},
            'army-buildings/pet-house':{'id':'pet-house','name':'Pet House','levels':[{'level':1,'townHallRequired':14}]},
            'army-buildings/blacksmith':{'id':'blacksmith','name':'Blacksmith','levels':[{'level':1,'townHallRequired':8,'maxEquipmentLevel':{'common':9,'epic':12}}]},
            'heroes/archer-queen':{'id':'archer-queen','name':'Archer Queen','levels':[{'level':1,'heroHallLevelRequired':1,'hitpoints':500},{'level':2,'heroHallLevelRequired':1,'hitpoints':510}]},
            'troops/barbarian':{'id':'barbarian','name':'Barbarian','levels':[{'level':1,'townHallRequired':1,'hitpoints':50},{'level':2,'townHallRequired':3,'laboratoryRequired':1,'hitpoints':60}]},
            'hero-equipment/giant-arrow':{'id':'giant-arrow','name':'Giant Arrow','hero':'archer-queen','rarity':'Common','levels':[{'level':1,'blacksmithLevelRequired':1}]},
            'defenses/air-defense':{'id':'air-defense','name':'Air Defense','levels':[{'level':1,'townHallRequired':4,'hitpoints':2000},{'level':1,'townHallRequired':18,'hitpoints':2100,'supercharge':True}]}}
        files = {'LICENSE':(ROOT/'public/assets/data/zapquake/2026-11-04.5/LICENSE.txt').read_bytes(), 'package.json':b'{}'}
        files.update({'data/home/'+key+'.json':B.body({'base':'home',**value}) for key,value in records.items()})
        self.lock = {'repository':'https://github.com/chiefpansancolt/clash-of-clans-data','revision':'a'*40,'dataVersion':'test-1','reviewedAt':'2026-11-17','files':[]}
        for path, raw in files.items():
            B.atomic(self.root/path,raw)
            self.lock['files'].append({'path':path,'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest()})
        self.overlay = {'source':'https://supercell.com/en/games/clashofclans/blog/release-notes/the-clash-of-titans-update-is-rolling-out/','reviewedAt':'2026-11-17','pending':['New damage unavailable'],
                        'items':[{'id':'archer-queen','apiName':'Archer Queen','category':'heroes','caps':{'19':115},'levels':[{'level':115,'townHallRequired':19}]},
                                 {'id':'air-defense','apiName':'Air Defense','category':'buildings','caps':{'19':17},'levels':[{'level':1,'hitpoints':2050}],'superchargesRemoved':True}]}

    def tearDown(self):
        self.temp.cleanup()

    def test_requirements_conflicts_and_partial_overlay(self):
        data, _ = B.build(self.lock,self.root,self.overlay)
        items = {i['id']:i for i in data['items']}
        self.assertNotIn('6',items['archer-queen']['caps'])
        self.assertEqual(items['archer-queen']['caps']['7']['maxLevel'],2)
        self.assertNotIn('7',items['giant-arrow']['caps'])
        self.assertEqual(items['giant-arrow']['caps']['8']['maxLevel'],1)
        self.assertEqual(items['barbarian']['caps']['2']['maxLevel'],1)
        self.assertEqual(items['barbarian']['caps']['3']['maxLevel'],2)
        self.assertNotIn('19',items['barbarian']['caps'])
        self.assertIsNone(items['archer-queen']['levels'][-1]['hitpoints'])
        self.assertEqual(items['air-defense']['levels'][0]['hitpoints'],2050)
        self.assertEqual(items['air-defense']['supercharges'][0]['status'],'removed-in-th19-update')
        self.assertTrue(data['audit']['requirementConflicts'])
        self.assertNotIn(19,data['coverage']['completeTownHalls'])

    def test_reproducible_publication_and_failure_retention(self):
        data, license_raw = B.build(self.lock,self.root,self.overlay)
        other, _ = B.build(self.lock,self.root,self.overlay)
        self.assertEqual(B.body(data),B.body(other))
        output = self.root/'releases'
        B.publish(output,data,license_raw)
        manifest = (output/'manifest.json').read_bytes()
        data['items'][0]['apiName'] += ' changed'
        with self.assertRaises(ValueError):
            B.publish(output,data,license_raw)
        self.assertEqual((output/'manifest.json').read_bytes(),manifest)
        # A corrupt source must fail before any publication happens.
        (self.root/'data/home/heroes/archer-queen.json').write_text('{}')
        with self.assertRaises(ValueError):
            B.build(self.lock,self.root,self.overlay)
        self.assertEqual((output/'manifest.json').read_bytes(),manifest)

    def test_inactive_release_and_rollback(self):
        data, license_raw = B.build(self.lock,self.root)
        output = self.root/'releases'
        B.publish(output,data,license_raw)
        first = (output/'manifest.json').read_bytes()
        updated, _ = B.build(self.lock,self.root,self.overlay)
        updated['dataVersion'] = 'test-2'
        B.publish(output,updated,license_raw,activate=False)
        self.assertEqual(first,(output/'manifest.json').read_bytes())
        B.publish(output,updated,license_raw)
        B.publish(output,data,license_raw)
        self.assertEqual(first,(output/'manifest.json').read_bytes())


if __name__ == '__main__':
    unittest.main()
