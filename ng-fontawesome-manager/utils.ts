import ts from 'typescript';
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { extname, relative, dirname, join, normalize, basename } from 'node:path';
import { ScriptKind } from 'typescript';
import { globSync } from 'glob';
import { camelCase } from 'lodash';

let alias: string | undefined | null = undefined;
export type Options = {
  root: string;
  extensions: string;
  file: string;
  alias: boolean | string;
};
export interface FileHandler {
  handle(file: string, options: Options): void;
}

export const FONTAWESOME_ICON_PREFIX = 'fa-';
export const FONTAWESOME_TYPE_PREFIX = 'far';
export const STORAGE_NAME = 'MirIcons';
export const FIELD_ICONS_NAME = 'icons';

export const isFontAwesomeValue = (v: string) => v === FONTAWESOME_TYPE_PREFIX || v.startsWith(FONTAWESOME_ICON_PREFIX);
export const hasFontAwesome = (v: string) => v.includes(FONTAWESOME_ICON_PREFIX);
export const getFontAwesomeIconName = (v: string) => {
  const a = v.split(' ');
  return a.filter(x => x.startsWith(FONTAWESOME_ICON_PREFIX)).join(' ').replace(/'/g, '');
};

export const parseTsFile = (file: string) => {
  const code = readFileSync(file, { encoding: 'utf-8' });
  return ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true, ScriptKind.TS);
};

export const getTsFileByTemplateUrl = (templateUrl: string) => {
  let tsFileName = templateUrl;
  if (extname(templateUrl) === '.html') {
    tsFileName = `${templateUrl.replace(extname(templateUrl), '')}.ts`;
  }
  return tsFileName;
};
export const getTemplateUrlByTs = (tsFile: string) => {
  let templateUrl = tsFile;
  if (extname(templateUrl) === '.ts') {
    templateUrl = `${tsFile.replace(extname(tsFile), '')}.html`;
  }
  return templateUrl;
};

export const findComponentClass = (source: ts.SourceFile): ts.ClassDeclaration | undefined => {
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
                  const templateUrl = getTemplateUrlByTs(source.fileName);
                  if (templateUrl.endsWith(htmlFileName)) {
                    klass = node;
                  }
                }
              });
            }
          });
        }
      }
    }
  });

  return klass;
};

export const defineFieldInClass = (classDeclaration: ts.ClassDeclaration) => {
  if (classDeclaration == null) {
    throw new Error();
  }
  const property = ts.factory.createPropertyDeclaration(
    [ts.factory.createToken(ts.SyntaxKind.ProtectedKeyword), ts.factory.createToken(ts.SyntaxKind.ReadonlyKeyword)],
    ts.factory.createIdentifier(FIELD_ICONS_NAME),
    undefined,
    undefined,
    ts.factory.createIdentifier(`inject(${STORAGE_NAME})`),
  );
  const updatedMember = ts.factory.createNodeArray([
    ...classDeclaration?.members ?? [],
    property,
  ]);
  return ts.factory.updateClassDeclaration(classDeclaration,
    classDeclaration?.modifiers, classDeclaration?.name, classDeclaration?.typeParameters, classDeclaration?.heritageClauses, updatedMember,
  );
};

export const hasImport = (source: ts.SourceFile) => {
  return source.statements
    .some(s => ts.isImportDeclaration(s)
      && (s.moduleSpecifier as ts.StringLiteral).text === STORAGE_NAME,
    );
};

export const insertImport = (source: ts.SourceFile, importPath: string) => {
  if (hasImport(source)) {
    return source;
  }
  const iName = normalize(importPath)
    .replace(/\\/g, '/').replace('.ts', '');
  let statements = [...source.statements];
  let foundIcons = false;
  let foundInject = false;
  source.forEachChild((node) => {
    if (ts.isImportDeclaration(node)) {
      node.forEachChild((n) => {
        if (ts.isImportClause(n)) {
          n.forEachChild((c) => {
            if (ts.isNamedImports(c)) {
              const name = c.getText();
              if (name.includes(STORAGE_NAME)) {
                foundIcons = true;
              }
              if (name.includes('inject')) {
                foundInject = true;
              }
            }
          });
        }
      });
    }
  });
  if (!foundIcons) {
    statements = [
      ts.factory.createImportDeclaration(
        undefined,
        ts.factory.createImportClause(
          false,
          undefined,
          ts.factory.createNamedImports(
            [
              ts.factory.createImportSpecifier(
                false,
                undefined,
                ts.factory.createIdentifier(STORAGE_NAME),
              ),
            ],
          ),
        ),
        ts.factory.createStringLiteral(iName, true),
      ),
      ...statements,
    ];
  }
  if (!foundInject) {
    statements = [
      ts.factory.createImportDeclaration(
        undefined,
        ts.factory.createImportClause(
          false,
          undefined,
          ts.factory.createNamedImports(
            [
              ts.factory.createImportSpecifier(
                false,
                undefined,
                ts.factory.createIdentifier('inject'),
              ),
            ],
          ),
        ),
        ts.factory.createStringLiteral('@angular/core', true),
      ),
      ...statements,
    ];
  }

  return ts.factory.updateSourceFile(source, statements);
};

