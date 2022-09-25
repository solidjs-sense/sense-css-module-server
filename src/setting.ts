import { WorkspaceFolder } from 'vscode-languageserver';

// The example settings
export interface LSPSetting {
  globalStyleFiles: string[];
}

export const setting: {
  workspaceFolder?: WorkspaceFolder;
  lsp: LSPSetting;
  setLSP: (lsp: LSPSetting) => void;
  setWorkspaceFolder: (folder: WorkspaceFolder) => void;
} = {
  lsp: {
    globalStyleFiles: [],
  },
  setLSP(lsp: LSPSetting) {
    this.lsp = lsp;
  },
  setWorkspaceFolder(folder: WorkspaceFolder) {
    this.workspaceFolder = folder;
  },
};
