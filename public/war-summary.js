// Time-aware display state and presentation; score/target calculations stay in renderWarCommand.
(() => {
  const el = id => document.getElementById(id);
  const tr = (key, values) => window.CocI18n.t(key, values);
  const numeric = value => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value)) ? Number(value) : null;
  const number = value => value === null ? '—' : window.CocI18n.number(value, {maximumFractionDigits:2});
  const text = (id, value) => { el(id).textContent = value; };
  const node = (tag, value, className) => {
    const item = document.createElement(tag); if (value !== undefined) item.textContent = value; if (className) item.className = className; return item;
  };
  function parseTime(value) {
    if (typeof value !== 'string') return null;
    const compact = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(?:\.(\d{1,3}))?Z$/.exec(value);
    const milliseconds = compact ? Date.UTC(+compact[1], +compact[2]-1, +compact[3], +compact[4], +compact[5], +compact[6], +(compact[7] || '0').padEnd(3,'0'))
      : /^\d{4}-\d{2}-\d{2}T/.test(value) ? Date.parse(value) : NaN;
    return Number.isFinite(milliseconds) ? new Date(milliseconds) : null;
  }
  function normalize(data, now = Date.now()) {
    const end = parseTime(data?.endTime);
    return data?.state === 'inWar' && end && end.getTime() <= now ? {...data, state:'warEnded', endedByTime:true} : data;
  }
  function score(id, clan, maximum) {
    const stars = numeric(clan?.stars), destruction = numeric(clan?.destructionPercentage), attacks = numeric(clan?.attacks);
    const total = node('div', undefined, 'war-score-total');
    total.append(node('strong', number(stars), 'war-score-number'), node('span', '★' + (maximum > 0 ? ' / ' + number(maximum) : ''), 'war-score-cap'));
    const detail = node('div', undefined, 'war-score-detail');
    const percentage = node('span'); percentage.append(node('strong', number(destruction) + (destruction === null ? '' : '%')), document.createTextNode(' ' + tr('clan.destruction')));
    detail.append(percentage, node('span', tr('clan.layout.usedAttacks', {count:number(attacks)})));
    el(id).replaceChildren(total, detail);
  }
  function render(data, context) {
    const {pending, remaining, totalQuota, ourTheoreticalLimit, opponentTheoreticalLimit, ourPerfect, opponentPerfect, result, destructionKnown, status} = context;
    const ended = data.state === 'warEnded', preparation = data.state === 'preparation';
    el('clan-war').dataset.warState = data.state || 'unknown';
    el('warPhase').dataset.state = data.state || 'unknown';
    score('warClanScore', data.clan, ourTheoreticalLimit);
    score('warOpponentScore', data.opponent, opponentTheoreticalLimit);

    const ours = numeric(data.clan?.stars), theirs = numeric(data.opponent?.stars);
    const delta = ours === null || theirs === null ? null : ours - theirs;
    const perfectDraw = ourPerfect && opponentPerfect && delta === 0 && destructionKnown && result === 0;
    const awaitingFinal = ended && data.endedByTime && !perfectDraw;
    let difference = delta === null ? '—' : delta === 0 ? '=' : (delta > 0 ? '+' : '−') + number(Math.abs(delta)) + ' ★';
    if (delta === 0 && destructionKnown && result !== 0) {
      const percentage = Number(data.clan.destructionPercentage) - Number(data.opponent.destructionPercentage);
      difference = (percentage > 0 ? '+' : '−') + number(Math.abs(percentage)) + '%';
    }
    text('warScoreDelta', difference);
    text('warScoreDeltaLabel', tr(preparation ? 'clan.layout.preparationMargin' : ended ? 'clan.layout.finalMargin' : 'clan.layout.currentMargin'));
    if (awaitingFinal) text('warScoreDeltaLabel', tr('clan.layout.lastRecordedMargin'));
    el('warScoreLead').dataset.tone = preparation || delta === null ? 'neutral' : result > 0 ? 'safe' : result < 0 ? 'danger' : 'neutral';

    const pendingKnown = Array.isArray(data.members) && data.members.length > 0 && data.members.every(member => numeric(member.attacksRemaining) !== null);
    const used = numeric(data.attacksUsed) ?? numeric(data.clan?.attacks);
    const quota = numeric(totalQuota);
    const knownUsage = quota !== null && quota > 0 && used !== null && used >= 0;
    const progress = el('warUsageProgress'); progress.hidden = !knownUsage;
    if (knownUsage) {
      progress.max = quota; progress.value = Math.min(used, quota);
      text('warAttackUsage', tr('clan.layout.usageSummary', {used:number(used), total:number(quota), remaining:number(numeric(remaining))}));
      text('warUsagePercent', tr('clan.layout.quotaPercent', {percent:number(Math.min(100, used / quota * 100))}));
    } else {
      progress.removeAttribute('value');
      text('warAttackUsage', tr('clan.attackQuotaUnavailable'));
      text('warUsagePercent', used === null ? '—' : tr('clan.attacksRecorded', {count:number(used)}));
    }
    text('warUsagePending', pendingKnown ? tr(ended ? 'clan.layout.playersUnused' : 'clan.layout.playersRemaining', {count:number(pending.length)}) : tr('clan.layout.pendingUnknown'));
    if (!knownUsage && !ourPerfect) text('warCommandDetail', tr('clan.attackQuotaUnavailable'));

    if (ourPerfect && !preparation && !ended) {
      text('warCommandText', tr('clan.layout.perfectScore', {stars:number(ours), maximum:number(ourTheoreticalLimit)}));
      text('warCommandDetail', status);
    }
    let finalDetail = null;
    if (ended) {
      if (perfectDraw) finalDetail = tr('clan.layout.endedPerfectDraw', {stars:number(ours)});
      else if (awaitingFinal || delta === null || (delta === 0 && !destructionKnown)) finalDetail = tr('clan.layout.endedAwaitingUpdate');
      else finalDetail = tr(result > 0 ? 'clan.layout.endedWin' : result < 0 ? 'clan.layout.endedLoss' : 'clan.layout.endedDraw', {ours:number(ours), theirs:number(theirs)});
      text('warCommandDetail', finalDetail);
      if (awaitingFinal) {
        text('warCommandText', tr('clan.layout.endedAwaitingHeadline'));
        el('warCommandStrip').dataset.tone = 'info';
        el('warCommandTone').className = 'war-command-indicator info';
        el('warScoreLead').dataset.tone = 'neutral';
      }
    }
    text('warRemaining', remaining === null ? '—' : tr('clan.layout.attackCount', {count:number(numeric(remaining))}));
    text('warRemainingDetail', knownUsage ? tr('clan.attackQuotaUsed', {used:number(used), total:number(quota)}) : tr('clan.attackQuotaUnavailable'));

    let summaryKey = 'clan.layout.resultPending';
    if (preparation) summaryKey = 'clan.layout.preparing';
    else if (ended) summaryKey = result > 0 ? 'clan.layout.won' : result < 0 ? 'clan.layout.lost' : destructionKnown ? 'clan.layout.draw' : 'clan.layout.resultPending';
    else if (ourPerfect && opponentPerfect) summaryKey = 'clan.layout.draw';
    else if (ourPerfect) summaryKey = 'clan.layout.maxScore';
    else if (result > 0) summaryKey = 'clan.layout.leading';
    else if (result < 0) summaryKey = 'clan.layout.trailing';
    else if (delta !== null) summaryKey = 'clan.layout.levelScore';
    if (delta === null || awaitingFinal) summaryKey = 'clan.layout.resultPending';
    text('warResultSummary', tr(summaryKey));
    text('warResultDetail', finalDetail || (delta === null ? tr('clan.layout.scoreUnknown') : !ended && !preparation && ourPerfect ? tr(opponentPerfect ? 'clan.layout.bothMaximized' : 'clan.layout.resultNotFinal') : status));
    el('warResultCard').dataset.tone = preparation || delta === null || awaitingFinal ? 'neutral' : result > 0 ? 'safe' : result < 0 ? 'danger' : 'neutral';
    text('warPendingCount', pendingKnown ? tr('home.members', {count:number(pending.length)}) : '—');
    const pendingLabel = tr(ended ? 'clan.layout.playersUnusedTitle' : 'clan.playersWithAttacksLeft');
    text('warPendingLabel', pendingLabel); text('warPendingFooterLabel', pendingLabel);
    text('warPendingAction', tr(ended ? 'clan.layout.viewUnused' : 'clan.layout.viewRemaining'));
    el('showPendingRoster').hidden = pending.length === 0;
    const names = pending.map(member => member.name || member.tag || '—');
    text('warPendingNames', names.length ? names.slice(0,5).join(', ') + (names.length > 5 ? '…' : '') : tr(pendingKnown ? 'clan.allAttacksUsed' : 'clan.layout.pendingUnknown'));
    el('warPendingNames').title = names.join(', ');
  }
  window.ClanWarSummary = {render, normalize, parseTime};
})();
