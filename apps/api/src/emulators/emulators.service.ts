import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { execSync, spawn, type ChildProcess } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import net from 'node:net';
import {
  DEFAULT_PUBSUB_CONFIG,
  EMULATOR_CATALOG,
  type EmulatorListItem,
  type EmulatorRuntimeStatus,
  type InstalledEmulator,
  type PubSubEmulatorConfig,
} from '@emulator-studio/shared';

interface RegistryFile {
  installed: InstalledEmulator[];
}

@Injectable()
export class EmulatorsService implements OnModuleDestroy {
  private readonly dataDir = join(process.cwd(), '.emulator-studio');
  private readonly registryPath = join(this.dataDir, 'installed.json');
  private readonly processes = new Map<string, ChildProcess>();
  private readonly runtimeMeta = new Map<
    string,
    Omit<EmulatorRuntimeStatus, 'id' | 'running' | 'managed'>
  >();

  onModuleDestroy() {
    for (const id of [...this.processes.keys()]) {
      this.stopProcess(id).catch(() => undefined);
    }
  }

  async list(): Promise<EmulatorListItem[]> {
    await this.syncPubSubFromEnvironment();
    const installed = this.readRegistry();

    return Promise.all(
      EMULATOR_CATALOG.map(async (item) => {
        const record = installed.find((e) => e.id === item.id);
        return {
          ...item,
          installed: Boolean(record),
          installedAt: record?.installedAt,
          config: record?.config,
          runtime: await this.getRuntime(item.id),
        };
      })
    );
  }

  getInstalled(id: string): InstalledEmulator | undefined {
    return this.readRegistry().find((e) => e.id === id);
  }

  install(id: string, config?: Partial<PubSubEmulatorConfig>): InstalledEmulator {
    const catalogItem = EMULATOR_CATALOG.find((e) => e.id === id);
    if (!catalogItem) throw new Error(`Emulator "${id}" not found in catalog.`);
    if (!catalogItem.installable) throw new Error(`Emulator "${id}" is not installable yet.`);

    const installed = this.readRegistry().filter((e) => e.id !== id);
    const record: InstalledEmulator = {
      id,
      installedAt: new Date().toISOString(),
      config: id === 'pubsub' ? this.resolvePubSubConfig(config) : (config ?? {}),
    };

    installed.push(record);
    this.writeRegistry(installed);
    if (id === 'pubsub') {
      this.applyPubSubEnv(record.config as PubSubEmulatorConfig);
    }
    return record;
  }

  async uninstall(id: string): Promise<void> {
    if (this.processes.has(id)) {
      throw new Error('Stop the emulator before uninstalling.');
    }

    if (id === 'pubsub') {
      const config = this.getPubSubConfig();
      if (await this.isPortOpen(config.hostPort)) {
        throw new Error('Stop the emulator before uninstalling.');
      }
    }

    const next = this.readRegistry().filter((e) => e.id !== id);
    if (next.length === this.readRegistry().length) {
      throw new Error(`Emulator "${id}" is not installed.`);
    }
    this.writeRegistry(next);
  }

  updatePubSubConfig(config: PubSubEmulatorConfig): InstalledEmulator {
    const installed = this.getInstalled('pubsub');
    if (!installed) {
      throw new Error('Install the Pub/Sub emulator before configuring it.');
    }
    if (this.processes.has('pubsub')) {
      throw new Error('Stop the emulator before changing configuration.');
    }

    const record: InstalledEmulator = {
      ...installed,
      config: this.resolvePubSubConfig(config),
    };

    const all = this.readRegistry().map((e) => (e.id === 'pubsub' ? record : e));
    this.writeRegistry(all);
    this.applyPubSubEnv(record.config as PubSubEmulatorConfig);
    return record;
  }

  async initializePubSubConfiguration(): Promise<PubSubEmulatorConfig> {
    await this.syncPubSubFromEnvironment();
    const config = this.getPubSubConfig();
    this.applyPubSubEnv(config);
    return config;
  }

