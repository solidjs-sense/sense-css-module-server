import {
  createSourceFile,
  isBinaryExpression,
  isIdentifier,
  isJsxAttribute,
  isNoSubstitutionTemplateLiteral,
  isPropertyAssignment,
  isStringLiteral,
  isTemplateHead,
  isTemplateMiddle,
  isTemplateTail,
  Node,
  ScriptTarget,
} from 'typescript';
import { cssAttributes } from './constant';

const getJsxAttributeParent = (node: Node): Node | undefined => {
  let currentNode = node;
  while (currentNode) {
    if (currentNode.parent && isJsxAttribute(currentNode.parent)) {
      return currentNode.parent;
    }
    currentNode = currentNode.parent;
  }
};

export const getTokenAt = (filePath: string, code: string, startAt: number): Node | undefined => {
  const source = createSourceFile(filePath, code, ScriptTarget.ESNext, true);
  const nodes: Node[] = [source];
  let selectNode: Node | undefined;

  while (nodes.length) {
    const n = nodes.shift();
    if (n) {
      if (n && n.getStart() <= startAt && startAt <= n.getEnd()) {
        if (!selectNode) {
          selectNode = n;
        } else if (n.getStart() >= selectNode.getStart() && n.getEnd() <= selectNode.getEnd()) {
          selectNode = n;
        }
      }
      const children = n.getChildren();
      if (n && children.length > 0) {
        nodes.push(...children);
      }
    }
  }
  return selectNode;
};

export const isClassNode = (node: Node): boolean => {
  const jsxAttribute = getJsxAttributeParent(node);
  const identifier = jsxAttribute?.getChildAt(0);
  if (identifier && cssAttributes.test(identifier.getText())) {
    if (
      isNoSubstitutionTemplateLiteral(node) ||
      isTemplateHead(node) ||
      isTemplateMiddle(node) ||
      isTemplateTail(node)
    ) {
      return true;
    } else if (
      isStringLiteral(node) &&
      !isBinaryExpression(node.parent) &&
      (!isPropertyAssignment(node.parent) || node.parent.getChildAt(0) === node)
    ) {
      return true;
    } else if (isIdentifier(node) && node.parent.getChildAt(0) === node) {
      return true;
    }
  }
  return false;
};
