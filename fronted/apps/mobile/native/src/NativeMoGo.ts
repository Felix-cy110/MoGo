import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

// JSON is a transport envelope, not a second implementation of the domain model.
export interface Spec extends TurboModule {
  execute(method: string, payload: string): Promise<string>;
}
export default TurboModuleRegistry.getEnforcing<Spec>('NativeMoGo');
