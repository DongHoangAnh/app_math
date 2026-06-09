import { normalizeDifficulty, generateQuestions } from '../questions';
import { QUESTIONS_PER_MATCH, ANSWER_MAX, DIFFICULTIES } from '../../shared/constants';
import type { GameDifficulty } from '../../shared/types';

describe('questions — normalizeDifficulty', () => {
  it('passes through valid difficulties 1/2/3', () => {
    expect(normalizeDifficulty(1)).toBe(1);
    expect(normalizeDifficulty(2)).toBe(2);
    expect(normalizeDifficulty(3)).toBe(3);
    expect(normalizeDifficulty('2')).toBe(2); // numeric strings coerced
  });

  it('defaults unknown / missing input to 1', () => {
    expect(normalizeDifficulty(undefined)).toBe(1);
    expect(normalizeDifficulty(0)).toBe(1);
    expect(normalizeDifficulty(4)).toBe(1);
    expect(normalizeDifficulty('garbage')).toBe(1);
  });
});

describe('questions — generateQuestions', () => {
  const LEVELS: GameDifficulty[] = [1, 2, 3];

  it('returns exactly the requested count', () => {
    expect(generateQuestions(QUESTIONS_PER_MATCH, 1)).toHaveLength(QUESTIONS_PER_MATCH);
    expect(generateQuestions(0, 1)).toHaveLength(0);
    expect(generateQuestions(25, 3)).toHaveLength(25);
  });

  it('places a comparison question at every 3rd slot (index % 3 === 2)', () => {
    const qs = generateQuestions(12, 2);
    qs.forEach((q, i) => {
      expect(q.type).toBe(i % 3 === 2 ? 'comparison' : 'arithmetic');
    });
  });

  it('gives every question a unique id', () => {
    const qs = generateQuestions(30, 3);
    expect(new Set(qs.map((q) => q.id)).size).toBe(qs.length);
  });

  it('tags each question with its difficulty', () => {
    for (const d of LEVELS) {
      for (const q of generateQuestions(9, d)) expect(q.difficulty).toBe(d);
    }
  });

  describe('arithmetic answers obey the global rule (positive integer < 2000)', () => {
    it('holds for every difficulty', () => {
      for (const d of LEVELS) {
        const qs = generateQuestions(120, d).filter((q) => q.type === 'arithmetic');
        expect(qs.length).toBeGreaterThan(0);
        for (const q of qs) {
          const n = Number(q.correctAnswer);
          expect(Number.isInteger(n)).toBe(true);
          expect(n).toBeGreaterThanOrEqual(1);
          expect(n).toBeLessThan(ANSWER_MAX);
        }
      }
    });

    it('has 4 unique options including the correct answer', () => {
      const qs = generateQuestions(120, 3).filter((q) => q.type === 'arithmetic');
      for (const q of qs) {
        expect(q.options).toHaveLength(4);
        expect(new Set(q.options).size).toBe(4);
        expect(q.options).toContain(q.correctAnswer);
      }
    });

    it('uses all four operators across a large sample', () => {
      const ops = new Set(
        generateQuestions(150, 2)
          .filter((q) => q.type === 'arithmetic')
          .map((q) => q.question.match(/[+\-×÷]/)?.[0] ?? ''),
      );
      expect([...ops].sort()).toEqual(['+', '-', '×', '÷'].sort());
    });
  });

  describe('comparison questions', () => {
    it('offer exactly the three comparison operators with a valid answer', () => {
      const qs = generateQuestions(60, 2).filter((q) => q.type === 'comparison');
      expect(qs.length).toBeGreaterThan(0);
      for (const q of qs) {
        expect(q.options).toEqual(['<', '=', '>']);
        expect(q.options).toContain(q.correctAnswer);
      }
    });

    it('keeps comparison operands within the difficulty range', () => {
      const max = DIFFICULTIES.find((d) => d.id === 1)!.max; // 10
      const qs = generateQuestions(60, 1).filter((q) => q.type === 'comparison');
      for (const q of qs) {
        const nums = q.question.match(/\d+/g)!.map(Number);
        for (const n of nums) expect(n).toBeLessThanOrEqual(max);
      }
    });
  });
});
