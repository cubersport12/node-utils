import { program } from 'commander';
import { existsSync } from 'node:fs';
import { globSync } from 'glob';
import { CommandType, Options } from './utils';
import * as process from 'node:process';
import { getCommand } from './command-factory';
import { extname } from 'node:path';

program
  .requiredOption('-c, --command <command>', 'Команда')
  .requiredOption('-r, --root <path to folder>', 'Путь до папки')
  .requiredOption('-f, --file <path to file>', 'Путь до файла с иконками')
  .option('-a, --alias <use alias or path to alias>', 'Автоматически определять алиас или свой алиас');
program.parse();

const options = program.opts<Options>();

let ext: string = '.*';
switch (options.command) {
  case CommandType.Migrate:
    ext = '.{html,ts}';
    break;
  case CommandType.ExtractFromCss:
    ext = '.css';
    break;
  default:
}
const path = extname(options.root) ? options.root : `${options.root}/**/*${ext}`;
const files = globSync(path, { absolute: true });

if (!existsSync(options.file)) {
  program.error(`Не найден файл куда сложить собранные иконки`);
}

const command = getCommand(options.command);
files.forEach((file) => {
  command.handle(file, options);
});

process.exit(1);
