import { afterEach, describe, expect, it } from 'bun:test';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { pathToFileURL } from 'url';

const STORAGE_MODULE_PATH = pathToFileURL(join(import.meta.dir, '..', 'storage.ts')).href;

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

function setupConfigDir() {
  const configDir = mkdtempSync(join(tmpdir(), 'craft-agent-add-workspace-'));
  tempDirs.push(configDir);

  writeFileSync(
    join(configDir, 'config.json'),
    JSON.stringify({
      workspaces: [],
      activeWorkspaceId: null,
      activeSessionId: null,
      llmConnections: [],
    }, null, 2),
    'utf-8',
  );

  writeFileSync(
    join(configDir, 'config-defaults.json'),
    JSON.stringify({
      version: 'test',
      description: 'test defaults',
      defaults: {
        notificationsEnabled: true,
        colorTheme: 'default',
        autoCapitalisation: true,
        sendMessageKey: 'enter',
        spellCheck: false,
        keepAwakeWhileRunning: false,
        richToolDescriptions: true,
      },
      workspaceDefaults: {
        permissionMode: 'ask',
        cyclablePermissionModes: ['safe', 'ask', 'allow-all'],
        localMcpServers: { enabled: true },
      },
    }, null, 2),
    'utf-8',
  );

  return { configDir, configPath: join(configDir, 'config.json') };
}

function addWorkspaceInSubprocess(configDir: string, rootPath: string, name: string) {
  const run = Bun.spawnSync([
    process.execPath,
    '--eval',
    [
      `import { addWorkspace } from '${STORAGE_MODULE_PATH}';`,
      `const workspace = addWorkspace({ rootPath: ${JSON.stringify(rootPath)}, name: ${JSON.stringify(name)} });`,
      'console.log(JSON.stringify(workspace));',
    ].join(' '),
  ], {
    env: { ...process.env, CRAFT_CONFIG_DIR: configDir },
    stdout: 'pipe',
    stderr: 'pipe',
  });

  if (run.exitCode !== 0) {
    throw new Error(`addWorkspace subprocess failed (exit ${run.exitCode})\nstderr:\n${run.stderr.toString()}`);
  }

  return JSON.parse(run.stdout.toString());
}

describe('addWorkspace', () => {
  it('registers an existing .zo workspace using its persisted config', () => {
    const { configDir, configPath } = setupConfigDir();
    const workspaceRoot = mkdtempSync(join(tmpdir(), 'existing-zo-workspace-'));
    tempDirs.push(workspaceRoot);

    mkdirSync(join(workspaceRoot, '.zo'), { recursive: true });
    writeFileSync(
      join(workspaceRoot, '.zo', 'config.json'),
      JSON.stringify({
        id: 'ws_existing_config',
        name: 'Configured Workspace',
        slug: 'configured-workspace',
        createdAt: 123456789,
        updatedAt: 123456999,
      }, null, 2),
      'utf-8',
    );

    const workspace = addWorkspaceInSubprocess(configDir, workspaceRoot, 'Folder Name');

    expect(workspace).toMatchObject({
      id: 'ws_existing_config',
      name: 'Configured Workspace',
      slug: 'configured-workspace',
      rootPath: workspaceRoot,
      createdAt: 123456789,
    });

    const storedConfig = JSON.parse(readFileSync(configPath, 'utf-8'));
    expect(storedConfig.activeWorkspaceId).toBe('ws_existing_config');
    expect(storedConfig.workspaces).toHaveLength(1);
    expect(storedConfig.workspaces[0]).toMatchObject({
      id: 'ws_existing_config',
      name: 'Configured Workspace',
      slug: 'configured-workspace',
      rootPath: workspaceRoot,
      createdAt: 123456789,
    });
  });

  it('keeps the registry id aligned with the newly created workspace config', () => {
    const { configDir, configPath } = setupConfigDir();
    const workspaceRoot = join(configDir, 'workspaces', 'new-workspace');

    const workspace = addWorkspaceInSubprocess(configDir, workspaceRoot, 'New Workspace');
    const workspaceConfig = JSON.parse(readFileSync(join(workspaceRoot, '.zo', 'config.json'), 'utf-8'));
    const storedConfig = JSON.parse(readFileSync(configPath, 'utf-8'));

    expect(workspace.id).toBe(workspaceConfig.id);
    expect(storedConfig.workspaces[0].id).toBe(workspaceConfig.id);
    expect(storedConfig.activeWorkspaceId).toBe(workspaceConfig.id);
  });
});
