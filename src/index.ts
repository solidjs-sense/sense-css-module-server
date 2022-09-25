import {
  InitializeParams,
  DidChangeConfigurationNotification,
  CompletionItem,
  TextDocumentPositionParams,
  TextDocumentSyncKind,
  InitializeResult,
  CompletionItemKind,
  Hover,
  Location,
} from 'vscode-languageserver/node';
import * as Uri from 'vscode-uri';

import { setting } from './setting';
import { cssModules } from './documents';
import { cssExtName, cssImportStatement, xsxExtName } from './constant';
import { dirname, join, relative } from 'path';
import { existsSync, readFileSync } from 'fs';
import { connection, documents, getTextDocument } from './lsp';
import { getTokenAt as getNodeAt, isClassNode } from './position';
import { getImportStatements, getWordAtPosition } from './utils';

let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;

connection.onInitialize((params: InitializeParams) => {
  const capabilities = params.capabilities;

  // Does the client support the `workspace/configuration` request?
  // If not, we fall back using global settings.
  hasConfigurationCapability = !!(capabilities.workspace && !!capabilities.workspace.configuration);
  hasWorkspaceFolderCapability = !!(capabilities.workspace && !!capabilities.workspace.workspaceFolders);

  const result: InitializeResult = {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      // Tell the client that this server supports code completion.
      completionProvider: {
        resolveProvider: true,
      },
      hoverProvider: true,
      definitionProvider: true,
    },
  };
  if (hasWorkspaceFolderCapability) {
    result.capabilities.workspace = {
      workspaceFolders: {
        supported: true,
      },
    };
  }
  return result;
});

connection.onInitialized(() => {
  if (hasConfigurationCapability) {
    // Register for all configuration changes.
    connection.client.register(DidChangeConfigurationNotification.type, undefined);
  }
  const getWorkspaceFolders = async () => {
    const workspaceFolders = await connection.workspace.getWorkspaceFolders();
    const workspaceFolder = workspaceFolders?.[workspaceFolders.length - 1];
    setting.setWorkspaceFolder(workspaceFolder);
  };
  if (hasWorkspaceFolderCapability) {
    connection.workspace.onDidChangeWorkspaceFolders(getWorkspaceFolders);
  }
  // init workspaceFolders
  getWorkspaceFolders();
});

connection.onDidChangeConfiguration((change) => {
  const globalSettings = change.settings?.['sense-css-module'];
  if (globalSettings) {
    setting.setLSP(globalSettings);
  }
});

// Only keep settings for open documents
documents.onDidClose((e) => {
  cssModules.removeClassNames(Uri.URI.parse(e.document.uri).fsPath);
});

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent((change) => {
  const uri = Uri.URI.parse(change.document.uri);
  const extname = Uri.Utils.extname(uri);

  if (xsxExtName.test(extname)) {
    const doc = documents.get(change.document.uri);
    if (doc) {
      const filePath = uri.fsPath;
      const stylePaths = getImportStatements(filePath, doc.getText());
      stylePaths.forEach((stylePath) => {
        if (!cssModules.classNames.has(stylePath)) {
          cssModules.resolveClassNames(stylePath, readFileSync(stylePath, { encoding: 'utf-8' }));
        }
      });
    }
  }

  if (cssExtName.test(extname)) {
    cssModules.resolveClassNames(Uri.URI.parse(change.document.uri).fsPath, change.document.getText());
  }
});

// This handler provides the initial list of the completion items.
connection.onCompletion((textDocumentPosition: TextDocumentPositionParams): CompletionItem[] => {
  const uri = Uri.URI.parse(textDocumentPosition.textDocument.uri);
  const extname = Uri.Utils.extname(uri);

  if (!xsxExtName.test(extname)) {
    return [];
  }

  const doc = documents.get(textDocumentPosition.textDocument.uri);
  if (!doc) {
    return [];
  }

  // invalid position
  const content = doc.getText();
  const node = getNodeAt(uri.fsPath, content, doc.offsetAt(textDocumentPosition.position));
  if (!node || !isClassNode(node)) {
    return [];
  }

  const stylePaths: string[] = [];
  const filePath = uri.fsPath;
  const lines = doc.getText().split('\n');

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

  if (!stylePaths.length) {
    return [];
  }

  return stylePaths.reduce<CompletionItem[]>((acc, stylePath) => {
    const modules = cssModules.classNames.get(stylePath);
    if (modules) {
      return acc.concat(
        Object.keys(modules).map((name) => {
          return {
            label: name,
            insertText: name,
            kind: CompletionItemKind.Text,
            data: {
              relativePath: relative(dirname(filePath), stylePath),
              uri: Uri.URI.from({
                scheme: 'file',
                path: stylePath,
              }).toString(),
              ranges: modules[name],
            },
          };
        }),
      );
    }
    return acc;
  }, []);
});

