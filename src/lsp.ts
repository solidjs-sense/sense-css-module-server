import { createConnection, ProposedFeatures, TextDocuments } from 'vscode-languageserver/node';
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
      getText(start: number, end: number) {
        return doc.getText({
          start: doc.positionAt(start),
          end: doc.positionAt(end),
        });
      },
    };
  }
  const fsPath = Uri.URI.parse(uri).fsPath;
  const tDoc = tempDocuments.get(uri);
  if (existsSync(fsPath)) {
    return {
      getText(start: number, end: number) {
        const mtime = statSync(fsPath).mtimeMs;
        const content = mtime === tDoc?.mtime ? tDoc.content : readFileSync(fsPath, { encoding: 'utf-8' });
        tempDocuments.set(uri, {
          mtime,
          content,
        });
        return content.slice(start, end);
      },
    };
  }
};