  getPubSubConfig(): PubSubEmulatorConfig {
    const installed = this.getInstalled('pubsub');
    if (installed) {
      return this.resolvePubSubConfig(installed.config as PubSubEmulatorConfig);
    }

    return this.resolvePubSubConfig();
  }

  async getRuntime(id: string): Promise<EmulatorRuntimeStatus> {
    const proc = this.processes.get(id);
    const meta = this.runtimeMeta.get(id);
    const managed = Boolean(proc && !proc.killed);

    let hostPort = meta?.hostPort;
    let projectId = meta?.projectId;

    if (id === 'pubsub') {
      const config = this.getPubSubConfig();
      hostPort = hostPort ?? config.hostPort;
      projectId = projectId ?? config.projectId;
    }

    const portOpen = hostPort ? await this.isPortOpen(hostPort) : false;

    return {
      id,
      running: managed || portOpen,
      managed,
      pid: proc?.pid,
      startedAt: meta?.startedAt,
      hostPort,
      projectId,
      error: meta?.error,
    };
  }

  async startPubSub(): Promise<EmulatorRuntimeStatus> {
    if (this.processes.has('pubsub')) {
      return this.getRuntime('pubsub');
    }

    await this.syncPubSubFromEnvironment();

    const installed = this.getInstalled('pubsub');
    if (!installed) {
      throw new Error('Install the Pub/Sub emulator before starting it.');
    }

    const config = this.resolvePubSubConfig(installed.config as PubSubEmulatorConfig);

    if (await this.isPortOpen(config.hostPort)) {
      return this.getRuntime('pubsub');
    }

    await this.assertGcloudAvailable();

    const child = spawn(
      'gcloud',
      [
        'beta',
        'emulators',
        'pubsub',
        'start',
        `--project=${config.projectId}`,
        `--host-port=${config.hostPort}`,
      ],
      { shell: true, stdio: ['ignore', 'pipe', 'pipe'] }
    );

    child.stdout?.on('data', (chunk: Buffer) => {
      console.log(`[pubsub-emulator] ${chunk.toString().trim()}`);
    });

    child.stderr?.on('data', (chunk: Buffer) => {
      console.error(`[pubsub-emulator] ${chunk.toString().trim()}`);
    });

    child.on('exit', (code) => {
      this.processes.delete('pubsub');
      const meta = this.runtimeMeta.get('pubsub');
      if (meta) {
        this.runtimeMeta.set('pubsub', {
          ...meta,
          error: code === 0 ? undefined : `Process exited with code ${code ?? 'unknown'}`,
        });
      }
    });

    this.processes.set('pubsub', child);
    this.runtimeMeta.set('pubsub', {
      startedAt: new Date().toISOString(),
      hostPort: config.hostPort,
      projectId: config.projectId,
    });

    process.env.PUBSUB_EMULATOR_HOST = config.hostPort;
    process.env.GOOGLE_CLOUD_PROJECT = config.projectId;

    await this.waitForPort(config.hostPort);
    return this.getRuntime('pubsub');
  }

  async stopPubSub(): Promise<EmulatorRuntimeStatus> {
    const config = this.getPubSubConfig();

    console.log(`[emulators] Stopping Pub/Sub emulator at ${config.hostPort}`);

    if (this.processes.has('pubsub')) {
      await this.stopProcess('pubsub');
    }

    if (await this.isPortOpen(config.hostPort)) {
      await this.killProcessOnPort(config.hostPort);
    }

    await this.waitForPortClosed(config.hostPort);

    const runtime = await this.getRuntime('pubsub');
    if (runtime.running) {
      const hint =
        process.platform === 'win32'
          ? 'On Windows, elevated emulator processes require UAC approval to stop. Approve the prompt or run the API as Administrator.'
          : 'On Linux/macOS, the process may belong to another user — stop it manually or with sudo.';
      throw new Error(`Could not stop the emulator at ${config.hostPort}. ${hint}`);
    }

    console.log(`[emulators] Pub/Sub emulator stopped at ${config.hostPort}`);
    return runtime;
  }

