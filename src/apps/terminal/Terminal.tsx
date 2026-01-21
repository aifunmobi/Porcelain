import { useState, useRef, useEffect, useCallback } from 'react';
import { useFileSystemStore } from '../../stores/fileSystemStore';
import { FULL_VERSION } from '../../version';
import type { AppProps } from '../../types';
import './Terminal.css';

interface TerminalLine {
  id: number;
  type: 'input' | 'output' | 'error' | 'success';
  content: string;
}

// List of available commands for tab completion
const COMMANDS = [
  'help', 'ls', 'cd', 'pwd', 'cat', 'mkdir', 'touch', 'rm', 'clear', 'echo',
  'date', 'whoami', 'neofetch', 'history', 'head', 'tail', 'wc', 'tree',
  'hostname', 'uptime', 'env', 'export', 'unset', 'alias', 'unalias', 'which',
];

export const Terminal: React.FC<AppProps> = () => {
  const [lines, setLines] = useState<TerminalLine[]>([
    { id: 0, type: 'output', content: `Welcome to Porcelain OS Terminal v${FULL_VERSION}` },
    { id: 1, type: 'output', content: 'Type "help" for available commands.\n' },
  ]);
  const [currentInput, setCurrentInput] = useState('');
  const [currentPath, setCurrentPath] = useState('/');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [envVars, setEnvVars] = useState<Record<string, string>>({
    USER: 'user',
    HOME: '/',
    SHELL: '/bin/psh',
    PWD: '/',
    TERM: 'porcelain-term',
    LANG: 'en_US.UTF-8',
  });
  const [aliases, setAliases] = useState<Record<string, string>>({
    ll: 'ls -l',
    la: 'ls -a',
  });
  const [startTime] = useState(Date.now());
  const inputRef = useRef<HTMLInputElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);
  const lineIdRef = useRef(2);

  const { getFileByPath, getChildren, createFolder, createFile, deleteFile } = useFileSystemStore();

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [lines]);

  const addLine = useCallback((type: 'input' | 'output' | 'error' | 'success', content: string) => {
    setLines((prev) => [...prev, { id: lineIdRef.current++, type, content }]);
  }, []);

  // Update PWD env var when path changes
  useEffect(() => {
    setEnvVars((prev) => ({ ...prev, PWD: currentPath }));
  }, [currentPath]);

  // Get completions for tab
  const getCompletions = useCallback((input: string): string[] => {
    const trimmed = input.trim();
    const parts = trimmed.split(/\s+/);

    // If no space, complete command
    if (parts.length <= 1) {
      return COMMANDS.filter((cmd) => cmd.startsWith(trimmed.toLowerCase()));
    }

    // Otherwise complete path
    const lastPart = parts[parts.length - 1];
    const basePath = lastPart.includes('/')
      ? lastPart.substring(0, lastPart.lastIndexOf('/') + 1)
      : '';
    const prefix = lastPart.includes('/')
      ? lastPart.substring(lastPart.lastIndexOf('/') + 1)
      : lastPart;

    const fullPath = basePath.startsWith('/')
      ? basePath
      : `${currentPath === '/' ? '' : currentPath}/${basePath}`;

    const folder = getFileByPath(fullPath || '/');
    if (folder && folder.type === 'folder') {
      const children = getChildren(folder.id);
      return children
        .filter((f) => f.name.toLowerCase().startsWith(prefix.toLowerCase()))
        .map((f) => basePath + f.name + (f.type === 'folder' ? '/' : ''));
    }
    return [];
  }, [currentPath, getFileByPath, getChildren]);

  const processCommand = useCallback((input: string) => {
    let trimmed = input.trim();
    if (!trimmed) return;

    // Check for alias
    const firstWord = trimmed.split(/\s+/)[0];
    if (aliases[firstWord]) {
      trimmed = aliases[firstWord] + trimmed.slice(firstWord.length);
    }

    // Expand environment variables ($VAR or ${VAR})
    trimmed = trimmed.replace(/\$\{?(\w+)\}?/g, (_, varName) => envVars[varName] || '');

    addLine('input', `${currentPath} $ ${input.trim()}`);

    const [cmd, ...args] = trimmed.split(/\s+/);
    const arg = args.join(' ');

    switch (cmd.toLowerCase()) {
      case 'help':
        addLine('output', `Available commands:
  help              - Show this help message
  ls [path]         - List directory contents
  cd <dir>          - Change directory
  pwd               - Print working directory
  cat <file>        - Display file contents
  head <file>       - Display first 10 lines
  tail <file>       - Display last 10 lines
  wc <file>         - Count lines, words, chars
  mkdir <name>      - Create a directory
  touch <name>      - Create an empty file
  rm <name>         - Remove file or directory
  tree [path]       - Show directory tree
  clear             - Clear the terminal
  echo <text>       - Print text
  date              - Show current date and time
  whoami            - Show current user
  hostname          - Show hostname
  uptime            - Show uptime
  neofetch          - Show system info
  history           - Show command history
  env               - Show environment variables
  export VAR=value  - Set environment variable
  unset VAR         - Remove environment variable
  alias [name=cmd]  - Show or set aliases
  unalias <name>    - Remove alias
  which <cmd>       - Show command type`);
        break;

      case 'ls': {
        const targetPath = arg
          ? (arg.startsWith('/') ? arg : `${currentPath === '/' ? '' : currentPath}/${arg}`)
          : currentPath;
        const folder = getFileByPath(targetPath);
        if (folder && folder.type === 'folder') {
          const children = getChildren(folder.id);
          if (children.length === 0) {
            addLine('output', '(empty directory)');
          } else {
            const output = children
              .sort((a, b) => {
                if (a.type === b.type) return a.name.localeCompare(b.name);
                return a.type === 'folder' ? -1 : 1;
              })
              .map((f) => (f.type === 'folder' ? `📁 ${f.name}/` : `📄 ${f.name}`))
              .join('\n');
            addLine('output', output);
          }
        } else {
          addLine('error', `ls: ${arg || currentPath}: No such directory`);
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
        } else if (arg === '-') {
          // Go to previous directory (OLDPWD)
          const oldPwd = envVars.OLDPWD;
          if (oldPwd) {
            setEnvVars((prev) => ({ ...prev, OLDPWD: currentPath }));
            setCurrentPath(oldPwd);
            addLine('output', oldPwd);
          }
        } else {
          const newPath = arg.startsWith('/')
            ? arg
            : `${currentPath === '/' ? '' : currentPath}/${arg}`;
          const folder = getFileByPath(newPath);
          if (folder && folder.type === 'folder') {
            setEnvVars((prev) => ({ ...prev, OLDPWD: currentPath }));
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

      case 'head': {
        if (!arg) {
          addLine('error', 'head: missing file operand');
        } else {
          const filePath = arg.startsWith('/')
            ? arg
            : `${currentPath === '/' ? '' : currentPath}/${arg}`;
          const file = getFileByPath(filePath);
          if (file && file.type === 'file') {
            const content = (file.content as string) || '';
            const lines = content.split('\n').slice(0, 10);
            addLine('output', lines.join('\n') || '(empty file)');
          } else {
            addLine('error', `head: ${arg}: No such file`);
          }
        }
        break;
      }

      case 'tail': {
        if (!arg) {
          addLine('error', 'tail: missing file operand');
        } else {
          const filePath = arg.startsWith('/')
            ? arg
            : `${currentPath === '/' ? '' : currentPath}/${arg}`;
          const file = getFileByPath(filePath);
          if (file && file.type === 'file') {
            const content = (file.content as string) || '';
            const allLines = content.split('\n');
            const lines = allLines.slice(Math.max(0, allLines.length - 10));
            addLine('output', lines.join('\n') || '(empty file)');
          } else {
            addLine('error', `tail: ${arg}: No such file`);
          }
        }
        break;
      }

      case 'wc': {
        if (!arg) {
          addLine('error', 'wc: missing file operand');
        } else {
          const filePath = arg.startsWith('/')
            ? arg
            : `${currentPath === '/' ? '' : currentPath}/${arg}`;
          const file = getFileByPath(filePath);
          if (file && file.type === 'file') {
            const content = (file.content as string) || '';
            const lines = content.split('\n').length;
            const words = content.split(/\s+/).filter(Boolean).length;
            const chars = content.length;
            addLine('output', `  ${lines}  ${words}  ${chars}  ${arg}`);
          } else {
            addLine('error', `wc: ${arg}: No such file`);
          }
        }
        break;
      }

      case 'tree': {
        const targetPath = arg
          ? (arg.startsWith('/') ? arg : `${currentPath === '/' ? '' : currentPath}/${arg}`)
          : currentPath;

        const buildTree = (folderId: string, prefix: string = ''): string[] => {
          const children = getChildren(folderId);
          const result: string[] = [];
          children.forEach((child, index) => {
            const isLast = index === children.length - 1;
            const connector = isLast ? '└── ' : '├── ';
            const icon = child.type === 'folder' ? '📁' : '📄';
            result.push(`${prefix}${connector}${icon} ${child.name}`);
            if (child.type === 'folder') {
              const newPrefix = prefix + (isLast ? '    ' : '│   ');
              result.push(...buildTree(child.id, newPrefix));
            }
          });
          return result;
        };

        const folder = getFileByPath(targetPath);
        if (folder && folder.type === 'folder') {
          const treeOutput = [`📁 ${folder.name || '/'}`, ...buildTree(folder.id)];
          addLine('output', treeOutput.join('\n'));
        } else {
          addLine('error', `tree: ${arg || currentPath}: No such directory`);
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
            addLine('success', `Created directory: ${arg}`);
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
            addLine('success', `Created file: ${arg}`);
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
            addLine('success', `Removed: ${arg}`);
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
        addLine('output', envVars.USER || 'user');
        break;

      case 'hostname':
        addLine('output', 'porcelain');
        break;

      case 'uptime': {
        const uptimeMs = Date.now() - startTime;
        const seconds = Math.floor(uptimeMs / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        addLine('output', `up ${hours}:${String(minutes % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`);
        break;
      }

      case 'history':
        if (history.length === 0) {
          addLine('output', '(no history)');
        } else {
          addLine('output', history.map((h, i) => `  ${i + 1}  ${h}`).join('\n'));
        }
        break;

      case 'env':
        addLine('output', Object.entries(envVars).map(([k, v]) => `${k}=${v}`).join('\n'));
        break;

      case 'export': {
        if (!arg) {
          addLine('output', Object.entries(envVars).map(([k, v]) => `export ${k}="${v}"`).join('\n'));
        } else {
          const match = arg.match(/^(\w+)=(.*)$/);
          if (match) {
            const [, key, value] = match;
            setEnvVars((prev) => ({ ...prev, [key]: value }));
            addLine('success', `${key}=${value}`);
          } else {
            addLine('error', 'export: invalid format. Use: export VAR=value');
          }
        }
        break;
      }

      case 'unset': {
        if (!arg) {
          addLine('error', 'unset: missing variable name');
        } else {
          setEnvVars((prev) => {
            const newEnv = { ...prev };
            delete newEnv[arg];
            return newEnv;
          });
          addLine('success', `Unset ${arg}`);
        }
        break;
      }

      case 'alias': {
        if (!arg) {
          if (Object.keys(aliases).length === 0) {
            addLine('output', '(no aliases)');
          } else {
            addLine('output', Object.entries(aliases).map(([k, v]) => `alias ${k}='${v}'`).join('\n'));
          }
        } else {
          const match = arg.match(/^(\w+)=(.+)$/);
          if (match) {
            const [, name, command] = match;
            setAliases((prev) => ({ ...prev, [name]: command.replace(/^['"]|['"]$/g, '') }));
            addLine('success', `alias ${name}='${command}'`);
          } else {
            addLine('error', 'alias: invalid format. Use: alias name=command');
          }
        }
        break;
      }

      case 'unalias': {
        if (!arg) {
          addLine('error', 'unalias: missing alias name');
        } else if (aliases[arg]) {
          setAliases((prev) => {
            const newAliases = { ...prev };
            delete newAliases[arg];
            return newAliases;
          });
          addLine('success', `Removed alias: ${arg}`);
        } else {
          addLine('error', `unalias: ${arg}: not found`);
        }
        break;
      }

      case 'which': {
        if (!arg) {
          addLine('error', 'which: missing command');
        } else if (COMMANDS.includes(arg.toLowerCase())) {
          addLine('output', `${arg}: shell builtin`);
        } else if (aliases[arg]) {
          addLine('output', `${arg}: aliased to '${aliases[arg]}'`);
        } else {
          addLine('error', `${arg}: not found`);
        }
        break;
      }

      case 'neofetch':
        addLine('output', `
       .---.                  user@porcelain
      /     \\                 ─────────────────
     | () () |                OS: Porcelain OS ${FULL_VERSION}
      \\  ^  /                 Shell: psh ${FULL_VERSION}
       '---'                  Theme: Soft Porcelain
      /|   |\\                 DE: Porcelain Desktop
     (_|   |_)                Terminal: Terminal.tsx
                              CPU: Your Browser
    🏺 PORCELAIN              Memory: Unlimited*
`);
        break;

      default:
        addLine('error', `${cmd}: command not found`);
    }
  }, [currentPath, addLine, getFileByPath, getChildren, createFolder, createFile, deleteFile, envVars, aliases, history, startTime]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (currentInput.trim()) {
        processCommand(currentInput);
        setHistory((prev) => [...prev, currentInput]);
      }
      setHistoryIndex(-1);
      setCurrentInput('');
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const completions = getCompletions(currentInput);
      if (completions.length === 1) {
        // Single completion - apply it
        const parts = currentInput.trim().split(/\s+/);
        if (parts.length <= 1) {
          setCurrentInput(completions[0] + ' ');
        } else {
          parts[parts.length - 1] = completions[0];
          setCurrentInput(parts.join(' ') + (completions[0].endsWith('/') ? '' : ' '));
        }
      } else if (completions.length > 1) {
        // Multiple completions - show them
        addLine('input', `${currentPath} $ ${currentInput}`);
        addLine('output', completions.join('  '));
      }
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
    } else if (e.key === 'l' && e.ctrlKey) {
      // Ctrl+L to clear
      e.preventDefault();
      setLines([]);
    } else if (e.key === 'c' && e.ctrlKey) {
      // Ctrl+C to cancel current input
      e.preventDefault();
      addLine('input', `${currentPath} $ ${currentInput}^C`);
      setCurrentInput('');
    }
  }, [currentInput, history, historyIndex, processCommand, getCompletions, addLine, currentPath]);

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
