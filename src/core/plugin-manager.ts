import { BuiltinMainService, MainServiceContext } from "src/core/main-services";

export class BuiltinPluginManager {
  constructor(private readonly services: BuiltinMainService[]) {}

  activate(context: MainServiceContext): void {
    for (const service of this.services) {
      service.activate(context);
    }
  }
}

export function createBuiltinPluginManager(
  services: BuiltinMainService[],
): BuiltinPluginManager {
  return new BuiltinPluginManager(services);
}
