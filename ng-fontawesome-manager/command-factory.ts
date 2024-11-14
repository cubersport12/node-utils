import { CommandType, FileHandler } from './utils';
import { MigrateCommand } from './migrate';
import { ExtractCss } from './extract-css';

export const getCommand = (c: CommandType): FileHandler => {
  switch (c) {
    case CommandType.Migrate:
      return new MigrateCommand();
    case CommandType.ExtractFromCss:
      return new ExtractCss();
    default:
      throw new Error();
  }
};
