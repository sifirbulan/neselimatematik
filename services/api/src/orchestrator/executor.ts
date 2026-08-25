import type { ProviderExecutor } from "./types.js";

const executors = new Map<string, ProviderExecutor>();

export function registerExecutor(executor: ProviderExecutor): void {
  executors.set(executor.providerId, executor);
}

export function getExecutor(providerId: string): ProviderExecutor | undefined {
  return executors.get(providerId);
}

export function getRegisteredProviderIds(): string[] {
  return [...executors.keys()];
}

export function clearExecutorsForTests(): void {
  executors.clear();
}
