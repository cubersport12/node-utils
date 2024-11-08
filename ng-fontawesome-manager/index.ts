import { program } from 'commander';
import { extname } from 'node:path';
import { globSync } from 'glob';
import { HtmlHandler } from './html-handler';
import { TsHandler } from './ts-handler';

program
  .option('-r, --root <path to folder>', 'Путь до папки')
  .option('-f, --file <path to file angular service>', 'Путь до angular сервиса');
program.parse();

const options = program.opts<{
  root: string;
  extensions: string;
  file: string;
}>();

const path = `${options.root}/**/*.{html,ts}`;
const files = globSync(path);

export const isHtml = (file: string) => extname(file) === '.html';
export const isTs = (file: string) => extname(file) === '.ts';

const htmlHandler = new HtmlHandler();
const tsHandler = new TsHandler();
files.forEach((file) => {
  if (isHtml(file)) {
    htmlHandler.handle(file);
  }

  if (isTs(file)) {
    tsHandler.handle(file);
  }
});
