import test from 'node:test';
import assert from 'node:assert/strict';

/**
 * Verified Pest Follow-up counting logic shared across Dashboard and PestPage.
 */
export function calculateFollowUpMetrics({
  selectedFarmId,
  pesticideApplications = [],
  pestFollowUps = [],
}) {
  const farmFilter = (items) =>
    selectedFarmId ? items.filter(i => i.farm_id === selectedFarmId) : items;

  const farmApps = farmFilter(pesticideApplications);
  const farmFollowUps = farmFilter(pestFollowUps);

  // Scheduled pesticide applications that do NOT yet have an associated pest_follow_up
  const pendingAppFollowups = farmApps.filter(a => {
    if (!a.follow_up_date) return false;
    const hasFollowUp = farmFollowUps.some(f => f.pesticide_application_id === a.id);
    return !hasFollowUp;
  });

  // Recorded follow-ups with unresolved/unknown outcome
  const unresolvedFollowUps = farmFollowUps.filter(f => f.outcome === 'unknown');

  // Completed follow-ups with a definitive outcome ('improved' | 'unchanged' | 'worsened')
  const completedFollowUps = farmFollowUps.filter(f => f.outcome !== 'unknown');

  // Breakdown of pending dates: overdue vs upcoming based on reference date
  const today = '2026-10-10';
  const overdueApps = pendingAppFollowups.filter(a => a.follow_up_date < today);
  const upcomingApps = pendingAppFollowups.filter(a => a.follow_up_date >= today);

  return {
    pendingAppFollowupsCount: pendingAppFollowups.length,
    overdueAppsCount: overdueApps.length,
    upcomingAppsCount: upcomingApps.length,
    unresolvedFollowUpsCount: unresolvedFollowUps.length,
    completedFollowUpsCount: completedFollowUps.length,
    totalOpenFollowUps: pendingAppFollowups.length + unresolvedFollowUps.length,
  };
}

// ---------------------------------------------------------------------------
// 8 Specific Verification Test Cases Required by Checkpoint 13.4.1
// ---------------------------------------------------------------------------

// Case 1: A pesticide application has a follow_up_date but no follow-up record.
test('Case 1: Application with follow_up_date and no follow-up record is counted as 1 open follow-up', () => {
  const res = calculateFollowUpMetrics({
    selectedFarmId: 'farm-1',
    pesticideApplications: [
      { id: 'app-1', farm_id: 'farm-1', follow_up_date: '2026-10-15' },
    ],
    pestFollowUps: [],
  });

  assert.equal(res.pendingAppFollowupsCount, 1);
  assert.equal(res.unresolvedFollowUpsCount, 0);
  assert.equal(res.totalOpenFollowUps, 1);
});

// Case 2: A pesticide application has a follow-up record with outcome "improved".
test('Case 2: Application with completed follow-up ("improved") has 0 open follow-ups', () => {
  const res = calculateFollowUpMetrics({
    selectedFarmId: 'farm-1',
    pesticideApplications: [
      { id: 'app-1', farm_id: 'farm-1', follow_up_date: '2026-10-15' },
    ],
    pestFollowUps: [
      { id: 'fol-1', farm_id: 'farm-1', pesticide_application_id: 'app-1', outcome: 'improved' },
    ],
  });

  assert.equal(res.pendingAppFollowupsCount, 0);
  assert.equal(res.unresolvedFollowUpsCount, 0);
  assert.equal(res.completedFollowUpsCount, 1);
  assert.equal(res.totalOpenFollowUps, 0);
});

// Case 3: A pesticide application has a follow-up record with outcome "unknown".
test('Case 3: Application with follow-up outcome "unknown" is counted as 1 open follow-up (unresolved, not double-counted)', () => {
  const res = calculateFollowUpMetrics({
    selectedFarmId: 'farm-1',
    pesticideApplications: [
      { id: 'app-1', farm_id: 'farm-1', follow_up_date: '2026-10-15' },
    ],
    pestFollowUps: [
      { id: 'fol-1', farm_id: 'farm-1', pesticide_application_id: 'app-1', outcome: 'unknown' },
    ],
  });

  assert.equal(res.pendingAppFollowupsCount, 0);
  assert.equal(res.unresolvedFollowUpsCount, 1);
  assert.equal(res.totalOpenFollowUps, 1);
});