  private applyPubSubEnv(config: PubSubEmulatorConfig): void {
    process.env.GOOGLE_CLOUD_PROJECT = config.projectId;
    process.env.PUBSUB_EMULATOR_HOST = config.hostPort;
  }

  private resolvePubSubConfig(config?: Partial<PubSubEmulatorConfig>): PubSubEmulatorConfig {
    return {
      projectId:
        config?.projectId ?? process.env.GOOGLE_CLOUD_PROJECT ?? DEFAULT_PUBSUB_CONFIG.projectId,
      hostPort:
        config?.hostPort ?? process.env.PUBSUB_EMULATOR_HOST ?? DEFAULT_PUBSUB_CONFIG.hostPort,
    };
  }

  private async syncPubSubFromEnvironment(): Promise<void> {
    if (this.getInstalled('pubsub')) {
      return;
    }

    const envHost = process.env.PUBSUB_EMULATOR_HOST;
    const envProject = process.env.GOOGLE_CLOUD_PROJECT;

    if (envHost) {
      this.install('pubsub', {
        hostPort: envHost,
        projectId: envProject ?? DEFAULT_PUBSUB_CONFIG.projectId,
      });
      this.applyPubSubEnv(this.getPubSubConfig());
      return;
    }

    if (await this.isPortOpen(DEFAULT_PUBSUB_CONFIG.hostPort)) {
      this.install('pubsub', DEFAULT_PUBSUB_CONFIG);
      this.applyPubSubEnv(this.getPubSubConfig());
    }
  }

  private async stopProcess(id: string): Promise<void> {
    const proc = this.processes.get(id);
    if (!proc?.pid) return;

    const config = id === 'pubsub' ? this.getPubSubConfig() : undefined;

    await new Promise<void>((resolve) => {
      if (process.platform === 'win32') {
        const killer = spawn('taskkill', ['/pid', String(proc.pid), '/f', '/t'], { shell: true });
        killer.on('close', () => resolve());
        killer.on('error', () => resolve());
        return;
      }

      proc.once('exit', () => resolve());
      proc.kill('SIGTERM');
      setTimeout(() => resolve(), 2000);
    });

    this.processes.delete(id);
    const meta = this.runtimeMeta.get(id);
    if (meta) {
      this.runtimeMeta.set(id, { ...meta, error: undefined });
    }

    if (config && (await this.isPortOpen(config.hostPort))) {
      await this.killProcessOnPort(config.hostPort);
    }
  }

  private async killProcessOnPort(hostPort: string): Promise<void> {
    const [, portStr] = hostPort.split(':');
    const port = portStr?.trim();
    if (!port) return;

    if (!(await this.isPortOpen(hostPort))) {
      return;
    }

    const pids = this.findListeningPidsOnPort(port);
    if (!pids.length) {
      throw new Error(`No process found listening on port ${port}.`);
    }

    console.log(`[emulators] Found listener PIDs on port ${port}: ${pids.join(', ')}`);

    const failures: string[] = [];
    for (const pid of pids) {
      const result = await this.killPid(pid);
      if (!result.ok && result.error) {
        failures.push(result.error);
      }
    }

    if (failures.length) {
      throw new Error(failures.join(' '));
    }
  }

  private findListeningPidsOnPort(port: string): number[] {
    if (process.platform === 'win32') {
      try {
        const output = execSync(
          `powershell -NoProfile -Command "(Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue).OwningProcess | Sort-Object -Unique"`,
          { encoding: 'utf8', timeout: 10_000 }
        );
        const pids = output
          .split(/\r?\n/)
          .map((line) => Number.parseInt(line.trim(), 10))
          .filter((pid) => Number.isInteger(pid) && pid > 0);
        if (pids.length) return [...new Set(pids)];
      } catch {
        // Fall back to netstat below.
      }

      const output = execSync('netstat -ano -p tcp', { encoding: 'utf8' });
      const pids = new Set<number>();
      const portSuffix = `:${port}`;

      for (const line of output.split('\n')) {
        if (!line.includes('LISTENING')) continue;
        const parts = line.trim().split(/\s+/);
        const localAddress = parts[1] ?? '';
        if (!localAddress.endsWith(portSuffix)) continue;
        const pid = Number.parseInt(parts[parts.length - 1] ?? '', 10);
        if (Number.isInteger(pid) && pid > 0) pids.add(pid);
      }

      return [...pids];
    }

    try {
      const output = execSync(`lsof -tiTCP:${port} -sTCP:LISTEN`, { encoding: 'utf8' });
      return [
        ...new Set(
          output
            .split('\n')
            .map((line) => Number.parseInt(line.trim(), 10))
            .filter((pid) => Number.isInteger(pid) && pid > 0)
        ),
      ];
    } catch {
      return [];
    }
  }

