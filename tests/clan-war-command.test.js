const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');

const page = fs.readFileSync('public/index.html', 'utf8');
const source = page.slice(page.indexOf('function renderWarCommand('), page.indexOf('function showWarStatus('));
function render(overrides = {}) {
  const elements = new Map();
  const node = () => ({ textContent: '', dataset: {}, hidden: false, children: [], append(...children) { this.children.push(...children); }, appendChild(child) { this.children.push(child); }, replaceChildren() { this.children = []; } });
  const get = id => { if (!elements.has(id)) elements.set(id, node()); return elements.get(id); };
  const context = { document: { getElementById: get, createElement: node },
    setText: (id, text) => { get(id).textContent = text; },
    tr: (key, variables = {}) => JSON.stringify({ key, ...variables }),
    formatLocalizedNumber: (value, options) => new Intl.NumberFormat('en-US', options).format(value) };
  vm.createContext(context); vm.runInContext(source, context);
  const data = { state: 'inWar', teamSize: 45, attacksPerMember: 2, attacksRemaining: 22,
    clan: { stars: 135, destructionPercentage: 100, attacks: 68 },
    opponent: { stars: 135, destructionPercentage: 100, attacks: 79 },
    members: Array.from({ length: 45 }, (_, index) => ({ attacksRemaining: index < 13 ? 1 : 0 })),
    ...overrides };
  context.renderWarCommand(data, new Date(Date.now() + 3600000));
  return { headline: JSON.parse(get('warCommandText').textContent),
    status: JSON.parse(get('warProjection').children[2].children[1].textContent),
    tone: get('warCommandStrip').dataset.tone, pendingHidden: get('showPendingRoster').hidden,
    pendingLabel: JSON.parse(get('warPendingLabel').textContent).key,
    limit: get('warProjection').children[0].children[1].textContent };
}

test('135 stars and 100% on both sides locks a draw and removes follow-up urgency', () => {
  const result = render();
  assert.equal(result.status.key, 'clan.warPerfectDraw');
  assert.equal(result.headline.key, 'clan.warPerfectDrawHeadline');
  assert.equal(result.headline.attacks, 22);
  assert.equal(result.tone, 'info');
  assert.equal(result.pendingHidden, true);
  assert.equal(result.pendingLabel, 'clan.playersWithAttacksLeft');
});

test('a perfect clan waits for the opponent instead of requesting more stars', () => {
  const result = render({ opponent: { stars: 134, destructionPercentage: 99, attacks: 79 } });
  assert.equal(result.status.key, 'clan.warPerfectWaiting');
  assert.equal(result.tone, 'safe');
  assert.equal(result.pendingHidden, true);
});

test('a 15-player CWL war has a 45-star cap and supports the same perfect draw state', () => {
  const result = render({ type: 'CWL', teamSize: 15, attacksPerMember: 1, attacksRemaining: 3,
    clan: { stars: 45, destructionPercentage: 100, attacks: 12 },
    opponent: { stars: 45, destructionPercentage: 100, attacks: 15 },
    members: Array.from({ length: 15 }, () => ({ attacksRemaining: 0 })) });
  assert.equal(result.limit, '45★');
  assert.equal(result.status.key, 'clan.warPerfectDraw');
  assert.equal(result.tone, 'info');
});

test('a perfect opponent makes a draw the best possible target', () => {
  assert.equal(render({ clan: { stars: 134, destructionPercentage: 99, attacks: 68 } }).status.key, 'clan.warTargetDraw');
});

test('tied stars use destruction and do not require another star by default', () => {
  const opponent = { stars: 130, destructionPercentage: 95, attacks: 79 };
  for (const [destructionPercentage, expected] of [[94, 'clan.trailingDestructionTarget'], [95, 'clan.equalScoreTarget'], [96, 'clan.leadingDestruction']]) {
    assert.equal(render({ clan: { stars: 130, destructionPercentage, attacks: 68 }, opponent }).status.key, expected);
  }
});

test('a finished war uses destruction to resolve equal stars', () => {
  const opponent = { stars: 130, destructionPercentage: 95, attacks: 90 };
  for (const [destructionPercentage, expected, tone] of [[96, 'clan.winByDestruction', 'safe'], [94, 'clan.lossByDestruction', 'danger'], [95, 'clan.warDrawResult', 'info']]) {
    const result = render({ state: 'warEnded', clan: { stars: 130, destructionPercentage, attacks: 90 }, opponent });
    assert.equal(result.status.key, expected);
    assert.equal(result.tone, tone);
    assert.equal(result.pendingHidden, true);
  }
});

test('team size sets the star cap even if only part of the roster is available', () => {
  const result = render({ members: [{ attacksRemaining: 1 }], clan: { stars: 130, destructionPercentage: 95 }, opponent: { stars: 131, destructionPercentage: 96, attacks: 79 } });
  assert.equal(result.limit, '135★');
  assert.equal(result.status.key, 'clan.starsNeeded');
  assert.equal(result.status.stars, 2);
});

test('an unreachable star lead offers a destruction target or explains the limit', () => {
  const clan = { stars: 100, destructionPercentage: 80 };
  assert.equal(render({ clan, opponent: { stars: 103, destructionPercentage: 81, attacks: 79 }, attacksRemaining: 1 }).status.key, 'clan.equalStarsDestruction');
  assert.equal(render({ clan, opponent: { stars: 110, destructionPercentage: 85, attacks: 79 }, attacksRemaining: 1 }).status.key, 'clan.cannotCatchUp');
});

test('preparation and missing quotas never invent an extra-star requirement', () => {
  assert.equal(render({ state: 'preparation' }).status.key, 'clan.warPreparationTarget');
  const result = render({ attacksPerMember: null, attacksRemaining: null, clan: { stars: 50, destructionPercentage: 70 }, opponent: { stars: 49, destructionPercentage: 69 } });
  assert.equal(result.status.key, 'clan.warQuotaUnknown');
  assert.equal(render({ clan: { stars: 130, destructionPercentage: 95 }, opponent: { stars: 130, destructionPercentage: 95, attacks: 79 }, attacksRemaining: 0 }).status.key, 'clan.warNoAttacksResultPending');
});
