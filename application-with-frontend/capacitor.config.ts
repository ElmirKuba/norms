import type { CapacitorConfig } from '@capacitor/cli';

declare const process: { env: Record<string, string | undefined> };
declare function require(id: string): any;

const isDev = process.env['CAP_DEV'] === 'true';

function getLocalIP(): string {
  const os = require('os');
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] ?? []) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

const devServer: CapacitorConfig['server'] = {
  url: `http://${getLocalIP()}:4200`,
  cleartext: true,
};

const config: CapacitorConfig = {
  appId: 'app.normisy.space',
  appName: 'norms',
  webDir: 'dist/norms/browser',
  server: isDev ? devServer : undefined,
};

export default config;
