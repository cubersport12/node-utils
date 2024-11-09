import {
  defineByTemplateUrl,
  ENUM_NAME,
  FileHandler, getAlias,
  getFontAwesomeIconName,
  hasFontAwesome,
  isFontAwesomeValue, Options,
} from './utils';
import { parse, HTMLElement } from 'node-html-parser';
import { readFileSync } from 'node:fs';
import { camelCase } from 'lodash';

import * as ts from 'typescript';

type VisitResult = Array<{ element: HTMLElement; attributes: string[] }>;

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
      const camel = camelCase(icon ?? '');
      array.push(`{{${ENUM_NAME}.${camel}}}`);
      element.setAttribute(attr, array.join(' '));
      result.push(element);
    });
    return result;
  }

  handle(file: string, options: Options): void {
    const fileText = readFileSync(file, { encoding: 'utf-8' });
    const rootElement = parse(fileText);
    const result = this._visit(rootElement);
    const changes = result.map(x => this._replace(x)).flat();
    if (changes?.length) {
      const source = defineByTemplateUrl(file, options.file);
      const printer = ts.createPrinter();
      const result = printer.printNode(ts.EmitHint.Unspecified, source, ts.createSourceFile('temp.ts', '', ts.ScriptTarget.Latest));
      console.info(result);
    }
  }
}