  private async killPid(pid: number): Promise<{ ok: boolean; error?: string }> {
    if (process.platform === 'win32') {
      const normal = this.runTaskkillWindows(pid, false);
      if (normal.ok) {
        console.log(`[emulators] Stopped PID ${pid}`);
        return { ok: true };
      }

      if (normal.exitCode != null) {
        console.error(`[emulators] taskkill failed for PID ${pid} (exit code ${normal.exitCode})`);
      }

      if (!this.isWindowsProcessRunning(pid)) {
        console.log(`[emulators] Stopped PID ${pid}`);
        return { ok: true };
      }

      console.log(`[emulators] Retrying with elevation for PID ${pid}`);
      const elevated = this.runTaskkillWindows(pid, true);
      if (elevated.ok) {
        console.log(`[emulators] Stopped PID ${pid} via UAC elevation`);
        return { ok: true };
      }

      if (!this.isWindowsProcessRunning(pid)) {
        console.log(`[emulators] Stopped PID ${pid} via UAC elevation`);
        return { ok: true };
      }

      return {
        ok: false,
        error:
          elevated.error ??
          this.killErrorFromExitCode(pid, elevated.exitCode) ??
          `Could not stop PID ${pid}. Approve the UAC prompt or run the API as Administrator.`,
      };
    }

    try {
      process.kill(pid, 'SIGTERM');
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === 'ESRCH') {
        return { ok: true };
      }

      const message = this.permissionHint(pid, error);
      console.error(`[emulators] SIGTERM failed for PID ${pid}: ${message}`);
      return { ok: false, error: message };
    }

    await new Promise((resolve) => setTimeout(resolve, 400));

    if (!this.isProcessRunning(pid)) {
      console.log(`[emulators] Stopped PID ${pid}`);
      return { ok: true };
    }

    try {
      process.kill(pid, 'SIGKILL');
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === 'ESRCH') {
        return { ok: true };
      }

