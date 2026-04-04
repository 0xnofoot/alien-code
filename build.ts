#!/usr/bin/env bun
/**
 * Claude Code build script
 *
 * Usage:
 *   bun run build.ts           # production build
 *   bun run build.ts --dev     # development build (no minify, with sourcemap)
 *
 * Output: package/alien-code.js
 */

import { existsSync } from 'fs'
import { mkdir } from 'fs/promises'
import { dirname, join, resolve } from 'path'

const isDev = process.argv.includes('--dev')
const ROOT = import.meta.dir
const outDir = join(ROOT, 'package')
const outFile = join(outDir, 'alien-code.js')

await mkdir(outDir, { recursive: true })

const BUILD_TIME = new Date().toISOString()
const VERSION = process.env.VERSION ?? '0.0.1'

// ---------------------------------------------------------------------------
// Feature flags — controls which code paths are included.
// In Anthropic's build, feature() from bun:bundle performs DCE.
// Here we inject them as boolean defines so the bundler can fold branches.
// ---------------------------------------------------------------------------
const featureFlags: Record<string, boolean> = {
  ABLATION_BASELINE: false,
  AGENT_MEMORY_SNAPSHOT: false,
  AGENT_TRIGGERS_REMOTE: false,
  AGENT_TRIGGERS: false,
  ALLOW_TEST_VERSIONS: false,
  ANTI_DISTILLATION_CC: false,
  AUTO_THEME: true,
  AWAY_SUMMARY: false,
  BASH_CLASSIFIER: true,
  BG_SESSIONS: false,
  BREAK_CACHE_COMMAND: false,
  BRIDGE_MODE: true,
  BUDDY: true,
  BUILDING_CLAUDE_APPS: true,
  BUILTIN_EXPLORE_PLAN_AGENTS: true,
  BYOC_ENVIRONMENT_RUNNER: false,
  CACHED_MICROCOMPACT: true,
  CCR_AUTO_CONNECT: true,
  CCR_MIRROR: false,
  CCR_REMOTE_SETUP: false,
  CHICAGO_MCP: false,
  COMMIT_ATTRIBUTION: false,
  COMPACTION_REMINDERS: true,
  CONNECTOR_TEXT: true,
  CONTEXT_COLLAPSE: true,
  COORDINATOR_MODE: false,
  COWORKER_TYPE_TELEMETRY: false,
  DAEMON: false,
  DIRECT_CONNECT: false,
  DOWNLOAD_USER_SETTINGS: false,
  DUMP_SYSTEM_PROMPT: false,
  ENHANCED_TELEMETRY_BETA: false,
  EXPERIMENTAL_SKILL_SEARCH: false,
  EXTRACT_MEMORIES: false,
  FILE_PERSISTENCE: false,
  FORK_SUBAGENT: true,
  HARD_FAIL: false,
  HISTORY_PICKER: true,
  HISTORY_SNIP: true,
  HOOK_PROMPTS: true,
  IS_LIBC_GLIBC: false,
  IS_LIBC_MUSL: false,
  KAIROS_BRIEF: false,
  KAIROS_CHANNELS: false,
  KAIROS_DREAM: false,
  KAIROS_GITHUB_WEBHOOKS: false,
  KAIROS_PUSH_NOTIFICATION: false,
  KAIROS: false,
  LODESTONE: false,
  MCP_RICH_OUTPUT: true,
  MCP_SKILLS: true,
  MEMORY_SHAPE_TELEMETRY: false,
  MESSAGE_ACTIONS: true,
  MONITOR_TOOL: false,
  NATIVE_CLIENT_ATTESTATION: false,
  NATIVE_CLIPBOARD_IMAGE: false,
  NEW_INIT: true,
  OVERFLOW_TEST_TOOL: false,
  PERFETTO_TRACING: false,
  POWERSHELL_AUTO_MODE: false,
  PROACTIVE: false,
  PROMPT_CACHE_BREAK_DETECTION: false,
  QUICK_SEARCH: true,
  REACTIVE_COMPACT: true,
  REVIEW_ARTIFACT: false,
  RUN_SKILL_GENERATOR: false,
  SELF_HOSTED_RUNNER: false,
  SHOT_STATS: false,
  SKILL_IMPROVEMENT: false,
  SLOW_OPERATION_LOGGING: false,
  SSH_REMOTE: false,
  STREAMLINED_OUTPUT: true,
  TEAMMEM: false,
  TEMPLATES: false,
  TERMINAL_PANEL: false,
  TOKEN_BUDGET: true,
  TORCH: false,
  TRANSCRIPT_CLASSIFIER: false,
  TREE_SITTER_BASH_SHADOW: false,
  TREE_SITTER_BASH: false,
  UDS_INBOX: false,
  ULTRAPLAN: false,
  ULTRATHINK: true,
  UNATTENDED_RETRY: false,
  UPLOAD_USER_SETTINGS: false,
  VERIFICATION_AGENT: false,
  VOICE_MODE: false,
  WEB_BROWSER_TOOL: false,
  WORKFLOW_SCRIPTS: false,
}

