import { WorkspaceFolder } from 'vscode-languageserver';
import { cssModules } from './documents';

export const globalStyleFilesKey = 'global-style-files';

// The example settings
export interface LSPSetting {
  globalStyleFiles: string[];
}

export const setting: {
  workspaceFolder?: WorkspaceFolder;
  lsp: LSPSetting;
  setLSP: (lsp: LSPSetting) => void;
  setWorkspaceFolder: (folder?: WorkspaceFolder) => void;
} = {
  lsp: {
    globalStyleFiles: [],
  },
  setLSP(lsp: LSPSetting) {
    this.lsp = lsp;

    // resolve global style files
    cssModules.resolvesGlobalClassNames();
  },
  setWorkspaceFolder(folder?: WorkspaceFolder) {
    this.workspaceFolder = folder;

    // resolve global style files
    cssModules.resolvesGlobalClassNames();
  },
};
