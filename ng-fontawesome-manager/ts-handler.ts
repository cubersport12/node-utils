import {
  defineFieldInInjectableClass,
  FIELD_ICONS_NAME,
  FileHandler,
  FONTAWESOME_ICON_PREFIX, FONTAWESOME_TYPE_PREFIX,
  getMemberNameFromIcon,
  hasFontAwesome,
  Options,
  parseTsFile, saveTsFile, updateIconsInTsFile,
} from './utils';
import ts from 'typescript';

export class TsHandler implements FileHandler {
  handle(file: string, options: Options): void {
    const sourceFile = parseTsFile(file);
    sourceFile.forEachChild((node) => {
      if (ts.isClassDeclaration(node)) {
        const modifiers = node.modifiers;
        const decorator = modifiers?.find(x => ts.isDecorator(x));

        const txt = decorator?.getText();
        const icons = new Set<string>();
        if (txt?.includes('Component') || txt?.includes('Injectable')) {
          const printer = ts.createPrinter();
          let result = printer.printNode(ts.EmitHint.Unspecified, sourceFile, ts.createSourceFile('print.ts', '', ts.ScriptTarget.Latest));
          let hasChanges = false;
          result.split(/('*')/gm).forEach((str) => {
            if (hasFontAwesome(str)) {
              const r = RegExp(String.raw`'${str}'`, 'g');
              const icon = str.replace(FONTAWESOME_TYPE_PREFIX, '').trim();
              result = result.replace(r, `this.${FIELD_ICONS_NAME}.${getMemberNameFromIcon(icon)}`);
              hasChanges = true;
              icons.add(icon);
            }
          });
          if (hasChanges) {
            defineFieldInInjectableClass(file, options);
            updateIconsInTsFile(options.file, Array.from(icons));
            saveTsFile(sourceFile, options.file);
          }
        }
      }
    });
  }
}
