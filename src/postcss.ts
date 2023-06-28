import postcss, { Result } from 'postcss';
import postLess from 'postcss-less';
import postScss from 'postcss-scss';
import postModules from 'postcss-modules';
import { extname } from 'path';

const syntaxMap: Record<string, typeof postLess | typeof postScss> = {
  less: postLess,
  scss: postScss,
};

const getSyntax = (id: string) => {
  return syntaxMap[extname(id).slice(1)];
};

export const getCssModulesNames = async (
  filePath: string,
  code: string,
): Promise<Record<string, [number, number][]>> => {
  let json: Record<string, string> = {};
  const syntax = getSyntax(filePath);

  let res: Result | undefined;

  try {
    res = await postcss([
      postModules({
        getJSON(_cssFilename, outputJson) {
          json = outputJson;
        },
      }),
    ]).process(code, {
      map: false,
      from: filePath,
      syntax,
    });
  } catch (error) {
    //
  }

  if (!res) {
    return {};
  }

  const valueKey: Record<
    string,
    {
      key: string;
      offsets?: [number, number][];
    }
  > = {};

  Object.keys(json).forEach((key) => {
    valueKey[json[key]] = { key };
  });

  res.root.walkRules((node) => {
    if (node.type === 'rule' && node.source && node.source.start && node.source.end) {
      node.selectors.forEach((selector) => {
        if (!selector.startsWith('.')) {
          return;
        }
        const item = valueKey[selector.slice(1)];
        if (item) {
          const offsets = item.offsets || [];
          if (node.source) {
            offsets.push([node.source.start!.offset, node.source.end!.offset]);
          }
          item.offsets = offsets;
        }
      });
    }
  });
  return Object.keys(valueKey).reduce((acc, value) => {
    acc[valueKey[value].key] = valueKey[value].offsets;
    return acc;
  }, {});
};
