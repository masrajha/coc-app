const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('public/js/player-league.js','utf8');
const match=source.match(/function attackQuality\(member\) \{[\s\S]*?\n  \}/);
assert.ok(match,'Attack-quality decision helper is present');
const quality=vm.runInNewContext('('+match[0]+')');
test('badge threshold uses raw star totals and a minimum five-attack sample',()=>{
 assert.equal(quality({attackStarsTotal:15,attackStarsSampleSize:5}).qualified,true);
 assert.equal(quality({attackStarsTotal:12,attackStarsSampleSize:4}).qualified,false);
 assert.equal(quality({attackStarsTotal:27,attackStarsSampleSize:10}).qualified,true);
 const rounded=quality({attackStarsTotal:89,attackStarsSampleSize:33});
 assert.equal(rounded.average.toFixed(2),'2.70');assert.equal(rounded.qualified,false);
 assert.equal(quality({attackStarsTotal:0,attackStarsSampleSize:5}).qualified,false);
});
test('missing or invalid samples stay unknown rather than gaining a badge',()=>{
 for(const value of [null,{}, {attackStarsTotal:null,attackStarsSampleSize:5},{attackStarsTotal:15,attackStarsSampleSize:0},{attackStarsTotal:16,attackStarsSampleSize:5},{attackStarsTotal:-1,attackStarsSampleSize:5},{attackStarsTotal:14.5,attackStarsSampleSize:5}])assert.equal(quality(value),null);
});