      const message = this.permissionHint(pid, error);
      console.error(`[emulators] SIGKILL failed for PID ${pid}: ${message}`);
      return { ok: false, error: message };
    }

    if (this.isProcessRunning(pid)) {
      return {
        ok: false,
        error: `PID ${pid} is still running after SIGTERM/SIGKILL.`,
      };
    }

    console.log(`[emulators] Stopped PID ${pid}`);
    return { ok: true };
  }

  private runTaskkillWindows(
    pid: number,
    elevated: boolean
  ): { ok: boolean; exitCode?: number | null; error?: string } {
    try {
      if (elevated) {
        execSync(
          `powershell -NoProfile -Command "Start-Process -FilePath taskkill.exe -ArgumentList '/PID','${pid}','/F','/T' -Verb RunAs -Wait"`,
          { encoding: 'utf8', timeout: 120_000 }
        );
      } else {
        execSync(`taskkill /PID ${pid} /F /T`, { encoding: 'utf8' });
      }

      if (!this.isWindowsProcessRunning(pid)) {
        return { ok: true };
      }

      return {
        ok: false,
        exitCode: null,
        error: `PID ${pid} is still running after ${elevated ? 'elevated ' : ''}taskkill.`,
      };
    } catch (error) {
      const exitCode = this.execExitCode(error);

      if (!this.isWindowsProcessRunning(pid)) {
        return { ok: true };
      }

      return {
        ok: false,
        exitCode,
        error: this.killErrorFromExitCode(pid, exitCode),
      };
    }
  }

  private execExitCode(error: unknown): number | null {
    if (error && typeof error === 'object' && 'status' in error) {
      const status = (error as { status?: number | null }).status;
      return typeof status === 'number' ? status : null;
    }

    return null;
  }

  private killErrorFromExitCode(pid: number, exitCode?: number | null): string {
    switch (exitCode) {
      case 0:
        return `PID ${pid} is still running after taskkill.`;
      case 5:
        return `Access denied when stopping PID ${pid}. The process may be running as Administrator.`;
      case 1223:
        return `Stopping PID ${pid} was canceled in the UAC prompt.`;
      case 128:
        return `Process ${pid} was not found.`;
      default:
        return exitCode != null
          ? `Could not stop PID ${pid} (exit code ${exitCode}).`
          : `Could not stop PID ${pid}.`;
    }
  }

  private isWindowsProcessRunning(pid: number): boolean {
    try {
      const output = execSync(
        `powershell -NoProfile -Command "if (Get-Process -Id ${pid} -ErrorAction SilentlyContinue) { 'true' } else { 'false' }"`,
        { encoding: 'utf8', timeout: 10_000 }
      );
      return output.trim().toLowerCase() === 'true';
    } catch {
      return false;
    }
  }

  private isProcessRunning(pid: number): boolean {
    try {
      process.kill(pid, 0);
      return true;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      return code !== 'ESRCH';
    }
  }

  private permissionHint(pid: number, error: unknown): string {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'EPERM' || code === 'EACCES') {
      return `Permission denied when stopping PID ${pid}. The process may belong to another user — use sudo or stop it manually.`;
    }

    if (code === 'ESRCH') {
      return `Process ${pid} was not found.`;
    }

    return code ? `Could not stop PID ${pid} (${code}).` : `Could not stop PID ${pid}.`;
  }

  private async waitForPortClosed(hostPort: string, timeoutMs = 8000): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (!(await this.isPortOpen(hostPort))) return;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }

  private async assertGcloudAvailable(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const check = spawn('gcloud', ['--version'], { shell: true, stdio: 'ignore' });
      check.on('error', () =>
        reject(new Error('gcloud CLI not found. Required to start the Pub/Sub emulator.'))
      );
      check.on('exit', (code) => {
        if (code === 0) resolve();
        else reject(new Error('gcloud CLI is not available.'));
      });
    });
  }

  private async isPortOpen(hostPort: string): Promise<boolean> {
    const [host, portStr] = hostPort.split(':');
    const port = Number(portStr);
    if (!host || !port) return false;

    try {
      await new Promise<void>((resolve, reject) => {
        const socket = net.connect(port, host, () => {
          socket.destroy();
          resolve();
        });
        socket.on('error', reject);
      });
      return true;
    } catch {
      return false;
    }
  }

  private async waitForPort(hostPort: string, timeoutMs = 20000): Promise<void> {
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      if (await this.isPortOpen(hostPort)) {
        return;
      }
      await new Promise((r) => setTimeout(r, 500));
    }

    throw new Error(`Emulator did not open port ${hostPort} within ${timeoutMs / 1000}s.`);
  }

  private readRegistry(): InstalledEmulator[] {
    this.ensureDataDir();
    if (!existsSync(this.registryPath)) {
      return [];
    }
    const raw = readFileSync(this.registryPath, 'utf8');
    return (JSON.parse(raw) as RegistryFile).installed ?? [];
  }

  private writeRegistry(installed: InstalledEmulator[]): void {
    this.ensureDataDir();
    const payload: RegistryFile = { installed };
    writeFileSync(this.registryPath, JSON.stringify(payload, null, 2), 'utf8');
  }

  private ensureDataDir(): void {
    if (!existsSync(this.dataDir)) {
      mkdirSync(this.dataDir, { recursive: true });
    }
  }
}
