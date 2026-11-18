/** 极简小程序 API 声明，避免引入体积较大的官方 typings 包 */
declare const wx: any;
declare function App(options: any): void;
declare function Page(options: any): void;
declare function Component(options: any): void;
declare function getApp<T = any>(): T;
declare function getCurrentPages(): any[];
declare const console: any;
declare function setTimeout(handler: (...args: any[]) => void, timeout?: number, ...args: any[]): number;
declare function clearTimeout(id: number): void;
declare function setInterval(handler: (...args: any[]) => void, timeout?: number, ...args: any[]): number;
declare function clearInterval(id: number): void;