// This handler resolves additional information for the item selected in
// the completion list.
connection.onCompletionResolve((item: CompletionItem): CompletionItem => {
  const data = item.data;
  if (!data) {
    return item;
  }
  const { ranges, relativePath, uri } = data as { ranges: [number, number][]; relativePath: string; uri: string };
  if (!ranges || !uri) {
    return item;
  }
  const doc = getTextDocument(uri);
  if (!doc) {
    return item;
  }
  item.detail = relativePath;
  item.documentation = {
    kind: 'markdown',
    value: ranges
      .map((range) => {
        return [
          `\`\`\`${Uri.Utils.extname(Uri.URI.parse(uri)).slice(1).trim()}`,
          doc.getText(range[0], range[1] + 1),
          '```',
        ].join('\n');
      })
      .join('\n'),
  };
  return item;
});

connection.onHover((params) => {
  const uri = Uri.URI.parse(params.textDocument.uri);
  const extname = Uri.Utils.extname(uri);
  if (!xsxExtName.test(extname)) {
    return;
  }

  const doc = documents.get(params.textDocument.uri);
  if (!doc) {
    return;
  }

  const content = doc.getText();
  const node = getNodeAt(Uri.URI.parse(params.textDocument.uri).fsPath, content, doc.offsetAt(params.position));
  if (node && isClassNode(node)) {
    const word = getWordAtPosition(doc, params.position);
    const stylePaths = getImportStatements(uri.fsPath, doc.getText());
    const values: string[] = [];

    stylePaths.forEach((stylePath) => {
      const styleUri = Uri.URI.file(stylePath);
      const styleDoc = getTextDocument(styleUri.toString());
      if (!styleDoc) {
        return;
      }
      const data = cssModules.classNames.get(stylePath);
      const ranges = data?.[word];
      if (ranges) {
        values.push(
          ...ranges.map((range) => {
            return [
              `\`\`\`${Uri.Utils.extname(styleUri).slice(1).trim()}`,
              styleDoc.getText(range[0], range[1] + 1),
              '```',
            ].join('\n');
          }),
        );
      }
    });

    if (values.length) {
      return {
        contents: {
          kind: 'markdown',
          value: values.join('\n'),
        },
      } as Hover;
    }
  }
  return undefined;
});

connection.onDefinition((params) => {
  const uri = Uri.URI.parse(params.textDocument.uri);
  const extname = Uri.Utils.extname(uri);
  if (!xsxExtName.test(extname)) {
    return;
  }

  const doc = documents.get(params.textDocument.uri);
  if (!doc) {
    return;
  }

  const content = doc.getText();
  const node = getNodeAt(Uri.URI.parse(params.textDocument.uri).fsPath, content, doc.offsetAt(params.position));
  if (node && isClassNode(node)) {
    const word = getWordAtPosition(doc, params.position);
    const stylePaths = getImportStatements(uri.fsPath, doc.getText());
    const res: Location[] = [];

    stylePaths.forEach((stylePath) => {
      const styleUri = Uri.URI.file(stylePath);
      const styleDoc = getTextDocument(styleUri.toString());
      if (!styleDoc) {
        return;
      }
      const data = cssModules.classNames.get(stylePath);
      const ranges = data?.[word];
      if (ranges) {
        ranges.forEach((range) => {
          const start = styleDoc.positionAt(range[0]);
          const end = styleDoc.positionAt(range[1]);
          if (start && end) {
            res.push({
              range: {
                start,
                end,
              },
              uri: styleUri.toString(),
            });
          }
        });
      }
    });

    return res;
  }
  return [];
});

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();
