// "Back up now" in the admin dashboard. Runs deploy/backup-to-drive.sh, the same script
// as the nightly timer: database + images, encrypted, uploaded to Google Drive.
import { execFile } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const SCRIPT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'deploy', 'backup-to-drive.sh');
/** Under nginx's 60 s proxy timeout; a backup normally takes a few seconds */
const LIMIT_SECONDS = 50;

export interface DriveBackup {
  file: string;
  size: string;
}

let running: Promise<DriveBackup> | null = null;

/** One backup at a time: a second click while one runs gets the same result. */
export function runDriveBackup(): Promise<DriveBackup> {
  running ??= new Promise<DriveBackup>((resolve, reject) => {
    // `timeout` stops the whole script (rclone included) if it hangs
    execFile('timeout', ['--kill-after=5', String(LIMIT_SECONDS), 'bash', SCRIPT], { maxBuffer: 1024 * 1024 }, (err, stdout, stderr) => {
      const done = /^Backed up (\S+) \(([^)]+)\)/m.exec(stdout);
      if (!err && done) return resolve({ file: done[1], size: done[2] });
      console.error('Backup failed:', err?.message, stderr);
      const lastLine = stderr.trim().split('\n').pop()?.trim();
      reject(new Error((err as { code?: number } | null)?.code === 124 ? `it took more than ${LIMIT_SECONDS} seconds` : lastLine || err?.message || 'unknown error'));
    });
  }).finally(() => {
    running = null;
  });
  return running;
}
