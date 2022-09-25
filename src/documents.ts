import { getCssModulesNames } from './postcss';

class CssModules {
  classNames = new Map<string, Record<string, [number, number][]>>();

  async resolveClassNames(filePath: string, code: string) {
    const res = await getCssModulesNames(filePath, code);
    this.classNames.set(filePath, res);
  }
  removeClassNames(filePath: string) {
    this.classNames.delete(filePath);
  }
}

export const cssModules = new CssModules();