// Explicit path stubs for internal/missing files
// Maps a require/import specifier (relative or package) to a stub path
const EXPLICIT_STUBS: Record<string, string> = {
  // Internal Anthropic packages
  '@ant/claude-for-chrome-mcp': `${ROOT}/stubs/@ant/claude-for-chrome-mcp/index.ts`,
  '@ant/computer-use-mcp': `${ROOT}/stubs/@ant/computer-use-mcp/index.ts`,
  '@ant/computer-use-mcp/types': `${ROOT}/stubs/@ant/computer-use-mcp/types.ts`,
  '@ant/computer-use-mcp/sentinelApps': `${ROOT}/stubs/@ant/computer-use-mcp/sentinelApps.ts`,
  '@ant/computer-use-input': `${ROOT}/stubs/@ant/computer-use-input/index.ts`,
  '@ant/computer-use-swift': `${ROOT}/stubs/@ant/computer-use-swift/index.ts`,
  // Internal native addon — use TS port instead
  'color-diff-napi': `${ROOT}/stubs/color-diff-napi/index.ts`,
  'audio-capture-napi': `${ROOT}/stubs/audio-capture-napi/index.ts`,
  'modifiers-napi': `${ROOT}/stubs/modifiers-napi/index.ts`,
  'bun:bundle': `${ROOT}/stubs/bun-bundle/index.ts`,
  'bun:ffi': `${ROOT}/stubs/bun-ffi/index.ts`,
}

// Inline TS source for a generic empty stub module.
// Exports an empty string as default (safe for both string and object consumers)
// and a no-op named export catch-all via Proxy won't work in ESM; instead we
// export a handful of common names that missing internal modules tend to export.
const EMPTY_STUB_SOURCE = `// Auto-generated stub: module not present in public source snapshot
export default ""
export const name = ""
export const description = ""
export const prompt = ""
`

console.log(`Building Alien Code v${VERSION} (${isDev ? 'dev' : 'production'})...`)

