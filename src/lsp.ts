import { createConnection, Position, ProposedFeatures, TextDocuments } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import * as Uri from 'vscode-uri';
import { existsSync, readFileSync, statSync } from 'fs';

// Create a connection for the server, using Node's IPC as a transport.
// Also include all preview / proposed LSP features.
export const connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager.
export const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

const tempDocuments = new Map<
  string,
  {
    mtime: number;
    content: string;
  }
>();

export const getTextDocument = (uri: string) => {
  const doc = documents.get(uri);
  if (doc) {
    if (tempDocuments.has(uri)) {
      tempDocuments.delete(uri);
    }
    return {
      getText(start?: number, end?: number) {
        if (start !== undefined && end !== undefined) {
          return doc.getText({
            start: doc.positionAt(start),
            end: doc.positionAt(end),
          });
        }
        return doc.getText();
      },
      positionAt(offset: number) {
        return doc.positionAt(offset);
      },
    };
  }

  const fsPath = Uri.URI.parse(uri).fsPath;
  const tDoc = tempDocuments.get(uri);

  if (existsSync(fsPath)) {
    return {
      getText(start?: number, end?: number) {
        const mtime = statSync(fsPath).mtimeMs;
        const content = mtime === tDoc?.mtime ? tDoc.content : readFileSync(fsPath, { encoding: 'utf-8' });
        tempDocuments.set(uri, {
          mtime,
          content,
        });
        if (start !== undefined && end !== undefined) {
          return content.slice(start, end);
        }
        return content;
      },
      positionAt(offset: number) {
        const lines = this.getText().split('\n');
        let offsetTop = 0;
        let res: Position | undefined;
        lines.some((line, idx) => {
          if (offset <= offsetTop + line.length) {
            res = {
              line: idx,
              character: offset - offsetTop,
            };
            return true;
          }
          offsetTop += line.length + 1; // 1 => \n;
          return false;
        });
        return res;
      },
    };
  }
};
