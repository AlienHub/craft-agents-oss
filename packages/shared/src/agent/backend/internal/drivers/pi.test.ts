import { describe, expect, it } from 'bun:test';
import { piDriver, resolveAnthropicCompatibleTestBaseUrl } from './pi.ts';

describe('piDriver.buildRuntime custom endpoint models', () => {
  it('preserves explicit per-model supportsImages values', () => {
    const runtime = piDriver.buildRuntime({
      context: {
        provider: 'pi',
        authType: 'api_key',
        resolvedModel: 'vision-model',
        capabilities: { needsHttpPoolServer: false },
        connection: {
          slug: 'custom-endpoint',
          name: 'Custom Endpoint',
          providerType: 'pi',
          authType: 'api_key',
          baseUrl: 'http://127.0.0.1:11111/v1',
          customEndpoint: { api: 'anthropic-messages', supportsImages: true },
          models: [
            { id: 'vision-model', contextWindow: 262_144, supportsImages: true },
            { id: 'text-only-model', supportsImages: false },
            { id: 'plain-model' },
          ],
          createdAt: Date.now(),
        } as any,
      },
      coreConfig: {} as any,
      hostRuntime: {} as any,
      resolvedPaths: {
        piServerPath: '/tmp/pi-agent-server.js',
        interceptorBundlePath: '/tmp/interceptor.cjs',
        nodeRuntimePath: '/usr/bin/node',
      },
    });

    expect(runtime.customModels).toEqual([
      { id: 'vision-model', contextWindow: 262_144, supportsImages: true },
      { id: 'text-only-model', supportsImages: false },
      'plain-model',
    ]);
  });
});

describe('resolveAnthropicCompatibleTestBaseUrl', () => {
  it('uses OpenCode model base URLs before the UI base URL', () => {
    expect(resolveAnthropicCompatibleTestBaseUrl({
      piAuthProvider: 'opencode-go',
      explicitBaseUrl: 'https://opencode.ai/zen/go/v1',
      modelBaseUrl: 'https://opencode.ai/zen/go',
      providerBaseUrl: 'https://opencode.ai/zen/go/v1',
    })).toBe('https://opencode.ai/zen/go');
  });

  it('keeps explicit base URL priority for regular providers', () => {
    expect(resolveAnthropicCompatibleTestBaseUrl({
      piAuthProvider: 'anthropic',
      explicitBaseUrl: 'https://proxy.example/v1',
      modelBaseUrl: 'https://api.anthropic.com',
      providerBaseUrl: 'https://api.anthropic.com',
    })).toBe('https://proxy.example/v1');
  });
});
