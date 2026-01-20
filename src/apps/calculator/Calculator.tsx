import { useState, useCallback } from 'react';
import type { AppProps } from '../../types';
import './Calculator.css';

export const Calculator: React.FC<AppProps> = () => {
  const [display, setDisplay] = useState('0');
  const [previousValue, setPreviousValue] = useState<number | null>(null);
  const [operator, setOperator] = useState<string | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);
  const [, setHistory] = useState<string[]>([]);

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
  }, []);

  const toggleSign = useCallback(() => {
    setDisplay(String(-parseFloat(display)));
  }, [display]);

  const percentage = useCallback(() => {
    setDisplay(String(parseFloat(display) / 100));
  }, [display]);

  const performOperation = useCallback((nextOperator: string) => {
    const inputValue = parseFloat(display);

    if (previousValue === null) {
      setPreviousValue(inputValue);
    } else if (operator) {
      const currentValue = previousValue;
      let newValue: number;

      switch (operator) {
        case '+':
          newValue = currentValue + inputValue;
          break;
        case '-':
          newValue = currentValue - inputValue;
          break;
        case '×':
          newValue = currentValue * inputValue;
          break;
        case '÷':
          newValue = currentValue / inputValue;
          break;
        default:
          newValue = inputValue;
      }

      const historyEntry = `${currentValue} ${operator} ${inputValue} = ${newValue}`;
      setHistory((prev) => [historyEntry, ...prev].slice(0, 10));

      setDisplay(String(newValue));
      setPreviousValue(newValue);
    }

    setWaitingForOperand(true);
    setOperator(nextOperator);
  }, [display, operator, previousValue]);

  const calculate = useCallback(() => {
    if (operator && previousValue !== null) {
      const inputValue = parseFloat(display);
      let newValue: number;

      switch (operator) {
        case '+':
          newValue = previousValue + inputValue;
          break;
        case '-':
          newValue = previousValue - inputValue;
          break;
        case '×':
          newValue = previousValue * inputValue;
          break;
        case '÷':
          newValue = previousValue / inputValue;
          break;
        default:
          newValue = inputValue;
      }

      const historyEntry = `${previousValue} ${operator} ${inputValue} = ${newValue}`;
      setHistory((prev) => [historyEntry, ...prev].slice(0, 10));

      setDisplay(String(newValue));
      setPreviousValue(null);
      setOperator(null);
      setWaitingForOperand(true);
    }
  }, [display, operator, previousValue]);

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
    <div className="calculator">
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
