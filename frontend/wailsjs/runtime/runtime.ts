/* eslint-disable @typescript-eslint/no-explicit-any */

declare global {
  interface Window {
    go?: {
      main?: {
        AppService?: Record<string, (...args: any[]) => Promise<any>>;
      };
    };
  }
}

function callByName(name: string, ...args: any[]): Promise<any> {
  const [service, method] = name.split('.');
  const fn = (window.go?.main as Record<string, Record<string, (...inner: any[]) => Promise<any>>> | undefined)?.[service]?.[method];
  if (typeof fn !== 'function') {
    throw new Error(`Wails runtime not available for ${name}`);
  }
  return fn(...args);
}

export const Call = {
  ByName: callByName,
};
