import { useState, useRef, useEffect, useCallback } from 'react';
import { useFileSystemStore } from '../../stores/fileSystemStore';
import type { AppProps } from '../../types';
import './Terminal.css';

interface TerminalLine {
  id: number;
  type: 'input' | 'output' | 'error';
  content: string;
}

export const Terminal: React.FC<AppProps> = () => {
  const [lines, setLines] = useState<TerminalLine[]>([
    { id: 0, type: 'output', content: 'Welcome to Porcelain OS Terminal' },
    { id: 1, type: 'output', content: 'Type "help" for available commands.\n' },
  ]);
  const [currentInput, setCurrentInput] = useState('');
  const [currentPath, setCurrentPath] = useState('/');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);
  const lineIdRef = useRef(2);

  const { getFileByPath, getChildren, createFolder, createFile, deleteFile } = useFileSystemStore();

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [lines]);

  const addLine = useCallback((type: 'input' | 'output' | 'error', content: string) => {
    setLines((prev) => [...prev, { id: lineIdRef.current++, type, content }]);
  }, []);

  const processCommand = useCallback((input: string) => {
    const trimmed = input.trim();
    if (!trimmed) return;

    addLine('input', `${currentPath} $ ${trimmed}`);

    const [cmd, ...args] = trimmed.split(/\s+/);
    const arg = args.join(' ');

    switch (cmd.toLowerCase()) {
      case 'help':
        addLine('output', `Available commands:
  help          - Show this help message
  ls            - List directory contents
  cd <dir>      - Change directory
  pwd           - Print working directory
  cat <file>    - Display file contents
  mkdir <name>  - Create a directory
  touch <name>  - Create an empty file
  rm <name>     - Remove file or directory
  clear         - Clear the terminal
  echo <text>   - Print text
  date          - Show current date and time
  whoami        - Show current user
  neofetch      - Show system info`);
        break;

      case 'ls': {
        const folder = getFileByPath(currentPath);
        if (folder && folder.type === 'folder') {
          const children = getChildren(folder.id);
          if (children.length === 0) {
            addLine('output', '(empty directory)');
          } else {
            const output = children
              .map((f) => (f.type === 'folder' ? `📁 ${f.name}/` : `📄 ${f.name}`))
              .join('\n');
            addLine('output', output);
          }
        }
        break;
      }

      case 'cd': {
        if (!arg || arg === '~' || arg === '/') {
          setCurrentPath('/');
        } else if (arg === '..') {
          const parts = currentPath.split('/').filter(Boolean);
          parts.pop();
          setCurrentPath('/' + parts.join('/') || '/');
        } else {
          const newPath = arg.startsWith('/')
            ? arg
            : `${currentPath === '/' ? '' : currentPath}/${arg}`;
          const folder = getFileByPath(newPath);
          if (folder && folder.type === 'folder') {
            setCurrentPath(newPath);
          } else {
            addLine('error', `cd: ${arg}: No such directory`);
          }
        }
        break;
      }

      case 'pwd':
        addLine('output', currentPath);
        break;

      case 'cat': {
        if (!arg) {
          addLine('error', 'cat: missing file operand');
        } else {
          const filePath = arg.startsWith('/')
            ? arg
            : `${currentPath === '/' ? '' : currentPath}/${arg}`;
          const file = getFileByPath(filePath);
          if (file && file.type === 'file') {
            addLine('output', (file.content as string) || '(empty file)');
          } else {
            addLine('error', `cat: ${arg}: No such file`);
          }
        }
        break;
      }

      case 'mkdir': {
        if (!arg) {
          addLine('error', 'mkdir: missing operand');
        } else {
          const folder = getFileByPath(currentPath);
          if (folder) {
            createFolder(arg, folder.id);
            addLine('output', `Created directory: ${arg}`);
          }
        }
        break;
      }

      case 'touch': {
        if (!arg) {
          addLine('error', 'touch: missing operand');
        } else {
          const folder = getFileByPath(currentPath);
          if (folder) {
            createFile(arg, folder.id);
            addLine('output', `Created file: ${arg}`);
          }
        }
        break;
      }

      case 'rm': {
        if (!arg) {
          addLine('error', 'rm: missing operand');
        } else {
          const filePath = arg.startsWith('/')
            ? arg
            : `${currentPath === '/' ? '' : currentPath}/${arg}`;
          const file = getFileByPath(filePath);
          if (file) {
            deleteFile(file.id);
            addLine('output', `Removed: ${arg}`);
          } else {
            addLine('error', `rm: ${arg}: No such file or directory`);
          }
        }
        break;
      }

      case 'clear':
        setLines([]);
        break;

      case 'echo':
        addLine('output', arg || '');
        break;

      case 'date':
        addLine('output', new Date().toString());
        break;

      case 'whoami':
        addLine('output', 'user');
        break;

      case 'neofetch':
        addLine('output', `
    ╔═══════════════════════════╗
    ║     🏺 PORCELAIN OS 🏺     ║
    ╠═══════════════════════════╣
    ║  OS: Porcelain OS 1.0     ║
    ║  Shell: psh 1.0           ║
    ║  Theme: Soft Porcelain    ║
    ║  DE: Porcelain Desktop    ║
    ║  Terminal: Terminal.tsx   ║
    ║  CPU: Your Browser        ║
    ║  Memory: Unlimited*       ║
    ╚═══════════════════════════╝
`);
        break;

      default:
        addLine('error', `${cmd}: command not found`);
    }
  }, [currentPath, addLine, getFileByPath, getChildren, createFolder, createFile, deleteFile]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      processCommand(currentInput);
      setHistory((prev) => [...prev, currentInput]);
      setHistoryIndex(-1);
      setCurrentInput('');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length > 0) {
        const newIndex = historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(newIndex);
        setCurrentInput(history[newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex !== -1) {
        const newIndex = historyIndex + 1;
        if (newIndex >= history.length) {
          setHistoryIndex(-1);
          setCurrentInput('');
        } else {
          setHistoryIndex(newIndex);
          setCurrentInput(history[newIndex]);
        }
      }
    }
  }, [currentInput, history, historyIndex, processCommand]);

  const handleTerminalClick = () => {
    inputRef.current?.focus();
  };

  return (
    <div className="terminal" onClick={handleTerminalClick}>
      <div className="terminal__output" ref={terminalRef}>
        {lines.map((line) => (
          <div key={line.id} className={`terminal__line terminal__line--${line.type}`}>
            {line.content}
          </div>
        ))}
        <div className="terminal__input-line">
          <span className="terminal__prompt">{currentPath} $</span>
          <input
            ref={inputRef}
            type="text"
            value={currentInput}
            onChange={(e) => setCurrentInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="terminal__input"
            autoFocus
            spellCheck={false}
          />
        </div>
      </div>
    </div>
  );
};

export default Terminal;
