import {
  defineFieldInInjectableClass,
  FIELD_ICONS_NAME,
  FileHandler,
  FONTAWESOME_TYPE_PREFIX,
  getMemberNameFromIcon,
  hasFontAwesome,
  Options,
  parseTsFile, saveTsFile, updateIconsInTsFile,
} from './utils';
import ts, { ScriptKind } from 'typescript';

export class TsHandler implements FileHandler {
  handle(file: string, options: Options): void {
    const sourceFile = parseTsFile(file);
    if (file === options.file) {
      return;
    }
    sourceFile.forEachChild((node) => {
      if (ts.isClassDeclaration(node)) {
        const modifiers = node.modifiers;
        const decorator = modifiers?.find(x => ts.isDecorator(x));

        const txt = decorator?.getText();
        const icons = new Set<string>();
        if (txt?.includes('Component') || txt?.includes('Injectable') || txt?.includes('Pipe') || txt?.includes('Directive')) {
          let result = sourceFile.getText();
          let hasChanges = false;
          try {
            result.split(/('far fa-.*')/gm).forEach((str) => {
              if (hasFontAwesome(str)) {
                const r = RegExp(String.raw`${str}`, 'g');

                const icon = str.match(/\bfa[\w-]*/g)?.join(' ').trim() ?? '';
                let replaceTo = `this.${FIELD_ICONS_NAME}.${getMemberNameFromIcon(icon)}`;
                const matched = str.match(/(?:^|\s)(?!fa)([\w-]+)/gm);
                if (matched?.length) {
                  replaceTo = `${replaceTo} + ' ${matched.join(' ')}'`;
                }
                result = result.replace(r, replaceTo);
                hasChanges = true;
                icons.add(icon);
              }
            });
            if (hasChanges) {
              const newFile = ts.createSourceFile(file, result, ts.ScriptTarget.Latest, true, ScriptKind.TS);
              const updateFile = defineFieldInInjectableClass(newFile, options);
              updateIconsInTsFile(options.file, Array.from(icons));
              saveTsFile(updateFile, file);
            }
          }
          catch (e) {
            console.error(`\r\n${file}:1:1\r\n${String(e)}`);
          }
        }
      }
    });
  }
}
