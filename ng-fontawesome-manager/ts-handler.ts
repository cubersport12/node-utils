import { FileHandler } from './utils';
import { readFileSync } from 'node:fs';
import { extname, relative } from 'node:path';
import * as ts from 'typescript';
import { ScriptKind } from 'typescript';

export const parseTsFile = (file: string) => {
  const code = readFileSync(file, { encoding: 'utf-8' });
  return ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true, ScriptKind.TS);
};



export class TsHandler implements FileHandler {
  handle(file: string): void {

  }
}
