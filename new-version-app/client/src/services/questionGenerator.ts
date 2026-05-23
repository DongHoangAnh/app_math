/**
 * Simple Math Question Generator
 * Generates arithmetic questions with numbers 0-10
 * Operations: +, -, *, /, comparison (>, <, =)
 */

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer: string;
  type: 'arithmetic' | 'comparison';
}

const OPERATIONS = ['+', '-', '*', '/'];
const COMPARISON_OPS = ['>', '<', '='];

/**
 * Generate a random number between min and max
 */
function getRandomNumber(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generate arithmetic question (e.g., "5 + 3 = ?")
 */
function generateArithmeticQuestion(id: string): Question {
  const num1 = getRandomNumber(0, 10);
  const num2 = getRandomNumber(0, 10);
  const operation = OPERATIONS[Math.floor(Math.random() * OPERATIONS.length)];

  let answer: number;
  try {
    // eslint-disable-next-line no-eval
    answer = Math.round(eval(`${num1} ${operation} ${num2}`) * 100) / 100;
  } catch {
    answer = 0;
  }

  // Skip division by zero
  if (operation === '/' && num2 === 0) {
    return generateArithmeticQuestion(id);
  }

  const text = `${num1} ${operation} ${num2} = ?`;
  const correctAnswer = String(answer);

  // Generate wrong answers
  const wrongAnswers = new Set<string>();
  while (wrongAnswers.size < 3) {
    const wrong =
      answer + (Math.random() > 0.5 ? 1 : -1) * getRandomNumber(1, 5);
    if (wrong !== answer && wrong >= -10 && wrong <= 20) {
      wrongAnswers.add(String(wrong));
    }
  }

  const options = [correctAnswer, ...Array.from(wrongAnswers)].sort(
    () => Math.random() - 0.5
  );

  return {
    id,
    text,
    options,
    correctAnswer,
    type: 'arithmetic',
  };
}

/**
 * Generate comparison question (e.g., "5 > 3?" or "7 = 7?")
 */
function generateComparisonQuestion(id: string): Question {
  const num1 = getRandomNumber(0, 10);
  const num2 = getRandomNumber(0, 10);

  // Randomly choose which comparison is true
  const comparison = COMPARISON_OPS[
    Math.floor(Math.random() * COMPARISON_OPS.length)
  ] as '>' | '<' | '=';

  let text = '';
  let correctAnswer = '';

  if (comparison === '>') {
    if (num1 > num2) {
      text = `${num1} > ${num2}?`;
      correctAnswer = 'Đúng';
    } else if (num1 < num2) {
      text = `${num1} > ${num2}?`;
      correctAnswer = 'Sai';
    } else {
      return generateComparisonQuestion(id); // Both equal, regenerate
    }
  } else if (comparison === '<') {
    if (num1 < num2) {
      text = `${num1} < ${num2}?`;
      correctAnswer = 'Đúng';
    } else if (num1 > num2) {
      text = `${num1} < ${num2}?`;
      correctAnswer = 'Sai';
    } else {
      return generateComparisonQuestion(id);
    }
  } else {
    // comparison === '='
    if (num1 === num2) {
      text = `${num1} = ${num2}?`;
      correctAnswer = 'Đúng';
    } else {
      text = `${num1} = ${num2}?`;
      correctAnswer = 'Sai';
    }
  }

  const options = ['Đúng', 'Sai'].sort(() => Math.random() - 0.5);

  return {
    id,
    text,
    options,
    correctAnswer,
    type: 'comparison',
  };
}

/**
 * Generate a set of questions for a game
 * @param count Number of questions to generate
 * @returns Array of questions
 */
export function generateQuestions(count: number = 10): Question[] {
  const questions: Question[] = [];

  for (let i = 0; i < count; i++) {
    const id = `q${i + 1}`;
    const type = Math.random() > 0.5 ? 'arithmetic' : 'comparison';

    const question =
      type === 'arithmetic'
        ? generateArithmeticQuestion(id)
        : generateComparisonQuestion(id);

    questions.push(question);
  }

  return questions;
}

/**
 * Generate a single question
 */
export function generateSingleQuestion(id: string): Question {
  return Math.random() > 0.5
    ? generateArithmeticQuestion(id)
    : generateComparisonQuestion(id);
}

/**
 * Example usage:
 * const questions = generateQuestions(10);
 * console.log(questions[0]);
 * // {
 * //   id: 'q1',
 * //   text: '5 + 3 = ?',
 * //   options: ['8', '6', '9', '7'],
 * //   correctAnswer: '8',
 * //   type: 'arithmetic'
 * // }
 */