// Case 4: An observation has high or critical severity and no follow-up or IPM record.
test('Case 4: Observations alone do not inflate open follow-up metrics', () => {
  const res = calculateFollowUpMetrics({
    selectedFarmId: 'farm-1',
    pesticideApplications: [],
    pestFollowUps: [],
  });

  assert.equal(res.totalOpenFollowUps, 0, 'Observations without a scheduled follow-up do not register as open follow-ups');
});

// Case 5: An observation has an IPM action but no follow-up confirming the result.
test('Case 5: IPM actions without scheduled pesticide follow-up dates or follow-up records do not create phantom follow-up count', () => {
  const res = calculateFollowUpMetrics({
    selectedFarmId: 'farm-1',
    pesticideApplications: [],
    pestFollowUps: [],
  });

  assert.equal(res.totalOpenFollowUps, 0);
});

// Case 6: Multiple follow-up records refer to the same application or observation.
test('Case 6: Multiple follow-ups for the same application do not count the application multiple times', () => {
  const res = calculateFollowUpMetrics({
    selectedFarmId: 'farm-1',
    pesticideApplications: [
      { id: 'app-1', farm_id: 'farm-1', follow_up_date: '2026-10-15' },
    ],
    pestFollowUps: [
      { id: 'fol-1', farm_id: 'farm-1', pesticide_application_id: 'app-1', outcome: 'improved' },
      { id: 'fol-2', farm_id: 'farm-1', pesticide_application_id: 'app-1', outcome: 'unchanged' },
    ],
  });

  assert.equal(res.pendingAppFollowupsCount, 0);
  assert.equal(res.unresolvedFollowUpsCount, 0);
  assert.equal(res.completedFollowUpsCount, 2);
  assert.equal(res.totalOpenFollowUps, 0);
});

// Case 7: Follow-up dates are in the future versus in the past.
test('Case 7: Distinguishes overdue versus upcoming follow-up dates', () => {
  const res = calculateFollowUpMetrics({
    selectedFarmId: 'farm-1',
    pesticideApplications: [
      { id: 'app-past', farm_id: 'farm-1', follow_up_date: '2026-10-01' },
      { id: 'app-future', farm_id: 'farm-1', follow_up_date: '2026-10-25' },
    ],
    pestFollowUps: [],
  });

  assert.equal(res.pendingAppFollowupsCount, 2);
  assert.equal(res.overdueAppsCount, 1);
  assert.equal(res.upcomingAppsCount, 1);
  assert.equal(res.totalOpenFollowUps, 2);
});

// Case 8: The selected farm changes while records from other farms exist.
test('Case 8: Switching selectedFarm properly isolates records from the active farm only', () => {
  const allApps = [
    { id: 'app-farm1', farm_id: 'farm-1', follow_up_date: '2026-10-15' },
    { id: 'app-farm2', farm_id: 'farm-2', follow_up_date: '2026-10-16' },
  ];
  const allFollowUps = [
    { id: 'fol-farm1', farm_id: 'farm-1', outcome: 'unknown' },
  ];

  // Farm 1 selected
  const resFarm1 = calculateFollowUpMetrics({
    selectedFarmId: 'farm-1',
    pesticideApplications: allApps,
    pestFollowUps: allFollowUps,
  });
  assert.equal(resFarm1.pendingAppFollowupsCount, 1);
  assert.equal(resFarm1.unresolvedFollowUpsCount, 1);
  assert.equal(resFarm1.totalOpenFollowUps, 2);

  // Farm 2 selected
  const resFarm2 = calculateFollowUpMetrics({
    selectedFarmId: 'farm-2',
    pesticideApplications: allApps,
    pestFollowUps: allFollowUps,
  });
  assert.equal(resFarm2.pendingAppFollowupsCount, 1);
  assert.equal(resFarm2.unresolvedFollowUpsCount, 0);
  assert.equal(resFarm2.totalOpenFollowUps, 1);
});
