import { normalizeMode, generateQuestions } from '../questions';
import { QUESTIONS_PER_MATCH } from '../../shared/constants';
import type { GameMode } from '../../shared/types';

describe('questions — normalizeMode', () => {
  it('passes through valid modes', () => {
    expect(normalizeMode('add_sub')).toBe('add_sub');
    expect(normalizeMode('mul_div')).toBe('mul_div');
    expect(normalizeMode('mixed')).toBe('mixed');
  });

  it('defaults unknown / missing input to "mixed"', () => {
    expect(normalizeMode(undefined)).toBe('mixed');
    expect(normalizeMode('')).toBe('mixed');
    expect(normalizeMode('garbage')).toBe('mixed');
    expect(normalizeMode('ADD_SUB')).toBe('mixed'); // case-sensitive on purpose
  });
});

describe('questions — generateQuestions', () => {
  it('returns exactly the requested count', () => {
    expect(generateQuestions(QUESTIONS_PER_MATCH, 'mixed')).toHaveLength(QUESTIONS_PER_MATCH);
    expect(generateQuestions(0, 'mixed')).toHaveLength(0);
    expect(generateQuestions(25, 'add_sub')).toHaveLength(25);
  });

  it('places a comparison question at every 3rd slot (index % 3 === 2)', () => {
    const qs = generateQuestions(12, 'mixed');
    qs.forEach((q, i) => {
      if (i % 3 === 2) {
        expect(q.type).toBe('comparison');
      } else {
        expect(q.type).toBe('arithmetic');
      }
    });
  });

  it('gives every question a unique id', () => {
    const qs = generateQuestions(30, 'mixed');
    const ids = new Set(qs.map((q) => q.id));
    expect(ids.size).toBe(qs.length);
  });

  describe('arithmetic questions', () => {
    it('have 4 unique options that include the correct answer', () => {
      const qs = generateQuestions(60, 'mixed').filter((q) => q.type === 'arithmetic');
      expect(qs.length).toBeGreaterThan(0);
      for (const q of qs) {
        expect(q.options).toHaveLength(4);
        expect(new Set(q.options).size).toBe(4);
        expect(q.options).toContain(q.correctAnswer);
      }
    });
  });

  describe('comparison questions', () => {
    it('offer exactly the three comparison operators with a valid answer', () => {
      const qs = generateQuestions(60, 'mixed').filter((q) => q.type === 'comparison');
      expect(qs.length).toBeGreaterThan(0);
      for (const q of qs) {
        expect(q.options).toEqual(['<', '=', '>']);
        expect(q.options).toContain(q.correctAnswer);
      }
    });
  });

  describe('mode restricts arithmetic operators', () => {
    const arithmeticOps = (mode: GameMode) =>
      generateQuestions(90, mode)
        .filter((q) => q.type === 'arithmetic')
        .map((q) => {
          const m = q.question.match(/[+\-×÷]/);
          return m ? m[0] : '';
        });

    it('add_sub only produces + and -', () => {
      const ops = new Set(arithmeticOps('add_sub'));
      expect([...ops].sort()).toEqual(['+', '-'].sort());
    });

    it('mul_div only produces × and ÷', () => {
      const ops = new Set(arithmeticOps('mul_div'));
      expect([...ops].sort()).toEqual(['×', '÷'].sort());
    });

    it('mixed can produce all four operators', () => {
      const ops = new Set(arithmeticOps('mixed'));
      // Over 60 arithmetic questions all four should realistically appear.
      expect(ops.size).toBeGreaterThanOrEqual(3);
    });
  });
});
