import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Position } from 'vscode-languageserver/node';
import { cssImportStatement } from './constant';

export const getImportStatements = (filePath: string, code: string): string[] => {
  const stylePaths: string[] = [];
  const lines = code.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(cssImportStatement);
    if (!m || !m[2]) {
      continue;
    }
    const importStr = m[2];
    const fp = join(dirname(filePath), importStr);
    if (existsSync(fp)) {
      stylePaths.push(fp);
    }
  }
  return stylePaths;
};

export const getWordAtPosition = (doc: TextDocument, position: Position): string => {
  const pre = doc.getText({
    start: {
      line: position.line,
      character: 0,
    },
    end: position,
  });
  const next = doc.getText({
    start: position,
    end: {
      line: position.line + 1,
      character: 0,
    },
  });
  const preWord = pre.replace(/.*?([^'": ]*)$/, '$1');
  const nextWord = next.replace(/^([^'": ]*)(.|\n|\r)*/, '$1');
  const word = `${preWord}${nextWord}`;
  return word;
};