const result = await Bun.build({
  entrypoints: ['./src/entrypoints/cli.tsx'],
  outdir: outDir,
  naming: 'alien-code.js',
  target: 'node',
  format: 'esm',
  bundle: true,
  minify: !isDev,
  sourcemap: isDev ? 'linked' : 'none',
  define: {
    // MACRO constants
    'MACRO.VERSION': JSON.stringify(VERSION),
    'MACRO.BUILD_TIME': JSON.stringify(BUILD_TIME),
    'MACRO.PACKAGE_URL': JSON.stringify('@anthropic-ai/claude-code'),
    'MACRO.NATIVE_PACKAGE_URL': JSON.stringify('@anthropic-ai/claude-code'),
    'MACRO.ISSUES_EXPLAINER': JSON.stringify(
      'report the issue at https://github.com/anthropics/claude-code/issues',
    ),
    'MACRO.FEEDBACK_CHANNEL': JSON.stringify(
      'https://github.com/anthropics/claude-code/issues',
    ),
    'MACRO.VERSION_CHANGELOG': JSON.stringify(
      `https://github.com/anthropics/claude-code/releases/tag/v${VERSION}`,
    ),
    // Feature flags as boolean constants (enables DCE of if(feature('X')) branches)
    ...Object.fromEntries(
      Object.entries(featureFlags).map(([k, v]) => [
        // bun:bundle's feature() function reads from this define namespace
        `$$bunfeature_${k}`,
        String(v),
      ]),
    ),
  },
  external: [
    '*.node',
    '@img/sharp-darwin-arm64',
    '@img/sharp-darwin-x64',
    '@img/sharp-linux-arm',
    '@img/sharp-linux-arm64',
    '@img/sharp-linux-x64',
    '@img/sharp-linuxmusl-arm64',
    '@img/sharp-linuxmusl-x64',
    '@img/sharp-win32-arm64',
    '@img/sharp-win32-x64',
  ],
  plugins: [
    {
      // 0. Handle absolute *.js paths under src/ that Bun reports as "File not found".
      //    These arise because Bun resolves relative .js imports to absolute paths
      //    before invoking onResolve plugins, then tries to load the .js file directly.
      //    We intercept via onLoad and redirect to the .ts source.
      name: 'js-to-ts-abs',
      setup(build) {
        // onResolve for absolute paths (.js and .jsx extensions)
        build.onResolve({ filter: /\.(js|jsx)$/ }, (args) => {
          const absPath = args.path.startsWith('/') ? args.path
            : args.importer ? resolve(dirname(args.importer), args.path) : null
          if (!absPath || !absPath.startsWith(ROOT)) return undefined

          const base = absPath.replace(/\.(js|jsx)$/, '')
          const candidates = [
            base + '.ts',
            base + '.tsx',
            base + '/index.ts',
            base + '/index.tsx',
          ]
          for (const c of candidates) {
            if (existsSync(c)) return { path: c }
          }
          // File genuinely missing — will be caught by auto-stub plugin
          return undefined
        })
      },
    },
    {
      // 1. Resolve src/* absolute bare imports, with .js → .ts rewrite
      name: 'src-alias',
      setup(build) {
        build.onResolve({ filter: /^src\// }, (args) => {
          // Strip .js extension and find the actual .ts/.tsx file
          const base = args.path.replace(/^src\//, `${ROOT}/src/`).replace(/\.(js|jsx)$/, '')
          const candidates = [
            base + '.ts',
            base + '.tsx',
            base + '/index.ts',
            base + '/index.tsx',
          ]
          for (const c of candidates) {
            if (existsSync(c)) return { path: c }
          }
          // Return the original rewritten path if nothing found
          return { path: args.path.replace(/^src\//, `${ROOT}/src/`) }
        })
      },
    },
    {
      // 2. Resolve explicit stubs (internal packages + color-diff-napi)
      name: 'explicit-stubs',
      setup(build) {
        for (const [pkg, stubPath] of Object.entries(EXPLICIT_STUBS)) {
          const escaped = pkg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
          build.onResolve({ filter: new RegExp(`^${escaped}(/.*)?$`) }, (args) => {
            // Handle sub-path imports like @ant/computer-use-mcp/types
            const subPath = args.path.slice(pkg.length)
            if (subPath && subPath !== '/index') {
              // Try to find a matching stub for the subpath
              const candidate = EXPLICIT_STUBS[args.path]
              if (candidate) return { path: candidate }
            }
            return { path: stubPath }
          })
        }
      },
    },
    {
      // 3. Auto-stub any remaining missing modules at build time
      //    This catches all the feature-gated internal files that aren't in
      //    the public source snapshot (the leaker only captured src/).
      name: 'auto-stub-missing',
      setup(build) {
        build.onResolve({ filter: /.*/ }, (args) => {
          // Only intercept relative imports that resolve to non-existent .ts/.tsx files
          if (!args.path.startsWith('.')) return undefined
          if (!args.importer) return undefined
          // Skip node_modules — only stub missing src/ files
          if (args.importer.includes('/node_modules/')) return undefined
          // Only stub files from our own source tree
          if (!args.importer.startsWith(ROOT + '/src/') && !args.importer.startsWith(ROOT + '/stubs/')) return undefined

          // Try to resolve the actual path
          const base = dirname(args.importer)
          // Strip .js/.jsx extension — source uses .js/.jsx in imports but files are .ts/.tsx
          const stripped = args.path.replace(/\.(js|jsx)$/, '')
          const candidates = [
            resolve(base, stripped + '.ts'),
            resolve(base, stripped + '.tsx'),
            resolve(base, stripped, 'index.ts'),
            resolve(base, stripped, 'index.tsx'),
            resolve(base, args.path),
          ]
          const exists = candidates.some(existsSync)
          if (!exists) {
            // Return a virtual stub for this missing module
            return { path: args.path, namespace: 'auto-stub', pluginData: { importer: args.importer } }
          }
          return undefined
        })

        build.onLoad({ filter: /.*/, namespace: 'auto-stub' }, () => ({
          contents: EMPTY_STUB_SOURCE,
          loader: 'ts',
        }))
      },
    },
  ],
})

if (!result.success) {
  console.error('\nBuild failed:')
  for (const log of result.logs) {
    console.error(String(log))
  }
  process.exit(1)
}

// Prepend shebang + header to the output file
let content = await Bun.file(outFile).text()

// Fix Bun DCE bug: `void import('./devtools.js')` inside a lazy-init block
// gets mangled to `Promise.resolve().then(() => )` — invalid JS syntax.
// Replace with a no-op that is syntactically valid.
const badPattern = /Promise\.resolve\(\)\.then\(\(\)\s*=>\s*\)/g
const fixCount = (content.match(badPattern) ?? []).length
if (fixCount > 0) {
  content = content.replace(badPattern, 'Promise.resolve()')
  console.log(`Fixed ${fixCount} Bun DCE syntax artifact(s)`)
}
const header = [
  '#!/usr/bin/env node',
  `// (c) Anthropic PBC. All rights reserved.`,
  ``,
  `// Version: ${VERSION}`,
  ``,
].join('\n')
await Bun.write(outFile, header + content)
await Bun.$`chmod +x ${outFile}`.quiet()

const size = (await Bun.file(outFile).arrayBuffer()).byteLength
console.log(`\nBuild complete: ${outFile}`)
console.log(`Size: ${(size / 1024 / 1024).toFixed(1)} MB`)
if (result.logs.length > 0) {
  console.log(`Warnings: ${result.logs.length}`)
}
