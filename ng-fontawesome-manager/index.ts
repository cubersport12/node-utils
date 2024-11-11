import { program } from 'commander';
import { extname } from 'node:path';
import { existsSync } from 'node:fs';
import { globSync } from 'glob';
import { HtmlHandler } from './html-handler';
import { TsHandler } from './ts-handler';
import { Options } from './utils';
import * as process from 'node:process';

program
  .requiredOption('-r, --root <path to folder>', 'Путь до папки')
  .requiredOption('-f, --file <path to file>', 'Путь до файла с иконками')
  .option('-a, --alias <use alias or path to alias>', 'Автоматически определять алиас или свой алиас');
program.parse();

const options = program.opts<Options>();

const path = `${options.root}/**/*.{html,ts}`;
const files = globSync(path, { absolute: true });

export const isHtml = (file: string) => extname(file) === '.html';
export const isTs = (file: string) => extname(file) === '.ts';

const htmlHandler = new HtmlHandler();
const tsHandler = new TsHandler();
if (!existsSync(options.file)) {
  program.error(`Не найден файл куда сложить собранные иконки`);
}

files.forEach((file) => {
  if (isHtml(file)) {
    htmlHandler.handle(file, options);
  }

  if (isTs(file)) {
    tsHandler.handle(file, options);
  }
});

process.exit(1);
