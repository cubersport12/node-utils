export interface FileHandler {
  handle(file: string): void;
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
export const getCamelCaseFaIcon = (v: string) => {
  const icon = getFontAwesomeIconName(v);
  return icon?.split('-').map((x) => {
    return `${x[0].toUpperCase()}${x.slice(1)}`;
  }).join('');
};
