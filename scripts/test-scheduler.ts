/**
 * A tiny test harness for the spaced repetition algorithm.
 * Run it with:   node --experimental-strip-types scripts/test-scheduler.ts
 * It needs no npm packages, because scheduler.ts has no dependencies.
 */
import {
  schedule,
  previewIntervals,
  AGAIN,
  HARD,
  GOOD,
  EASY,
  STATE_NEW,
  STATE_LEARNING,
  STATE_REVIEW,
  STATE_RELEARNING,
  type Rating,
  type SchedulingState,
} from '../src/lib/scheduler.ts';

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 0, 1);

let passed = 0;
let failed = 0;

function check(name: string, condition: boolean, detail = '') {
  if (condition) {
    passed++;
    console.log(`  ok   ${name}`);
  } else {
    failed++;
    console.log(`  FAIL ${name} ${detail}`);
  }
}

function newCard(): SchedulingState {
  return { state: STATE_NEW, due: NOW, interval_days: 0, ease: 2.5, reps: 0, lapses: 0, step: 0 };
}

console.log('\nNew cards');
{
  const again = schedule(newCard(), AGAIN, NOW);
  check('Again keeps the card in learning', again.state === STATE_LEARNING);
  check('Again reschedules in 1 minute', Math.round((again.due - NOW) / 60000) === 1);

  const good = schedule(newCard(), GOOD, NOW);
  check('Good moves to the second learning step', good.state === STATE_LEARNING && good.step === 1);
  check('Good reschedules in 10 minutes', Math.round((good.due - NOW) / 60000) === 10);

  const easy = schedule(newCard(), EASY, NOW);
  check('Easy graduates straight to review', easy.state === STATE_REVIEW);
  check(
    'Easy gives roughly a 4 day interval',
    easy.interval_days >= 3.5 && easy.interval_days <= 4.5,
    `got ${easy.interval_days}`
  );
}

console.log('\nGraduating');
{
  const step2 = schedule(newCard(), GOOD, NOW);
  const graduated = schedule(step2, GOOD, NOW);
  check('Second Good graduates the card', graduated.state === STATE_REVIEW);
  check('Graduating interval is 1 day', Math.round(graduated.interval_days) === 1);
  check('Rep count increments', graduated.reps === 2);
}

console.log('\nReview cards');
{
  const review: SchedulingState = {
    state: STATE_REVIEW,
    due: NOW,
    interval_days: 10,
    ease: 2.5,
    reps: 5,
    lapses: 0,
    step: 0,
  };

  const good = schedule(review, GOOD, NOW);
  check(
    'Good multiplies the interval by the ease (10 x 2.5 = 25)',
    good.interval_days > 23 && good.interval_days < 27,
    `got ${good.interval_days}`
  );
  check('Good leaves the ease untouched', good.ease === 2.5);

  const hard = schedule(review, HARD, NOW);
  check(
    'Hard grows the interval only slightly (10 x 1.2 = 12)',
    hard.interval_days > 11 && hard.interval_days < 13,
    `got ${hard.interval_days}`
  );
  check('Hard reduces the ease by 0.15', Math.abs(hard.ease - 2.35) < 1e-9);

  const easy = schedule(review, EASY, NOW);
  check(
    'Easy applies the 1.3 bonus (10 x 2.5 x 1.3 = 32.5)',
    easy.interval_days > 30 && easy.interval_days < 35,
    `got ${easy.interval_days}`
  );
  check('Easy raises the ease by 0.15', Math.abs(easy.ease - 2.65) < 1e-9);

  const lapse = schedule(review, AGAIN, NOW);
  check('Again sends the card to relearning', lapse.state === STATE_RELEARNING);
  check('Again counts a lapse', lapse.lapses === 1);
  check('Again drops the ease by 0.2', Math.abs(lapse.ease - 2.3) < 1e-9);
  check('Again halves the stored interval', Math.abs(lapse.interval_days - 5) < 1e-9);
  check('Again shows the card again in 10 minutes', Math.round((lapse.due - NOW) / 60000) === 10);
}

console.log('\nSafety rails');
{
  let card: SchedulingState = {
    state: STATE_REVIEW,
    due: NOW,
    interval_days: 5,
    ease: 2.5,
    reps: 3,
    lapses: 0,
    step: 0,
  };
  for (let i = 0; i < 40; i++) card = schedule(card, AGAIN, NOW);
  check('Ease never falls below 1.3', card.ease >= 1.3, `got ${card.ease}`);
  check('Interval never falls below 1 day', card.interval_days >= 1, `got ${card.interval_days}`);

  let big: SchedulingState = {
    state: STATE_REVIEW,
    due: NOW,
    interval_days: 100,
    ease: 2.5,
    reps: 20,
    lapses: 0,
    step: 0,
  };
  for (let i = 0; i < 30; i++) big = schedule(big, EASY, NOW);
  check('Interval is capped at 5 years', big.interval_days <= 365 * 5, `got ${big.interval_days}`);
}

console.log('\nButton previews');
{
  const review: SchedulingState = {
    state: STATE_REVIEW,
    due: NOW,
    interval_days: 10,
    ease: 2.5,
    reps: 5,
    lapses: 0,
    step: 0,
  };
  const p = previewIntervals(review, NOW);
  console.log(`  Again ${p.again} | Hard ${p.hard} | Good ${p.good} | Easy ${p.easy}`);
  check('Again previews in minutes', p.again.endsWith('m'));
  check('Good previews in days or months', /d|mo/.test(p.good));
}

console.log('\nA realistic 30 day simulation');
{
  // Study one card every day, mostly getting it right.
  let card = newCard();
  let time = NOW;
  let reviews = 0;
  for (let day = 0; day < 30; day++) {
    time = NOW + day * DAY;
    while (card.due <= time && reviews < 500) {
      const rating: Rating = Math.random() < 0.15 ? AGAIN : GOOD;
      card = schedule(card, rating, card.due);
      reviews++;
    }
  }
  console.log(
    `  after 30 days: ${reviews} reviews, interval ${card.interval_days.toFixed(1)} days, ease ${card.ease.toFixed(2)}`
  );
  check('Simulation terminates without runaway reviews', reviews < 500, `got ${reviews}`);
  check('Card has grown a real interval', card.interval_days >= 1);
}

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed === 0 ? 0 : 1);
