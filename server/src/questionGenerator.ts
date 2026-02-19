export interface MathQuestion {
  expression: string;
  answer: number;
  difficulty: number;
  displayExpression: string; // HTML-friendly version with math symbols
}

type Operator = '+' | '-' | '×' | '÷';

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function roundTo(val: number, decimals: number): number {
  return Math.round(val * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

/** Level 1: Simple two-operand arithmetic */
function generateLevel1(): MathQuestion {
  const ops: Operator[] = ['+', '-', '×', '÷'];
  const op = ops[randInt(0, 3)];
  let a: number, b: number, answer: number;

  switch (op) {
    case '+':
      a = randInt(5, 99);
      b = randInt(5, 99);
      answer = a + b;
      break;
    case '-':
      a = randInt(20, 99);
      b = randInt(5, a);
      answer = a - b;
      break;
    case '×':
      a = randInt(2, 12);
      b = randInt(2, 12);
      answer = a * b;
      break;
    case '÷':
      b = randInt(2, 12);
      answer = randInt(2, 12);
      a = b * answer; // ensure whole number result
      break;
  }

  const expression = `${a!} ${op} ${b!}`;
  return { expression, displayExpression: expression, answer: answer!, difficulty: 1 };
}

/** Level 2: Three operands with mixed operators and brackets */
function generateLevel2(): MathQuestion {
  const a = randInt(2, 15);
  const b = randInt(2, 15);
  const c = randInt(2, 10);

  const patterns = [
    { expr: `${a} × ${b} + ${c}`, ans: a * b + c },
    { expr: `${a} × ${b} - ${c}`, ans: a * b - c },
    { expr: `(${a} + ${b}) × ${c}`, ans: (a + b) * c },
    { expr: `(${a} - ${b < a ? b : 1}) × ${c}`, ans: (a - (b < a ? b : 1)) * c },
    { expr: `${a * b} ÷ ${a} + ${c}`, ans: b + c },
    { expr: `${a} × ${b} ÷ ${c > 1 ? c : 2}`, ans: roundTo((a * b) / (c > 1 ? c : 2), 1) },
  ];

  const pick = patterns[randInt(0, patterns.length - 1)];
  return {
    expression: pick.expr,
    displayExpression: pick.expr,
    answer: pick.ans,
    difficulty: 2,
  };
}

/** Level 3: Squares, square roots, percentages */
function generateLevel3(): MathQuestion {
  const choice = randInt(0, 2);

  if (choice === 0) {
    // Square of a number
    const n = randInt(5, 20);
    return {
      expression: `${n}²`,
      displayExpression: `${n}²`,
      answer: n * n,
      difficulty: 3,
    };
  } else if (choice === 1) {
    // Percentage
    const pct = [5, 10, 15, 20, 25, 50][randInt(0, 5)];
    const base = randInt(2, 20) * 10;
    const answer = (pct * base) / 100;
    return {
      expression: `${pct}% of ${base}`,
      displayExpression: `${pct}% of ${base}`,
      answer,
      difficulty: 3,
    };
  } else {
    // Square root (perfect squares only)
    const roots = [4, 9, 16, 25, 36, 49, 64, 81, 100, 121, 144, 169, 196, 225];
    const sq = roots[randInt(0, roots.length - 1)];
    return {
      expression: `√${sq}`,
      displayExpression: `√${sq}`,
      answer: Math.sqrt(sq),
      difficulty: 3,
    };
  }
}

/** Level 4: Multi-step complex expressions */
function generateLevel4(): MathQuestion {
  const a = randInt(2, 10);
  const b = randInt(2, 10);
  const c = randInt(2, 10);
  const d = randInt(2, 10);

  const patterns = [
    {
      expr: `${a}² + ${b} × ${c}`,
      ans: a * a + b * c,
    },
    {
      expr: `(${a} + ${b})² - ${c * d}`,
      ans: (a + b) * (a + b) - c * d,
    },
    {
      expr: `${a} × ${b} + ${c} × ${d}`,
      ans: a * b + c * d,
    },
    {
      expr: `(${a} × ${b} - ${c}) ÷ ${d > 0 ? d : 1}`,
      ans: roundTo((a * b - c) / (d > 0 ? d : 1), 1),
    },
  ];

  const pick = patterns[randInt(0, patterns.length - 1)];
  return {
    expression: pick.expr,
    displayExpression: pick.expr,
    answer: pick.ans,
    difficulty: 4,
  };
}

let roundCount = 0;

export function generateQuestion(): MathQuestion {
  roundCount++;

  // Progressive difficulty: cycles through levels as rounds progress
  let level: number;
  if (roundCount <= 3) level = 1;
  else if (roundCount <= 7) level = 2;
  else if (roundCount <= 12) level = 3;
  else {
    // After round 12, random mix of all levels
    level = randInt(1, 4);
  }

  switch (level) {
    case 1: return generateLevel1();
    case 2: return generateLevel2();
    case 3: return generateLevel3();
    case 4: return generateLevel4();
    default: return generateLevel1();
  }
}

export function resetRoundCount(): void {
  roundCount = 0;
}

export function getRoundCount(): number {
  return roundCount;
}
