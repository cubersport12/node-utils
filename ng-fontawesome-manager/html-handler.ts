import {
  ENUM_NAME,
  FileHandler,
  getCamelCaseFaIcon,
  getFontAwesomeIconName,
  hasFontAwesome,
  isFontAwesomeValue,
} from './utils';
import { parse, HTMLElement } from 'node-html-parser';
import { readFileSync } from 'node:fs';
import { parseTsFile } from './ts-handler';
import { extname, relative, resolve } from 'node:path';
import * as ts from 'typescript';

type VisitResult = Array<{ element: HTMLElement; attributes: string[] }>;

const findComponentClass = (file: string): ts.ClassDeclaration | undefined => {
  let tsFileName = file;
  if (extname(file) === '.html') {
    tsFileName = `${file.replace(extname(file), '')}.ts`;
  }
  const source = parseTsFile(tsFileName);
  let klass: ts.ClassDeclaration | undefined = undefined;
  source.forEachChild((node) => {
    if (klass != null) {
      return;
    }
    if (ts.isClassDeclaration(node)) {
      const modifiers = node.modifiers;
      const componentDecorator = modifiers?.find(x => ts.isDecorator(x));

      if (componentDecorator != null) {
        const args = componentDecorator.expression;
        if (ts.isCallExpression(args)) {
          args.arguments.forEach((a) => {
            if (ts.isObjectLiteralExpression(a)) {
              a.properties.forEach((x) => {
                const [key, value] = x.getText().split(':');
                if (key === 'templateUrl') {
                  const htmlFileName = value
                    .replace(/'/g, '')
                    .replace('./', '')
                    .replace(' ', '');
                  if (file.endsWith(htmlFileName)) {
                    klass = node;
                  }
                }
              });
            }
          });
        }
        console.info(args);
      }
    }
  });

  return klass;
};

const addEnumToComponent = (file: string): ts.ClassDeclaration => {
  const klass = findComponentClass(file);
  if (klass == null) {
    throw new Error();
  }
  const property = ts.factory.createPropertyDeclaration(
    [ts.factory.createToken(ts.SyntaxKind.ProtectedKeyword), ts.factory.createToken(ts.SyntaxKind.ReadonlyKeyword)],
    ts.factory.createIdentifier('AppIcons'),
    undefined,
    undefined,
    ts.factory.createIdentifier('AppIcons'),
  );
  const updatedMember = ts.factory.createNodeArray([
    ...klass?.members ?? [],
    property,
  ]);
  return ts.factory.updateClassDeclaration(klass,
    klass?.modifiers, klass?.name, klass?.typeParameters, klass?.heritageClauses, updatedMember,
  );
};

export class HtmlHandler implements FileHandler {
  private _visit(element: HTMLElement): VisitResult {
    const result: VisitResult = [];
    element.childNodes.filter(x => x instanceof HTMLElement).forEach((node) => {
      result.push(...this._visit(node));
    });

    const { attributes } = element;
    Object.keys(attributes).forEach((attribute) => {
      const value = attributes[attribute];
      if (hasFontAwesome(value)) {
        let f = result.find(x => x.element === element);
        if (f == null) {
          f = { element, attributes: [] };
          result.push(f);
        }
        f.attributes.push(attribute);
      }
    });
    return result;
  }

  private _replace(item: VisitResult[0]): HTMLElement[] {
    const { attributes, element } = item;
    const result: HTMLElement[] = [];
    attributes.forEach((attr) => {
      if (attr.startsWith('[') && attr.endsWith(']')) {
        throw new Error('NotImplementException');
      }

      const value = element.attributes[attr];
      const array = value.split(' ')
        .filter(x => !isFontAwesomeValue(x));
      const icon = getFontAwesomeIconName(value);
      const camel = getCamelCaseFaIcon(icon ?? '');
      array.push(`{{${ENUM_NAME}.${camel}}}`);
      element.setAttribute(attr, array.join(' '));
      result.push(element);
    });
    return result;
  }

  handle(file: string): void {
    const fileText = readFileSync(file, { encoding: 'utf-8' });
    const rootElement = parse(fileText);
    const result = this._visit(rootElement);
    const changes = result.map(x => this._replace(x)).flat();
    if (changes?.length) {
      const updatedClass = addEnumToComponent(file);
      const printer = ts.createPrinter();
      const result = printer.printNode(ts.EmitHint.Unspecified, updatedClass, ts.createSourceFile('temp.ts', '', ts.ScriptTarget.Latest));
      console.info(result);
    }
  }
}
