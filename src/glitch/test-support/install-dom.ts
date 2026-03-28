import { GlobalRegistrator } from "@happy-dom/global-registrator";

export function installDom(): void {
  const globals = globalThis as typeof globalThis & {
    __gojibakeHappyDomInstalled?: boolean;
  };

  if (globals.__gojibakeHappyDomInstalled === true) {
    return;
  }

  GlobalRegistrator.register({
    url: "http://localhost/",
  });
  globals.__gojibakeHappyDomInstalled = true;
}
