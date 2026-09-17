/**
 * scheduler.ts - the spaced repetition brain.
 *
 * This is a faithful TypeScript port of the SM-2 variant that Anki ships as its
 * classic scheduler. In the Anki source tree the equivalent logic lives in Rust at
 *   rslib/src/scheduler/answering/        (what happens when you press a button)
 *   rslib/src/scheduler/answering/learning.rs and review.rs
 *   rslib/src/scheduler/fsrs/             (the newer FSRS algorithm)
 *
 * Anki's own docs describe the same rules in plain English:
 * https://docs.ankiweb.net/deck-options.html
 *
 * The four buttons are the same four Anki uses:
 *   1 Again  - you did not remember it
 *   2 Hard   - you remembered, but it hurt
 *   3 Good   - you remembered normally
 *   4 Easy   - instant, effortless recall
 */

export const AGAIN = 1;
export const HARD = 2;
export const GOOD = 3;
export const EASY = 4;

export type Rating = 1 | 2 | 3 | 4;

/** Card learning states, matching Anki's numbering. */
export const STATE_NEW = 0;
export const STATE_LEARNING = 1;
export const STATE_REVIEW = 2;
export const STATE_RELEARNING = 3;

const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;

/** Anki's default deck options. Change these to tune how hard the app pushes you. */
export const CONFIG = {
  learningStepsMinutes: [1, 10], // a brand new card is shown after 1 min, then 10 min
  relearningStepsMinutes: [10], // a forgotten card comes back after 10 min
  graduatingIntervalDays: 1, // first "real" interval after passing the steps
  easyIntervalDays: 4, // interval if you hit Easy on a new card
  startingEase: 2.5,
  easyBonus: 1.3,
  hardIntervalFactor: 1.2,
  lapseMultiplier: 0.5, // a lapsed card keeps half of its old interval
  minimumIntervalDays: 1,
  maximumIntervalDays: 365 * 5,
  minimumEase: 1.3,
  fuzzPercent: 0.05, // ±5% randomness so cards don't clump on the same day
};

export type SchedulingState = {
  state: number;
  due: number;
  interval_days: number;
  ease: number;
  reps: number;
  lapses: number;
  step: number;
};

/** Small random jitter, exactly the reason Anki calls it "fuzz". */
function fuzz(days: number): number {
  if (days < 2.5) return days;
  const spread = days * CONFIG.fuzzPercent;
  return days + (Math.random() * 2 - 1) * spread;
}

function clampInterval(days: number): number {
  return Math.min(CONFIG.maximumIntervalDays, Math.max(CONFIG.minimumIntervalDays, days));
}

/**
 * Given a card's current state and the button the student pressed, work out
 * when that card should next appear. Pure function: no database, no side
 * effects, which makes it trivial to unit test.
 */
export function schedule(card: SchedulingState, rating: Rating, now = Date.now()): SchedulingState {
  const next: SchedulingState = { ...card, reps: card.reps + 1 };
  const steps = CONFIG.learningStepsMinutes;
  const relearnSteps = CONFIG.relearningStepsMinutes;

  // ---- New or currently learning -------------------------------------
  if (card.state === STATE_NEW || card.state === STATE_LEARNING) {
    if (rating === AGAIN) {
      next.state = STATE_LEARNING;
      next.step = 0;
      next.due = now + steps[0] * MINUTE;
      next.interval_days = 0;
      return next;
    }
    if (rating === EASY) {
      // Easy on a new card skips the remaining steps entirely.
      next.state = STATE_REVIEW;
      next.step = 0;
      next.interval_days = clampInterval(fuzz(CONFIG.easyIntervalDays));
      next.due = now + next.interval_days * DAY;
      return next;
    }
    if (rating === HARD) {
      // Repeat the current step (Anki shows the average of this and the next step).
      next.state = STATE_LEARNING;
      const mins = steps[Math.min(card.step, steps.length - 1)];
      next.due = now + mins * 1.5 * MINUTE;
      return next;
    }
    // GOOD - advance one step, or graduate to a real review card.
    const nextStep = card.state === STATE_NEW ? 1 : card.step + 1;
    if (nextStep >= steps.length) {
      next.state = STATE_REVIEW;
      next.step = 0;
      next.interval_days = clampInterval(fuzz(CONFIG.graduatingIntervalDays));
      next.due = now + next.interval_days * DAY;
    } else {
      next.state = STATE_LEARNING;
      next.step = nextStep;
      next.due = now + steps[nextStep] * MINUTE;
    }
    return next;
  }

  // ---- Relearning after a lapse --------------------------------------
  if (card.state === STATE_RELEARNING) {
    if (rating === AGAIN) {
      next.step = 0;
      next.due = now + relearnSteps[0] * MINUTE;
      return next;
    }
    const nextStep = card.step + 1;
    if (rating === EASY || nextStep >= relearnSteps.length) {
      next.state = STATE_REVIEW;
      next.step = 0;
      next.interval_days = clampInterval(fuzz(Math.max(card.interval_days, 1)));
      next.due = now + next.interval_days * DAY;
    } else {
      next.step = nextStep;
      next.due = now + relearnSteps[nextStep] * MINUTE;
    }
    return next;
  }

  // ---- A mature review card ------------------------------------------
  const ivl = Math.max(card.interval_days, 1);

  if (rating === AGAIN) {
    // A lapse: lose some ease, keep half the interval, go back to relearning.
    next.state = STATE_RELEARNING;
    next.lapses = card.lapses + 1;
    next.ease = Math.max(CONFIG.minimumEase, card.ease - 0.2);
    next.interval_days = clampInterval(ivl * CONFIG.lapseMultiplier);
    next.step = 0;
    next.due = now + relearnSteps[0] * MINUTE;
    return next;
  }

  if (rating === HARD) {
    next.ease = Math.max(CONFIG.minimumEase, card.ease - 0.15);
    next.interval_days = clampInterval(fuzz(ivl * CONFIG.hardIntervalFactor));
  } else if (rating === GOOD) {
    next.ease = card.ease;
    next.interval_days = clampInterval(fuzz(ivl * card.ease));
  } else {
    next.ease = card.ease + 0.15;
    next.interval_days = clampInterval(fuzz(ivl * card.ease * CONFIG.easyBonus));
  }

  next.state = STATE_REVIEW;
  next.step = 0;
  next.due = now + next.interval_days * DAY;
  return next;
}

/**
 * Preview text for each button, so the student can see "Good -> 12 days"
 * before committing - the same affordance Anki gives above its buttons.
 */
export function previewIntervals(card: SchedulingState, now = Date.now()) {
  const label = (s: SchedulingState) => {
    const ms = s.due - now;
    if (ms < 60 * MINUTE) return `${Math.max(1, Math.round(ms / MINUTE))}m`;
    if (ms < DAY) return `${Math.round(ms / (60 * MINUTE))}h`;
    if (ms < 30 * DAY) return `${Math.round(ms / DAY)}d`;
    if (ms < 365 * DAY) return `${(ms / (30 * DAY)).toFixed(1)}mo`;
    return `${(ms / (365 * DAY)).toFixed(1)}y`;
  };
  return {
    again: label(schedule(card, AGAIN, now)),
    hard: label(schedule(card, HARD, now)),
    good: label(schedule(card, GOOD, now)),
    easy: label(schedule(card, EASY, now)),
  };
}
