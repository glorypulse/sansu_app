const {test} = require('node:test');
const assert = require('node:assert/strict');
const {createAnswerGuard} = require('../make_10_master_logic.js');

test('a correct answer can update the score only once until the next problem', () => {
  const guard = createAnswerGuard();
  let score = 0;

  for (let i = 0; i < 5; i++) {
    const result = guard.submit({
      feedback: i === 0 ? null : 'correct',
      hasAnswer: true,
      isCorrect: true
    });
    if (result === 'correct') score++;
  }

  assert.equal(score, 1);
});

test('an incorrect answer can be retried, then the next problem unlocks submission', () => {
  const guard = createAnswerGuard();

  assert.equal(guard.submit({feedback: null, hasAnswer: false, isCorrect: false}), null);
  assert.equal(guard.submit({feedback: null, hasAnswer: true, isCorrect: false}), 'incorrect');
  assert.equal(guard.submit({feedback: null, hasAnswer: true, isCorrect: true}), 'correct');
  assert.equal(guard.submit({feedback: null, hasAnswer: true, isCorrect: true}), null);

  guard.reset();
  assert.equal(guard.submit({feedback: null, hasAnswer: true, isCorrect: true}), 'correct');
});
