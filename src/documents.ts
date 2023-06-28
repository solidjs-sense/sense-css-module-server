import { existsSync, readdirSync, readFileSync } from 'fs';
import { stat } from 'fs/promises';
import path from 'path';
import { getCssModulesNames } from './postcss';
import * as Uri from 'vscode-uri';
import { setting } from './setting';

class CssModules {
  globalClassNames = new Map<string, Record<string, [number, number][]>>();
  classNames = new Map<string, Record<string, [number, number][]>>();

  async resolvesGlobalClassNames() {
    const resolveStyleByFilePath = async (parentDir: string, filePath: string) => {
      const absPath = path.join(parentDir, filePath);
      if (!existsSync(absPath)) {
        return;
      }
      const st = await stat(absPath);
      if (st.isDirectory()) {
        const list = readdirSync(absPath);
        if (list?.length) {
          for (const filePath of list) {
            await resolveStyleByFilePath(absPath, filePath);
          }
        }
      } else if (st.isFile() && /\.(css|less|scss)$/.test(absPath)) {
        const res = await getCssModulesNames(absPath, readFileSync(absPath, { encoding: 'utf-8' }));
        this.globalClassNames.set(absPath, res);
      }
    };

    if (setting.workspaceFolder && setting.lsp.globalStyleFiles.length) {
      for (const filePath of setting.lsp.globalStyleFiles) {
        await resolveStyleByFilePath(Uri.URI.parse(setting.workspaceFolder.uri).fsPath, filePath);
      }
    }
  }

  async resolveClassNames(filePath: string, code: string) {
    const res = await getCssModulesNames(filePath, code);
    this.classNames.set(filePath, res);
  }
  removeClassNames(filePath: string) {
    this.classNames.delete(filePath);
  }
}

export const cssModules = new CssModules();
