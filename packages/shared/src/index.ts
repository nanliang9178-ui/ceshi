export * from './enums';
export * from './order-state';
export * from './money';

/** 小程序 scene 参数上限为 32 字符，桌码编码需控制在该长度内 */
export const MAX_SCENE_LENGTH = 32;

/** 默认可售时段外提示文案 */
export const STORE_CLOSED_TEXT = '门店休息中，可浏览菜单，营业后即可下单';

/** 分页默认值 */
export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 100;

/** 桌码扫码进入的页面路径 */
export const MP_ENTRY_PAGE = 'pages/menu/index';
