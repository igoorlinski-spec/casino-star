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
  {
    id: 21,
    question: 'Oblicz: 14 + 27 - 15',
    options: { A: '26', B: '28', C: '30', D: '32' },
    correctAnswer: 'A',
  },
  {
    id: 22,
    question: 'Ile to jest 12 * 8?',
    options: { A: '86', B: '96', C: '106', D: '98' },
    correctAnswer: 'B',
  },
  {
    id: 23,
    question: 'Oblicz: 125 / 5',
    options: { A: '15', B: '20', C: '25', D: '30' },
    correctAnswer: 'C',
  },
  {
    id: 24,
    question: 'Ile wynosi reszta z dzielenia 47 przez 6?',
    options: { A: '5', B: '4', C: '3', D: '2' },
    correctAnswer: 'A',
  },
  {
    id: 25,
    question: 'Oblicz: 2^6',
    options: { A: '32', B: '64', C: '128', D: '16' },
    correctAnswer: 'B',
  },
  {
    id: 26,
    question: 'Oblicz: 3^4',
    options: { A: '27', B: '81', C: '12', D: '64' },
    correctAnswer: 'B',
  },
  {
    id: 27,
    question: 'Ile to jest pierwiastek kwadratowy z 144?',
    options: { A: '12', B: '14', C: '16', D: '10' },
    correctAnswer: 'A',
  },
  {
    id: 28,
    question: 'Ile to jest 15% z 80?',
    options: { A: '10', B: '12', C: '14', D: '16' },
    correctAnswer: 'B',
  },
  {
    id: 29,
    question: 'Oblicz: 4^3 - 3^3',
    options: { A: '37', B: '27', C: '17', D: '47' },
    correctAnswer: 'A',
  },
  {
    id: 30,
    question: 'Ile to jest 0.25 * 400?',
    options: { A: '50', B: '100', C: '150', D: '200' },
    correctAnswer: 'B',
  },
  {
    id: 31,
    question: 'Rozwiąż równanie: 4x - 12 = 0',
    options: { A: '2', B: '3', C: '4', D: '5' },
    correctAnswer: 'B',
  },
  {
    id: 32,
    question: 'Rozwiąż równanie: 2x + 8 = 3x - 2',
    options: { A: '8', B: '10', C: '12', D: '6' },
    correctAnswer: 'B',
  },
  {
    id: 33,
    question: 'Dla jakiego x wyrażenie 5x + 10 jest równe 30?',
    options: { A: '4', B: '5', C: '6', D: '3' },
    correctAnswer: 'A',
  },
  {
    id: 34,
    question: 'Rozwiąż równanie: x / 3 = 9',
    options: { A: '3', B: '27', C: '18', D: '12' },
    correctAnswer: 'B',
  },
  {
    id: 35,
    question: 'Rozwiąż równanie: 7 - x = 2x - 8',
    options: { A: '5', B: '3', C: '4', D: '6' },
    correctAnswer: 'A',
  },
  {
    id: 36,
    question: 'Uprość wyrażenie: (2^3)^2',
    options: { A: '32', B: '64', C: '16', D: '128' },
    correctAnswer: 'B',
  },
  {
    id: 37,
    question: 'Oblicz: √25 * √4',
    options: { A: '10', B: '20', C: '29', D: '7' },
    correctAnswer: 'A',
  },
  {
    id: 38,
    question: 'Ile wynosi (1/2)^-3?',
    options: { A: '1/8', B: '8', C: '4', D: '-8' },
    correctAnswer: 'B',
  },
  {
    id: 39,
    question: 'Oblicz: 10^3 * 10^-1',
    options: { A: '100', B: '1000', C: '10', D: '1' },
    correctAnswer: 'A',
  },
  {
    id: 40,
    question: 'Ile wynosi 5^0?',
    options: { A: '0', B: '5', C: '1', D: '10' },
    correctAnswer: 'C',
  },
  {
    id: 41,
    question: 'Ile wynosi pole kwadratu o obwodzie 24 cm?',
    options: { A: '16 cm²', B: '36 cm²', C: '24 cm²', D: '48 cm²' },
    correctAnswer: 'B',
  },
  {
    id: 42,
    question: 'Długości przyprostokątnych to 3 i 4. Ile wynosi przeciwprostokątna?',
    options: { A: '5', B: '6', C: '7', D: '8' },
    correctAnswer: 'A',
  },
  {
    id: 43,
    question: 'Suma kątów wewnętrznych w czworokącie wypukłym wynosi:',
    options: { A: '180°', B: '360°', C: '90°', D: '540°' },
    correctAnswer: 'B',
  },
  {
    id: 44,
    question: 'Ile wynosi pole koła o promieniu r = 3?',
    options: { A: '3π', B: '6π', C: '9π', D: '12π' },
    correctAnswer: 'C',
  },
  {
    id: 45,
    question: 'Ile wierzchołków ma graniastosłup prawidłowy trójkątny?',
    options: { A: '3', B: '5', C: '6', D: '9' },
    correctAnswer: 'C',
  },
  {
    id: 46,
    question: 'Ile przekątnych ma pięciokąt wypukły?',
    options: { A: '3', B: '4', C: '5', D: '6' },
    correctAnswer: 'C',
  },
  {
    id: 47,
    question: 'Pole trapezu o podstawach 6 i 4 oraz wysokości 5 wynosi:',
    options: { A: '25', B: '50', C: '20', D: '15' },
    correctAnswer: 'A',
  },
  {
    id: 48,
    question: 'Kąt wpisany oparty na półokręgu ma miarę:',
    options: { A: '45°', B: '90°', C: '180°', D: '60°' },
    correctAnswer: 'B',
  },
  {
    id: 49,
    question: 'Objętość sześcianu o krawędzi 4 cm wynosi:',
    options: { A: '16 cm³', B: '64 cm³', C: '96 cm³', D: '32 cm³' },
    correctAnswer: 'B',
  },
  {
    id: 50,
    question: 'Przekątna kwadratu o boku a = 5 wynosi:',
    options: { A: '5√2', B: '5√3', C: '10', D: '2.5√2' },
    correctAnswer: 'A',
  },
  {
    id: 51,
    question: 'Oblicz: log_3(9)',
    options: { A: '2', B: '3', C: '1', D: '9' },
    correctAnswer: 'A',
  },
  {
    id: 52,
    question: 'Oblicz: log_5(125)',
    options: { A: '2', B: '3', C: '4', D: '5' },
    correctAnswer: 'B',
  },
  {
    id: 53,
    question: 'Oblicz: log_2(1)',
    options: { A: '0', B: '1', C: '2', D: '-1' },
    correctAnswer: 'A',
  },
  {
    id: 54,
    question: 'Ile wynosi log_10(0.1)?',
    options: { A: '1', B: '-1', C: '0', D: '10' },
    correctAnswer: 'B',
  },
  {
    id: 55,
    question: 'Oblicz: log_4(2)',
    options: { A: '0.5', B: '2', C: '1', D: '0.25' },
    correctAnswer: 'A',
  },
  {
    id: 56,
    question: 'Dla kąta ostrego alfa, sin(alfa) = 3/5. Ile wynosi cos(alfa)?',
    options: { A: '4/5', B: '3/5', C: '1/5', D: '2/5' },
    correctAnswer: 'A',
  },
  {
    id: 57,
    question: 'Ile wynosi tg(45°)?',
    options: { A: '0', B: '1', C: '√3/3', D: '√3' },
    correctAnswer: 'B',
  },
  {
    id: 58,
    question: 'Zależność sin²(x) + cos²(x) to:',
    options: { A: 'tg(x)', B: '1', C: '0', D: '2' },
    correctAnswer: 'B',
  },
  {
    id: 59,
    question: 'Ile wynosi cos(90°)?',
    options: { A: '0', B: '1', C: '-1', D: '0.5' },
    correctAnswer: 'A',
  },
  {
    id: 60,
    question: 'Ile wynosi sin(90°)?',
    options: { A: '0', B: '1', C: '-1', D: '0.5' },
    correctAnswer: 'B',
  },
  {
    id: 61,
    question: 'Rzucamy raz symetryczną monetą. Prawdopodobieństwo wyrzucenia orła wynosi:',
    options: { A: '1', B: '0.5', C: '0.25', D: '0' },
    correctAnswer: 'B',
  },
  {
    id: 62,
    question: 'Średnia arytmetyczna liczb 2, 4, 6, 8 wynosi:',
    options: { A: '4', B: '5', C: '6', D: '4.5' },
    correctAnswer: 'B',
  },
  {
    id: 63,
    question: 'Mediana zestawu danych: 3, 1, 5, 2, 4 to:',
    options: { A: '2', B: '3', C: '4', D: '2.5' },
    correctAnswer: 'B',
  },
  {
    id: 64,
    question: 'Ile wynosi silnia z 4 (4!)?',
    options: { A: '12', B: '24', C: '6', D: '16' },
    correctAnswer: 'B',
  },
  {
    id: 65,
    question: 'Rzucamy kostką sześcienną. Prawdopodobieństwo wyrzucenia parzystej liczby oczek to:',
    options: { A: '1/2', B: '1/3', C: '2/3', D: '1/6' },
    correctAnswer: 'A',
  },
  {
    id: 66,
    question: 'Średnia geometryczna liczb 4 i 9 wynosi:',
    options: { A: '6.5', B: '6', C: '5', D: '7' },
    correctAnswer: 'B',
  },
  {
    id: 67,
    question: 'W klasie jest 10 chłopców i 15 dziewcząt. Prawdopodobieństwo wylosowania chłopca to:',
    options: { A: '2/5', B: '3/5', C: '1/2', D: '10/15' },
    correctAnswer: 'A',
  },
  {
    id: 68,
    question: 'Ile wynosi silnia z 0 (0!)?',
    options: { A: '0', B: '1', C: 'Niezdefiniowana', D: '-1' },
    correctAnswer: 'B',
  },
  {
    id: 69,
    question: 'Ile jest możliwych wyników przy dwukrotnym rzucie monetą?',
    options: { A: '2', B: '4', C: '6', D: '8' },
    correctAnswer: 'B',
  },
  {
    id: 70,
    question: 'Mediana liczb: 1, 3, 3, 6, 8, 9 to:',
    options: { A: '3', B: '4.5', C: '5', D: '6' },
    correctAnswer: 'B',
  },
  {
    id: 71,
    question: 'Wzór skróconego mnożenia: (a+b)² to:',
    options: { A: 'a² + b²', B: 'a² + 2ab + b²', C: 'a² - 2ab + b²', D: 'a² + ab + b²' },
    correctAnswer: 'B',
  },
  {
    id: 72,
    question: 'Postać iloczynowa f(x) = (x-2)(x+3) ma miejsca zerowe w:',
    options: { A: '2 i -3', B: '-2 i 3', C: '2 i 3', D: '-2 i -3' },
    correctAnswer: 'A',
  },
  {
    id: 73,
    question: 'Wierzchołek paraboli y = x² ma współrzędne:',
    options: { A: '(1, 1)', B: '(0, 0)', C: '(0, 1)', D: '(1, 0)' },
    correctAnswer: 'B',
  },
  {
    id: 74,
    question: 'Jeśli delta > 0, to równanie kwadratowe ma:',
    options: { A: '0 rozwiązań', B: '1 rozwiązanie', C: '2 rozwiązania', D: 'Nieskończenie wiele' },
    correctAnswer: 'C',
  },
  {
    id: 75,
    question: 'Rozwiąż: x² - 9 = 0',
    options: { A: '3', B: '-3', C: '3 lub -3', D: '0 lub 9' },
    correctAnswer: 'C',
  },
  {
    id: 76,
    question: 'Rozwiąż nierówność: x² >= 0',
    options: { A: 'x > 0', B: 'Wszystkie liczby rzeczywiste', C: 'x >= 0', D: 'Brak rozwiązań' },
    correctAnswer: 'B',
  },
  {
    id: 77,
    question: 'Ile miejsc zerowych ma funkcja f(x) = x² + 4?',
    options: { A: '0', B: '1', C: '2', D: '4' },
    correctAnswer: 'A',
  },
  {
    id: 78,
    question: 'Równanie x(x-1) = 0 ma rozwiązania:',
    options: { A: '0', B: '1', C: '0 i 1', D: 'Brak' },
    correctAnswer: 'C',
  },
  {
    id: 79,
    question: 'Wyróżnik delta dla y = x² + x + 1 wynosi:',
    options: { A: '1', B: '-3', C: '5', D: '0' },
    correctAnswer: 'B',
  },
  {
    id: 80,
    question: 'Postać kanoniczna y = a(x-p)² + q. Punkt (p,q) to:',
    options: { A: 'Miejsce zerowe', B: 'Wierzchołek', C: 'Punkt przecięcia z OY', D: 'Dowolny punkt' },
    correctAnswer: 'B',
  },
  {
    id: 81,
    question: 'Jeśli kurtka kosztuje 100 zł i obniżono cenę o 30%, nowa cena to:',
    options: { A: '30 zł', B: '70 zł', C: '80 zł', D: '60 zł' },
    correctAnswer: 'B',
  },
  {
    id: 82,
    question: 'Liczba 40 to ile procent liczby 80?',
    options: { A: '20%', B: '50%', C: '40%', D: '60%' },
    correctAnswer: 'B',
  },
  {
    id: 83,
    question: 'Stosunek 2 do 5 to jako ułamek dziesiętny:',
    options: { A: '0.2', B: '0.4', C: '0.5', D: '2.5' },
    correctAnswer: 'B',
  },
  {
    id: 84,
    question: 'Jeśli liczba x stanowi 200% liczby 50, to x wynosi:',
    options: { A: '25', B: '100', C: '150', D: '200' },
    correctAnswer: 'B',
  },
  {
    id: 85,
    question: 'Pracownik zarabiał 3000 zł i dostał 10% podwyżki. Nowa pensja to:',
    options: { A: '3100 zł', B: '3300 zł', C: '3500 zł', D: '3200 zł' },
    correctAnswer: 'B',
  },
  {
    id: 86,
    question: 'Dodaj ułamki: 1/3 + 1/6',
    options: { A: '2/9', B: '1/2', C: '2/3', D: '5/6' },
    correctAnswer: 'B',
  },
  {
    id: 87,
    question: 'Pomnóż ułamki: 2/3 * 3/4',
    options: { A: '6/12', B: '1/2', C: '8/9', D: '5/7' },
    correctAnswer: 'B',
  },
  {
    id: 88,
    question: 'Podziel: 4/5 : 2',
    options: { A: '8/5', B: '2/5', C: '4/10', D: '1/5' },
    correctAnswer: 'B',
  },
  {
    id: 90,
    question: 'Oblicz: 1.5 * 0.4',
    options: { A: '0.6', B: '6', C: '0.06', D: '0.9' },
    correctAnswer: 'A',
  },
  {
    id: 91,
    question: 'Iloczyn zbiorów A={1,2,3} i B={2,3,4} to:',
    options: { A: '{1,2,3,4}', B: '{2,3}', C: '{1,4}', D: '{}' },
    correctAnswer: 'B',
  },
  {
    id: 92,
    question: 'Suma zbiorów A={1,2} i B={2,3} to:',
    options: { A: '{1,2}', B: '{1,2,3}', C: '{2}', D: '{1,3}' },
    correctAnswer: 'B',
  },
  {
    id: 93,
    question: 'Zdanie logiczne p => q to:',
    options: { A: 'Alternatywa', B: 'Implikacja', C: 'Koniunkcja', D: 'Równoważność' },
    correctAnswer: 'B',
  },
  {
    id: 94,
    question: 'Kiedy zdanie p v q (alternatywa) jest fałszywe?',
    options: { A: 'Gdy oba są prawdziwe', B: 'Gdy oba są fałszywe', C: 'Gdy p jest fałszywe', D: 'Nigdy' },
    correctAnswer: 'B',
  },
  {
    id: 95,
    question: 'Kiedy koniunkcja p ^ q jest prawdziwa?',
    options: { A: 'Gdy p jest prawdziwe', B: 'Gdy oba są prawdziwe', C: 'Gdy jedno jest prawdziwe', D: 'Gdy oba są fałszywe' },
    correctAnswer: 'B',
  },
  {
    id: 96,
    question: 'W ciągu arytmetycznym a_1 = 3, r = 2. Ile wynosi a_5?',
    options: { A: '9', B: '11', C: '13', D: '15' },
    correctAnswer: 'B',
  },
  {
    id: 97,
    question: 'W ciągu geometrycznym a_1 = 2, q = 3. Ile wynosi a_3?',
    options: { A: '6', B: '18', C: '12', D: '24' },
    correctAnswer: 'B',
  },
  {
    id: 98,
    question: 'Który ciąg jest arytmetyczny?',
    options: { A: '1, 2, 4, 8', B: '2, 5, 8, 11', C: '1, 3, 9, 27', D: '1, 2, 3, 5' },
    correctAnswer: 'B',
  },
  {
    id: 99,
    question: 'Różnica ciągu arytmetycznego 10, 7, 4, 1 wynosi:',
    options: { A: '3', B: '-3', C: '2', D: '-2' },
    correctAnswer: 'B',
  },
  {
    id: 100,
    question: 'Suma pierwszych trzech wyrazów ciągu a_n = 2n wynosi:',
    options: { A: '6', B: '12', C: '8', D: '10' },
    correctAnswer: 'B',
  },
  {
    id: 101,
    question: 'Granica lim (x->3) (2x + 1) wynosi:',
    options: { A: '6', B: '7', C: '8', D: '5' },
    correctAnswer: 'B',
  },
  {
    id: 102,
    question: 'Pochodna stałej f(x) = 5 wynosi:',
    options: { A: '5', B: '0', C: '1', D: 'x' },
    correctAnswer: 'B',
  },
  {
    id: 103,
    question: 'Granica lim (x->infinity) (1/x) wynosi:',
    options: { A: 'infinity', B: '0', C: '1', D: 'nie istnieje' },
    correctAnswer: 'B',
  },
  {
    id: 104,
    question: 'Pochodna funkcji f(x) = sin(x) to:',
    options: { A: '-cos(x)', B: 'cos(x)', C: 'tg(x)', D: 'sin(x)' },
    correctAnswer: 'B',
  },
  {
    id: 105,
    question: 'Pochodna funkcji f(x) = e^x to:',
    options: { A: 'xe^(x-1)', B: 'e^x', C: 'ln(x)', D: '1/e^x' },
    correctAnswer: 'B',
  },
  {
    id: 106,
    question: 'Jeśli log_a(b) = c, to:',
    options: { A: 'a^b = c', B: 'a^c = b', C: 'b^c = a', D: 'c^a = b' },
    correctAnswer: 'B',
  },
  {
    id: 107,
    question: 'Ile to jest 2^10?',
    options: { A: '512', B: '1024', C: '2048', D: '4096' },
    correctAnswer: 'B',
  },
  {
    id: 108,
    question: 'Wartość bezwzględna |-5| wynosi:',
    options: { A: '-5', B: '5', C: '0', D: '1/5' },
    correctAnswer: 'B',
  },
  {
    id: 109,
    question: 'Rozwiąż: |x| = 3',
    options: { A: '3', B: '-3', C: '3 lub -3', D: 'Brak' },
    correctAnswer: 'C',
  },
  {
    id: 110,
    question: 'Dziedzina funkcji f(x) = 1/x to:',
    options: { A: 'Liczby rzeczywiste', B: 'Rzeczywiste bez zera', C: 'Liczby dodatnie', D: 'Rzeczywiste bez 1' },
    correctAnswer: 'B',
  },
  {
    id: 111,
    question: 'Ile to jest 10! / 9! ?',
    options: { A: '90', B: '10', C: '1', D: '9' },
    correctAnswer: 'B',
  },
  {
    id: 112,
    question: 'Liczba pi (π) wynosi w zaokrągleniu do 2 miejsc po przecinku:',
    options: { A: '3.12', B: '3.14', C: '3.16', D: '3.18' },
    correctAnswer: 'B',
  },
  {
    id: 113,
    question: 'Suma kątów wewnętrznych pięciokąta wynosi:',
    options: { A: '360°', B: '540°', C: '720°', D: '180°' },
    correctAnswer: 'B',
  },
  {
    id: 114,
    question: 'Rozwiąż równanie: x^3 = 8',
    options: { A: '2', B: '-2', C: '4', D: '2 lub -2' },
    correctAnswer: 'A',
  },
  {
    id: 115,
    question: 'Przekątna sześcianu o krawędzi a = 2 wynosi:',
    options: { A: '2√2', B: '2√3', C: '4', D: '2' },
    correctAnswer: 'B',
  },
  {
    id: 116,
    question: 'Dla jakiego x ułamek (x-3)/(x-2) nie ma sensu liczbowego?',
    options: { A: '3', B: '2', C: '0', D: '1' },
    correctAnswer: 'B',
  },
  {
    id: 117,
    question: 'Uprość wyrażenie: log(2) + log(5)',
    options: { A: 'log(7)', B: '1', C: 'log(2.5)', D: '10' },
    correctAnswer: 'B',
  },
  {
    id: 118,
    question: 'Liczba pierwsza to liczba naturalna większa od 1, która:',
    options: { A: 'Dzieli się tylko przez 2', B: 'Dzieli się tylko przez 1 i samą siebie', C: 'Jest parzysta', D: 'Dzieli się przez 3' },
    correctAnswer: 'B',
  },
  {
    id: 119,
    question: 'Najmniejszą liczbą pierwszą jest:',
    options: { A: '1', B: '2', C: '3', D: '0' },
    correctAnswer: 'B',
  },
  {
    id: 120,
    question: 'Ile to jest 9^(1/2) ?',
    options: { A: '4.5', B: '3', C: '81', D: '1' },
    correctAnswer: 'B',
  }
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
