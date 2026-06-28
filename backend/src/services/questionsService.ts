// ────────────────────────────────────────────────────────────────────────────
// Math Questions Service - Polish Matura-level questions
// ────────────────────────────────────────────────────────────────────────────

export interface QuestionOption {
  A: string;
  B: string;
  C: string;
  D: string;
}

export interface Question {
  id: number;
  question: string;
  options: QuestionOption;
  correctAnswer: 'A' | 'B' | 'C' | 'D';
}

const QUESTIONS: Question[] = [
  {
    id: 1,
    question: 'Rozwiąż równanie liniowe: 3x + 7 = 22. Ile wynosi x?',
    options: { A: '3', B: '4', C: '5', D: '6' },
    correctAnswer: 'C',
  },
  {
    id: 2,
    question: 'Które z poniższych jest rozwiązaniem równania: x² - 5x + 6 = 0?',
    options: { A: 'x = 1 i x = 6', B: 'x = 2 i x = 3', C: 'x = -2 i x = -3', D: 'x = 0 i x = 5' },
    correctAnswer: 'B',
  },
  {
    id: 3,
    question: 'Oblicz: log₂(32)',
    options: { A: '4', B: '5', C: '6', D: '3' },
    correctAnswer: 'B',
  },
  {
    id: 4,
    question: 'Ile wynosi pole trójkąta o podstawie 8 cm i wysokości 5 cm?',
    options: { A: '20 cm²', B: '40 cm²', C: '13 cm²', D: '16 cm²' },
    correctAnswer: 'A',
  },
  {
    id: 5,
    question: '30% z 200 to:',
    options: { A: '50', B: '60', C: '70', D: '80' },
    correctAnswer: 'B',
  },
  {
    id: 6,
    question: 'Pochodna funkcji f(x) = x³ - 3x² + 2x to:',
    options: { A: '3x² - 6x + 2', B: 'x² - 6x + 2', C: '3x² - 3x + 2', D: '3x² - 6x' },
    correctAnswer: 'A',
  },
  {
    id: 7,
    question: 'Ile wynosi sin(30°)?',
    options: { A: '√3/2', B: '1/2', C: '√2/2', D: '1' },
    correctAnswer: 'B',
  },
  {
    id: 8,
    question: 'Dla jakiego x funkcja f(x) = x² - 4x + 3 osiąga minimum?',
    options: { A: 'x = 1', B: 'x = 2', C: 'x = 3', D: 'x = 4' },
    correctAnswer: 'B',
  },
  {
    id: 9,
    question: 'Oblicz: ∑(i=1 do 10) i = ?',
    options: { A: '45', B: '50', C: '55', D: '60' },
    correctAnswer: 'C',
  },
  {
    id: 10,
    question: 'Ile wynosi obwód koła o promieniu 7 cm? (π ≈ 3,14)',
    options: { A: '43,96 cm', B: '44 cm', C: '21,98 cm', D: '153,86 cm' },
    correctAnswer: 'A',
  },
  {
    id: 11,
    question: 'Rozwiąż nierówność: 2x - 5 > 9. Dla jakich x jest spełniona?',
    options: { A: 'x > 2', B: 'x > 5', C: 'x > 7', D: 'x > 3' },
    correctAnswer: 'C',
  },
  {
    id: 12,
    question: 'Ile wynosi pierwiastek czwarty stopnia z 81?',
    options: { A: '2', B: '3', C: '4', D: '9' },
    correctAnswer: 'B',
  },
  {
    id: 13,
    question: 'Jeśli cena wzrosła o 20% a następnie zmalała o 20%, to całkowita zmiana wynosi:',
    options: { A: '0%', B: '-4%', C: '+4%', D: '-2%' },
    correctAnswer: 'B',
  },
  {
    id: 14,
    question: 'Ile wynosi wyróżnik (delta) dla równania: 2x² - 3x + 1 = 0?',
    options: { A: '1', B: '-1', C: '17', D: '9' },
    correctAnswer: 'A',
  },
  {
    id: 15,
    question: 'Geometryczna interpretacja pochodnej f\'(x₀) to:',
    options: {
      A: 'Pole pod wykresem funkcji',
      B: 'Współczynnik kierunkowy stycznej do wykresu w punkcie x₀',
      C: 'Wartość funkcji w punkcie x₀',
      D: 'Odległość od osi OX',
    },
    correctAnswer: 'B',
  },
  {
    id: 16,
    question: 'Oblicz: log₁₀(1000)',
    options: { A: '2', B: '3', C: '4', D: '100' },
    correctAnswer: 'B',
  },
  {
    id: 17,
    question: 'Ile wynosi cos(60°)?',
    options: { A: '√3/2', B: '1', C: '1/2', D: '0' },
    correctAnswer: 'C',
  },
  {
    id: 18,
    question: 'Ile wynosi suma kątów wewnętrznych trójkąta?',
    options: { A: '90°', B: '180°', C: '270°', D: '360°' },
    correctAnswer: 'B',
  },
  {
    id: 19,
    question: 'Oblicz wartość wyrażenia: 2³ · 2⁴',
    options: { A: '2⁷', B: '2¹²', C: '4⁷', D: '2⁶' },
    correctAnswer: 'A',
  },
  {
    id: 20,
    question: 'Które zdanie jest prawdziwe dla funkcji f(x) = -x² + 4x - 3?',
    options: {
      A: 'Funkcja jest rosnąca dla x > 2',
      B: 'Wierzchołek paraboli jest w punkcie (2, 1)',
      C: 'Funkcja nie ma miejsc zerowych',
      D: 'Ramiona paraboli skierowane są ku górze',
    },
    correctAnswer: 'B',
  },
];

export function getRandomQuestion(): Question {
  const index = Math.floor(Math.random() * QUESTIONS.length);
  return QUESTIONS[index];
}

export function checkAnswer(questionId: number, answer: string): boolean {
  const question = QUESTIONS.find((q) => q.id === questionId);
  if (!question) return false;
  return question.correctAnswer === answer.toUpperCase();
}
