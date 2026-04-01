import * as React from 'react';
import type { LocalJSXCommandContext } from '../../commands.js';
import type { LocalJSXCommandOnDone } from '../../types/command.js';
import { openBrowser } from '../../utils/browser.js';
import { logError } from '../../utils/log.js';

export async function call(onDone: LocalJSXCommandOnDone, _context: LocalJSXCommandContext): Promise<React.ReactNode | null> {
  try {
    const url = 'https://claude.ai/upgrade/max';
    await openBrowser(url);
    setTimeout(onDone, 0, 'Browser opened. Visit https://claude.ai/upgrade/max to upgrade.');
  } catch (error) {
    logError(error as Error);
    setTimeout(onDone, 0, 'Failed to open browser. Please visit https://claude.ai/upgrade/max to upgrade.');
  }
  return null;
}