export const defineFieldInInjectableClass = (file: string, { file: toFile, alias: a }: Options): ts.SourceFile => {
  const TRUE = 'true';
  const FALSE = 'false';
  let alias: string | null = null;
  if (a != null) {
    if (a === TRUE || a === FALSE) {
      if (a === TRUE) {
        alias = getAlias(toFile);
      }
    }
    else {
      alias = String(a);
    }
  }
  const tsFile = getTsFileByTemplateUrl(file);
  let source = parseTsFile(tsFile);
  const klass = findComponentClass(source);
  if (klass == null) {
    throw new Error();
  }

  const pathToImport = alias == null ? relative(dirname(tsFile), toFile) : alias;
  const updatedClass = defineFieldInClass(klass);
  source = ts.factory.updateSourceFile(source, [
    ...source.statements.filter(x => !(ts.isClassDeclaration(x) && x.name?.getText() === updatedClass.name?.getText())),
    updatedClass,
  ]);
  return insertImport(source, pathToImport);
};

export const getAlias = (path: string) => {
  if (alias !== undefined) {
    return alias;
  }
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const pathToTsConfig = ts.findConfigFile(path, ts.sys.fileExists);
  if (pathToTsConfig?.length) {
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const configFile = ts.readConfigFile(pathToTsConfig, ts.sys.readFile);
    const compilerOptions = ts.parseJsonConfigFileContent(configFile.config, ts.sys, pathToTsConfig);
    let a: string | null = null;
    Object.keys(compilerOptions.options.paths ?? {})
      .forEach((alias) => {
        const paths = compilerOptions.options.paths?.[alias];
        if (paths?.some((x) => {
          let p = x;
          const joined = join(dirname(pathToTsConfig), x);
          if (x.endsWith('*')) {
            p = `${joined.replace('*', '')}/**/*.ts`;
          }
          else {
            if (existsSync(join(joined, 'index.ts'))) {
              p = `${joined}/**/*.ts`;
            }
          }
          const files = globSync(p);
          return files.some((fileName) => {
            const r = relative(fileName, path);
            return r === '' || r === './';
          });
        })) {
          a = alias;
        }
      });
    alias = a ?? null;
    return alias;
  }
  return null;
};

export const updateIconsInTsFile = (to: string, icons: string[]) => {
  const file = parseTsFile(to);
  let classDecl: ts.ClassDeclaration | undefined = undefined;
  file.forEachChild((node) => {
    if (ts.isClassDeclaration(node)) {
      classDecl = node;
    }
  });
  if (classDecl == null) {
    classDecl = ts.factory.createClassDeclaration(
      [ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
      STORAGE_NAME,
      undefined,
      undefined,
      [],
    );
  }
  const excludeIconsForPrefix = 'fa-spin';
  const members = [
    ...classDecl.members.filter(x => ts.isPropertyDeclaration(x) && !icons.some(i => getMemberNameFromIcon(i) === getMemberNameFromIcon(x.name.getText()))),
    ...icons.map(x => ts.factory.createPropertyDeclaration(
      [ts.factory.createModifier(ts.SyntaxKind.PublicKeyword)],
      getMemberNameFromIcon(x),
      undefined,
      ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
      ts.factory.createStringLiteral(`${excludeIconsForPrefix.includes(x) ? '' : `${FONTAWESOME_TYPE_PREFIX} `}${x}`, true))),
  ];

  // icons.map(x => ts.factory.createEnumMember(kebabCase(x), ts.factory.createStringLiteral(x, true)))
  classDecl = ts.factory.updateClassDeclaration(classDecl, classDecl.modifiers, classDecl.name, classDecl.typeParameters, classDecl.heritageClauses, members);
  const updatedFile = ts.factory.updateSourceFile(file,
    [...file.statements.filter(x => !(ts.isClassDeclaration(x) && x.name?.getText() === STORAGE_NAME)), classDecl],
  );

  saveTsFile(updatedFile, to);
};

export const saveTsFile = (source: ts.SourceFile, to: string) => {
  const printer = ts.createPrinter();
  const result = printer.printNode(ts.EmitHint.Unspecified, source, ts.createSourceFile(basename(to), '', ts.ScriptTarget.Latest));
  writeFileSync(to, result, { encoding: 'utf-8' });
};

export const getMemberNameFromIcon = (icon: string) => camelCase(icon
  .replace(/fa-/g, '')
  .split(' ').join('-'));

export const printSourceFile = (source: ts.SourceFile) => {
  const printer = ts.createPrinter();
  const result = printer.printNode(ts.EmitHint.Unspecified, source, ts.createSourceFile('print.ts', '', ts.ScriptTarget.Latest));
  console.info(result);
};
