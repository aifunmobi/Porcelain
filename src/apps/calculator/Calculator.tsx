import { useState, useCallback, useRef } from 'react';
import type { AppProps } from '../../types';
import './Calculator.css';

/**
 * Show a result the way a desk calculator would: no 0.30000000000000004,
 * no 17-digit thirds, and no bare NaN/Infinity.
 */
const formatResult = (value: number): string => {
  if (!Number.isFinite(value)) return 'Error';
  const rounded = parseFloat(value.toPrecision(12));
  if (Object.is(rounded, -0)) return '0';
  const plain = String(rounded);
  return plain.length > 16 ? rounded.toExponential(8).replace(/\.?0+e/, 'e') : plain;
};

const applyOperator = (a: number, op: string, b: number): number => {
  switch (op) {
    case '+': return a + b;
    case '-': return a - b;
    case '×': return a * b;
    case '÷': return a / b;
    default: return b;
  }
};

export const Calculator: React.FC<AppProps> = () => {
  const [display, setDisplay] = useState('0');
  const [previousValue, setPreviousValue] = useState<number | null>(null);
  const [operator, setOperator] = useState<string | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);
  const [, setHistory] = useState<string[]>([]);
  /** The last "op b" pair, so = pressed again repeats it like a real calculator. */
  const [lastOp, setLastOp] = useState<{ op: string; value: number } | null>(null);

  const inputDigit = useCallback((digit: string) => {
    if (waitingForOperand) {
      setDisplay(digit);
      setWaitingForOperand(false);
    } else {
      setDisplay(display === '0' ? digit : display + digit);
    }
  }, [display, waitingForOperand]);

  const inputDecimal = useCallback(() => {
    if (waitingForOperand) {
      setDisplay('0.');
      setWaitingForOperand(false);
    } else if (!display.includes('.')) {
      setDisplay(display + '.');
    }
  }, [display, waitingForOperand]);

  const clear = useCallback(() => {
    setDisplay('0');
    setPreviousValue(null);
    setOperator(null);
    setWaitingForOperand(false);
    setLastOp(null);
  }, []);

  const toggleSign = useCallback(() => {
    if (display === 'Error') return;
    // Flip the text, not the parsed number, so "5." keeps its decimal point.
    setDisplay(display.startsWith('-') ? display.slice(1) : display === '0' ? '0' : `-${display}`);
  }, [display]);

  const percentage = useCallback(() => {
    if (display === 'Error') return;
    setDisplay(formatResult(parseFloat(display) / 100));
  }, [display]);

  const performOperation = useCallback((nextOperator: string) => {
    if (display === 'Error') return;
    const inputValue = parseFloat(display);

    // An operator pressed straight after another one swaps it: "5 + ×"
    // means "5 ×", it does not compute 5 + 5.
    if (waitingForOperand && previousValue !== null) {
      setOperator(nextOperator);
      return;
    }

    if (previousValue === null) {
      setPreviousValue(inputValue);
    } else if (operator) {
      const newValue = applyOperator(previousValue, operator, inputValue);
      setHistory((prev) => [`${previousValue} ${operator} ${inputValue} = ${newValue}`, ...prev].slice(0, 10));
      setDisplay(formatResult(newValue));
      setPreviousValue(Number.isFinite(newValue) ? newValue : null);
    }

    setWaitingForOperand(true);
    setOperator(nextOperator);
    setLastOp(null);
  }, [display, operator, previousValue, waitingForOperand]);

  const calculate = useCallback(() => {
    if (display === 'Error') return;
    const inputValue = parseFloat(display);

    if (operator && previousValue !== null) {
      const newValue = applyOperator(previousValue, operator, inputValue);
      setHistory((prev) => [`${previousValue} ${operator} ${inputValue} = ${newValue}`, ...prev].slice(0, 10));
      setDisplay(formatResult(newValue));
      setPreviousValue(null);
      setOperator(null);
      setWaitingForOperand(true);
      setLastOp({ op: operator, value: inputValue });
    } else if (lastOp) {
      // = again repeats the last operation: 2 + 3 = = = → 5, 8, 11.
      const newValue = applyOperator(inputValue, lastOp.op, lastOp.value);
      setDisplay(formatResult(newValue));
      setWaitingForOperand(true);
    }
  }, [display, operator, previousValue, lastOp]);

  // Keyboard: digits, . + - * / Enter = Escape Backspace %.
  const rootRef = useRef<HTMLDivElement>(null);
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const k = e.key;
      const run = (fn: () => void) => {
        e.preventDefault();
        fn();
      };
      if (/^[0-9]$/.test(k)) return run(() => inputDigit(k));
      if (k === '.' || k === ',') return run(inputDecimal);
      if (k === '+' || k === '-') return run(() => performOperation(k));
      if (k === '*' || k === 'x' || k === 'X') return run(() => performOperation('×'));
      if (k === '/') return run(() => performOperation('÷'));
      if (k === 'Enter' || k === '=') return run(calculate);
      if (k === 'Escape' || k === 'Delete') return run(clear);
      if (k === '%') return run(percentage);
      if (k === 'Backspace') {
        return run(() => {
          if (waitingForOperand || display === 'Error') return;
          setDisplay(display.length > 1 && display !== '-0' ? display.slice(0, -1) : '0');
        });
      }
    },
    [inputDigit, inputDecimal, performOperation, calculate, clear, percentage, waitingForOperand, display]
  );

  const buttons = [
    { label: 'AC', action: clear, type: 'function' },
    { label: '±', action: toggleSign, type: 'function' },
    { label: '%', action: percentage, type: 'function' },
    { label: '÷', action: () => performOperation('÷'), type: 'operator' },
    { label: '7', action: () => inputDigit('7'), type: 'number' },
    { label: '8', action: () => inputDigit('8'), type: 'number' },
    { label: '9', action: () => inputDigit('9'), type: 'number' },
    { label: '×', action: () => performOperation('×'), type: 'operator' },
    { label: '4', action: () => inputDigit('4'), type: 'number' },
    { label: '5', action: () => inputDigit('5'), type: 'number' },
    { label: '6', action: () => inputDigit('6'), type: 'number' },
    { label: '-', action: () => performOperation('-'), type: 'operator' },
    { label: '1', action: () => inputDigit('1'), type: 'number' },
    { label: '2', action: () => inputDigit('2'), type: 'number' },
    { label: '3', action: () => inputDigit('3'), type: 'number' },
    { label: '+', action: () => performOperation('+'), type: 'operator' },
    { label: '0', action: () => inputDigit('0'), type: 'number', wide: true },
    { label: '.', action: inputDecimal, type: 'number' },
    { label: '=', action: calculate, type: 'operator' },
  ];

  return (
    <div className="calculator" ref={rootRef} tabIndex={0} onKeyDown={handleKeyDown}>
      <div className="calculator__display">
        <div className="calculator__history">
          {previousValue !== null && operator && (
            <span>{previousValue} {operator}</span>
          )}
        </div>
        <div className="calculator__value">{display}</div>
      </div>
      <div className="calculator__keypad">
        {buttons.map((btn, index) => (
          <button
            key={index}
            className={`calculator__key calculator__key--${btn.type} ${btn.wide ? 'calculator__key--wide' : ''}`}
            onClick={btn.action}
          >
            {btn.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default Calculator;
