import {
  defineFieldInInjectableClass,
  FileHandler,
  FONTAWESOME_TYPE_PREFIX,
  getMemberNameFromIcon,
  getFontAwesomeIconName, getTsFileByTemplateUrl,
  hasFontAwesome,
  Options,
  saveTsFile,
  updateIconsInTsFile, FIELD_ICONS_NAME,
} from './utils';
import { parse, HTMLElement } from 'node-html-parser';
import { readFileSync, writeFileSync } from 'node:fs';

type VisitResult = Array<{ element: HTMLElement; attributes: string[]; fileName: string }>;

export class HtmlHandler implements FileHandler {
  private _findElementsWhereHasFa(element: HTMLElement, file: string): VisitResult {
    const result: VisitResult = [];
    element.childNodes.filter(x => x instanceof HTMLElement).forEach((node) => {
      result.push(...this._findElementsWhereHasFa(node, file));
    });

    const { attributes } = element;
    Object.keys(attributes).forEach((attribute) => {
      const value = attributes[attribute];
      if (hasFontAwesome(value) || hasFontAwesome(attribute)) {
        let f = result.find(x => x.element === element);
        if (f == null) {
          f = { element, attributes: [], fileName: file };
          result.push(f);
        }
        f.attributes.push(attribute);
      }
    });
    return result;
  }

  private _processStringContainsIcon(value: string): { icons: string[]; value: string } {
    const newAttrValue: string[] = [];

    const icons: string[] = [];
    value.split(/ (?=(?:[^']*'[^']*')*[^']*$)/)
      .filter(x => x !== FONTAWESOME_TYPE_PREFIX)
      .forEach((part) => {
        const icon = getFontAwesomeIconName(part);
        if (!icon?.length) {
          newAttrValue.push(part);
        }
        else {
          const camel = getMemberNameFromIcon(icon);
          const bindingName = `${FIELD_ICONS_NAME}.${camel}`;
          if (part.includes('\'') || part.includes('"')) {
            if (part.split(' ').length > 2) {
              throw new Error();
            }
            newAttrValue.push(bindingName);
          }
          else {
            newAttrValue.push(`{{${bindingName}}}`);
          }
          icons.push(icon);
        }
      });
    return {
      icons,
      value: newAttrValue.join(' '),
    };
  }

  private _replace(item: VisitResult): Set<string> {
    const result = new Set<string>();
    item.forEach(({ attributes, element, fileName }) => {
      if (attributes.filter(x => hasFontAwesome(element.attributes[x])).length > 1) {
        throw new Error(); // тут пока хз как такое обрабатывать. Наверное никак
      }
      attributes.forEach((attr) => {
        const value = element.attributes[attr];
        if (hasFontAwesome(value)) {
          if (attr === '[ngClass]' || hasFontAwesome(attr)) {
            console.log(`\n${fileName}:1:1 ${attr} не получается обработать. Сам сделай это...\n`);
            return;
          }
          const { icons, value: newAttrValue } = this._processStringContainsIcon(value);
          icons.forEach(i => result.add(i));

          element.setAttribute(attr, newAttrValue);
        }
      });
    });
    return result;
  }

  handle(file: string, options: Options): void {
    const fileText = readFileSync(file, { encoding: 'utf-8' });
    const rootElement = parse(fileText, { voidTag: {
      tags: ['*ngIf', '*ngTemplateOutlet', '*ngSwitchCase', '*cdkVirtualFor', '*ngFor', '[@indicatorRotate]', '[@indicatorRotate90]'],
    } });
    const result = this._findElementsWhereHasFa(rootElement, file);
    const changes = this._replace(result);
    if (changes?.size) {
      const source = defineFieldInInjectableClass(file, options);
      updateIconsInTsFile(options.file, Array.from(changes));
      saveTsFile(source, getTsFileByTemplateUrl(file));
      writeFileSync(file, rootElement.toString(), { encoding: 'utf-8' });
    }
  }
}
