import { globSync } from 'glob';
import { dirname, join, relative } from 'path';
import { readFileSync, writeFileSync } from 'fs';
import { program } from 'commander';
import * as ts from 'typescript';
import upperFirst from 'lodash.upperfirst';
import camelCase from 'lodash.camelcase';

program
  .option('--input <input>', 'Input folder path')
  .option('--output <output>', 'Output file name');

program.parse(process.argv);

const getPath = (path: string): string => {
  const dname = dirname(require.main?.filename ?? '');
  return join(dname, relative(dname, path));
};

const createEnumDeclaration = (enumName: string, enumValues: string[]) => {
  // Create members for the enum declaration
  const members = enumValues.map((value) => {
    return ts.factory.createEnumMember(
      upperFirst(camelCase(value)),
      ts.factory.createStringLiteral(value)
    );
  });

  // Create the EnumDeclaration node
  const enumDeclaration = ts.factory.createEnumDeclaration(
    [ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
    ts.factory.createIdentifier(enumName),
    members
  );

  return enumDeclaration;
};

const generate = (options: { inputFolder: string; outputFileName: string }) => {
  const rootFolder = getPath(options.inputFolder);
  const files = globSync(`${rootFolder}/**/*.ts`);
  const attributes = new Set<string>();
  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
  const enumDeclaration = createEnumDeclaration(
    'MirDataTestIds',
    Array.from(attributes)
  );
  const properties: ts.PropertyDeclaration[] = [];
  files.forEach((path) => {
    const sourceCode = readFileSync(path, 'utf8');
    const tsFile = ts.createSourceFile(path, sourceCode, ts.ScriptTarget.Latest, true);


    tsFile.forEachChild(node => {
      if (ts.isClassDeclaration(node)) {
        const classDeclaration = node as ts.ClassDeclaration;
        classDeclaration.members.forEach((member) => {
          if (ts.isPropertyDeclaration(member) && member.modifiers?.some(x => x.kind == ts.SyntaxKind.StaticKeyword)) {
            const memberName = member.name.getText();
            if (memberName.endsWith('PostPath') || memberName.endsWith('DeletePath') || memberName.endsWith('PutPath') || memberName.endsWith('GetPath')) {
              let text = ''
              if (ts.isStringLiteral(member.initializer)) {
                text = member.initializer.text;
              }
              properties.push(ts.factory.createPropertyDeclaration(
                [ts.factory.createToken(ts.SyntaxKind.PublicKeyword), ts.factory.createToken(ts.SyntaxKind.StaticKeyword)], 
                memberName,
                 undefined, 
                 ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
                 ts.factory.createStringLiteral(text, true)
                ));
            }
          }
        })
      }
    })

  });

  const classDecl = ts.factory.createClassDeclaration(
    [ts.factory.createToken(ts.SyntaxKind.ExportKeyword)], 
    ts.factory.createIdentifier('SwaggerUrls'), 
    undefined, 
    undefined, 
    properties
  )

  const outPath = getPath(options.outputFileName);
  const p = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
  const result = p.printNode(ts.EmitHint.Unspecified, classDecl, ts.createSourceFile(outPath, '', ts.ScriptTarget.Latest));

  // const outPath = getPath(options.outputFileName);

  // const tsFile = ts.createSourceFile(
  //   outPath,
  //   '',
  //   ts.ScriptTarget.Latest,
  //   false,
  //   ts.ScriptKind.TS
  // );
  // const result = printer.printNode(
  //   ts.EmitHint.Unspecified,
  //   enumDeclaration,
  //   tsFile
  // );
  // console.info('Generated enum:', outPath);
  writeFileSync(outPath, result, { encoding: 'utf-8' });
};

const options = program.opts();
generate({ inputFolder: options.input, outputFileName: options.output });