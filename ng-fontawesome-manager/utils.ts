import * as ts from 'typescript';
import { readFileSync, existsSync } from 'node:fs';
import { extname, relative, dirname, join, normalize } from 'node:path';
import { ScriptKind } from 'typescript';
import { kebabCase } from 'lodash';
import { globSync } from 'glob';

export type Options = {
  root: string;
  extensions: string;
  file: string;
};
export interface FileHandler {
  handle(file: string, options: Options): void;
}

export const FONTAWESOME_ICON_PREFIX = 'fa-';
export const FONTAWESOME_TYPE_PREFIX = 'far';
export const ENUM_NAME = 'AppIcons';

export const isFontAwesomeValue = (v: string) => v === FONTAWESOME_TYPE_PREFIX || v.startsWith(FONTAWESOME_ICON_PREFIX);
export const hasFontAwesome = (v: string) => v.includes(FONTAWESOME_ICON_PREFIX);
export const getFontAwesomeIconName = (v: string) => {
  const a = v.split(' ');
  return a.find(x => x.startsWith(FONTAWESOME_ICON_PREFIX));
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

export const defineEnumInClass = (classDeclaration: ts.ClassDeclaration) => {
  if (classDeclaration == null) {
    throw new Error();
  }
  const property = ts.factory.createPropertyDeclaration(
    [ts.factory.createToken(ts.SyntaxKind.ProtectedKeyword), ts.factory.createToken(ts.SyntaxKind.ReadonlyKeyword)],
    ts.factory.createIdentifier(ENUM_NAME),
    undefined,
    undefined,
    ts.factory.createIdentifier(ENUM_NAME),
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
      && (s.moduleSpecifier as ts.StringLiteral).text === ENUM_NAME,
    );
};

export const insertImport = (source: ts.SourceFile, alias: string) => {
  if (hasImport(source)) {
    return source;
  }

  return ts.factory.updateSourceFile(source, [
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
              ts.factory.createIdentifier(ENUM_NAME),
            ),
          ],
        ),
      ),
      ts.factory.createStringLiteral(normalize(alias).replace(/\\/g, '/'), true),
    ),
    ...source.statements,
  ]);
};

export const defineByTemplateUrl = (file: string, toFile: string): ts.SourceFile => {
  const alias = getAlias(toFile);
  const tsFile = getTsFileByTemplateUrl(file);
  let source = parseTsFile(tsFile);
  const klass = findComponentClass(source);
  if (klass == null) {
    throw new Error();
  }

  const pathToImport = alias == null ? relative(file, toFile) : alias;
  const updatedClass = defineEnumInClass(klass);
  source = ts.factory.updateSourceFile(source, [
    ...source.statements.filter(x => !(ts.isClassDeclaration(x) && x.name?.getText() === updatedClass.name?.getText())),
    updatedClass,
  ]);
  return insertImport(source, pathToImport);
};

export const getAlias = (path: string) => {
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
    return a;
  }
  return null;
};
