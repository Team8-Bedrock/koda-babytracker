const test = require('node:test');
const assert = require('node:assert/strict');
const {
    findLatestQualifyingBaselineLogs,
    createRoutineProfile,
    blendRoutineProfiles
} = require('./babySummary');

const log = (activity_type, day, fields = {}) => ({
    activity_type,
    timestamp: `${day}T12:00:00.000Z`,
    ...fields
});

test('finds the latest baseline window with three distinct logged days', () => {
    const logs = [
        log('feeding', '2025-01-01'),
        log('sleep', '2025-01-03'),
        log('diaper', '2025-01-05'),
        log('feeding', '2025-01-06')
    ];

    const baselineLogs = findLatestQualifyingBaselineLogs(logs);

    assert.deepEqual(
        [...new Set(baselineLogs.map((entry) => entry.timestamp.slice(0, 10)))],
        ['2025-01-03', '2025-01-05', '2025-01-06']
    );
});

test('does not qualify activity spread across more than five days', () => {
    const logs = [
        log('feeding', '2025-01-01'),
        log('sleep', '2025-01-03'),
        log('diaper', '2025-01-06')
    ];

    assert.equal(findLatestQualifyingBaselineLogs(logs), null);
});

test('ignores missing amounts and only adapts categories logged on three days', () => {
    const originalLogs = [
        log('feeding', '2025-01-01', { amount: 100, type: 'Bottle' }),
        log('feeding', '2025-01-02', { amount: 100, type: 'Bottle' }),
        log('feeding', '2025-01-03', { amount: 100, type: 'Bottle' }),
        log('diaper', '2025-01-01', { type: 'Wet' }),
        log('diaper', '2025-01-02', { type: 'Wet' }),
        log('diaper', '2025-01-03', { type: 'Wet' })
    ];
    const recentLogs = [
        log('feeding', '2025-01-04', { amount: null, type: 'Solids' }),
        log('feeding', '2025-01-05', { amount: 200, type: 'Solids' }),
        log('diaper', '2025-01-04', { type: 'Dirty' }),
        log('diaper', '2025-01-05', { type: 'Dirty' }),
        log('diaper', '2025-01-06', { type: 'Dirty' })
    ];
    const originalProfile = createRoutineProfile(originalLogs);
    const recentProfile = createRoutineProfile(recentLogs);
    const adaptiveProfile = blendRoutineProfiles(originalProfile, recentProfile);

    assert.equal(recentProfile.feeding.amount_per_record, 200);
    assert.equal(adaptiveProfile.feeding.amount_per_record, 100);
    assert.ok(adaptiveProfile.diaper.type_distribution.Dirty > 0);
    assert.equal(adaptiveProfile.diaper.type_distribution.Wet, 0.75);
});
