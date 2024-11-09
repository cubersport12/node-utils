import { program } from 'commander';
import { extname } from 'node:path';
import { globSync } from 'glob';
import { HtmlHandler } from './html-handler';
import { TsHandler } from './ts-handler';
import { Options } from './utils';

program
  .requiredOption('-r, --root <path to folder>', 'Путь до папки')
  .requiredOption('-a, --file <alias or path to file>', 'Путь до файла с иконками');
program.parse();

const options = program.opts<Options>();

const path = `${options.root}/**/*.{html,ts}`;
const files = globSync(path);

export const isHtml = (file: string) => extname(file) === '.html';
export const isTs = (file: string) => extname(file) === '.ts';

const htmlHandler = new HtmlHandler();
const tsHandler = new TsHandler();
files.forEach((file) => {
  if (isHtml(file)) {
    htmlHandler.handle(file, options);
  }

  if (isTs(file)) {
    tsHandler.handle(file, options);
  }
});
