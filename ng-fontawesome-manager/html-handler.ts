import {
  FileHandler,
  FONTAWESOME_TYPE_PREFIX,
  getMemberNameFromIcon,
  getFontAwesomeIconName,
  hasFontAwesome,
  Options,
  saveTsFile,
  updateIconsInTsFile, FIELD_ICONS_NAME, defineFieldInInjectableClass, getTsFileByTemplateUrl,
} from './utils';
import { readFileSync, writeFileSync } from 'node:fs';

export class HtmlHandler implements FileHandler {
  private _processStringContainsIcon(value: string): { icons: string[]; value: string } {
    const newAttrValue: string[] = [];

    const icons: string[] = [];
    console.info(value, value.split(/ (?=(?:[^']*'[^']*')*[^']*$)/));
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
            const attrName = part.split('=')[0];

            if (attrName.startsWith('[') && attrName.endsWith(']')) {
              // "_isLoadingExport() ? 'far fa-spinner fa-spin' : 'far fa-file-excel'" - generate regexp string parse far fa- value from string
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

  handle(file: string, options: Options): void {
    let fileText = readFileSync(file, { encoding: 'utf-8' });
    const r = /(\S\w+\S)\s*=\s*["']([^-"' >][^"'>]*)["']/gm;
    const iconsList = new Set<string>();
    fileText.match(r)
      ?.forEach((r) => {
        const [attribute, value] = r.split('=');
        const valueWithoutQuotes = value.replace(/["']/gm, '');
        if (hasFontAwesome(valueWithoutQuotes)) {
          const p = this._processStringContainsIcon(valueWithoutQuotes);
          const newValue = r.replace(valueWithoutQuotes, p.value);
          fileText = fileText.replace(r, newValue);
          p.icons.forEach(i => iconsList.add(i.replace(/["']/gm, '')));
        }
      });
    if (iconsList.size > 0) {
      saveTsFile(defineFieldInInjectableClass(file, options), getTsFileByTemplateUrl(file));
      writeFileSync(file, fileText, { encoding: 'utf-8' });
      updateIconsInTsFile(options.file, Array.from(iconsList));
    }
  }
}
