import { globSync } from 'glob';
import { dirname, join, relative } from 'path';
import { readFileSync, writeFileSync } from 'fs';
import { NodeType, parse } from 'node-html-parser';
import { program } from 'commander';
import * as ts from 'typescript';
import upperFirst from 'lodash.upperfirst';
import camelCase from 'lodash.camelcase';

program
  .option('--input <input>', 'Input folder path')
  .option('--output <output>', 'Output file name');

program.parse(process.argv);

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

const getPath = (path: string): string => {
  const dname = dirname(require.main?.filename ?? '');
  return join(dname, relative(dname, path));
};

const generate = (options: { inputFolder: string; outputFileName: string }) => {
  const rootFolder = getPath(options.inputFolder);
  const files = globSync(`${rootFolder}/**/*.html`);
  const attributeName = 'data-testid';
  const attributes = new Set<string>();
  files.forEach((path) => {
    const htmlString = readFileSync(path, 'utf-8');
    const html = parse(htmlString);
    html.querySelectorAll('*').forEach((element) => {
      if (element.nodeType === NodeType.ELEMENT_NODE && element.attributes) {
        const attr = element.attributes[attributeName];
        if (attr != null) {
          attributes.add(attr);
        }
      }
    });
  });

  const outPath = getPath(options.outputFileName);
  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
  const enumDeclaration = createEnumDeclaration(
    'MirDataTestIds',
    Array.from(attributes)
  );
  const tsFile = ts.createSourceFile(
    outPath,
    '',
    ts.ScriptTarget.Latest,
    false,
    ts.ScriptKind.TS
  );
  const result = printer.printNode(
    ts.EmitHint.Unspecified,
    enumDeclaration,
    tsFile
  );
  console.info('Generated enum:', outPath);
  writeFileSync(outPath, result, { encoding: 'utf-8' });
};

const options = program.opts();
generate({ inputFolder: options.input, outputFileName: options.output });
