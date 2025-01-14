import * as LoaderObject from "./loader";
import * as RendererObject from "./renderer";
import { Loader } from "@galacean/engine";

for (let key in RendererObject) {
  Loader.registerClass(key, RendererObject[key]);
}
for (let key in LoaderObject) {
  Loader.registerClass(key, LoaderObject[key]);
}

export * from "@esotericsoftware/spine-core";
export * from "./loader/index";
export * from "./renderer/index";

export const version = `__buildVersion`;
console.log(`Galacean spine version: ${version}`);
