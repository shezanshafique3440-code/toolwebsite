import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeOverallScore, scoreBand, VERDICT_LABELS } from '@/lib/scoring';

test('overall score is the weighted blend of the four sub-scores', () => {
  assert.equal(
    computeOverallScore({ demandScore: 100, competitionScore: 100, profitScore: 100, viralScore: 100 }),
    100,
  );
  assert.equal(computeOverallScore({ demandScore: 0, competitionScore: 0, profitScore: 0, viralScore: 0 }), 0);
  // 90*0.32 + 60*0.22 + 80*0.28 + 70*0.18 = 77.0
  assert.equal(
    computeOverallScore({ demandScore: 90, competitionScore: 60, profitScore: 80, viralScore: 70 }),
    77,
  );
});

test('score bands map to the four verdicts', () => {
  assert.equal(scoreBand(88), 'STRONG');
  assert.equal(scoreBand(75), 'STRONG');
  assert.equal(scoreBand(74), 'POTENTIAL');
  assert.equal(scoreBand(60), 'POTENTIAL');
  assert.equal(scoreBand(59), 'RISKY');
  assert.equal(scoreBand(45), 'RISKY');
  assert.equal(scoreBand(44), 'AVOID');
  assert.equal(VERDICT_LABELS[scoreBand(90)], 'Strong Product');
});
