import * as React from 'react'
import { Box, Text } from '../../ink.js'
import { env } from '../../utils/env.js'

export type ClawdPose =
  | 'default'
  | 'arms-up' // both arms raised (used during jump)
  | 'look-left' // both pupils shifted left
  | 'look-right' // both pupils shifted right

type Props = {
  pose?: ClawdPose
}

// Alien Skater - 基于 jp2a 转换 + 手工优化
// 绿色外星人玩粉色滑板
type Segments = {
  r1: string // 头部
  r2: string // 身体
  r3: string // 腿部
  r4: string // 滑板
}

const POSES: Record<ClawdPose, Segments> = {
  default: {
    r1: '  ▄▀▀▄  ',
    r2: ' ▐◉ ◉▌ ',
    r3: ' ╱█ █╲ ',
    r4: '═●══●═ ',
  },
  'look-left': {
    r1: '  ▄▀▀▄  ',
    r2: ' ▐◉  ▌ ',
    r3: ' ╱█ █╲ ',
    r4: '═●══●═ ',
  },
  'look-right': {
    r1: '  ▄▀▀▄  ',
    r2: ' ▐  ◉▌ ',
    r3: ' ╱█ █╲ ',
    r4: '═●══●═ ',
  },
  'arms-up': {
    r1: ' ╲▄▀▀▄╱',
    r2: '  ◉ ◉  ',
    r3: '  █ █  ',
    r4: ' ═══  ',
  },
}

// Apple Terminal fallback
const APPLE_POSES: Record<ClawdPose, Segments> = {
  default: {
    r1: '  ____  ',
    r2: ' (o o) ',
    r3: ' / | \\ ',
    r4: '-o==o- ',
  },
  'look-left': {
    r1: '  ____  ',
    r2: ' (o  ) ',
    r3: ' / | \\ ',
    r4: '-o==o- ',
  },
  'look-right': {
    r1: '  ____  ',
    r2: ' (  o) ',
    r3: ' / | \\ ',
    r4: '-o==o- ',
  },
  'arms-up': {
    r1: ' \\____/',
    r2: '  o o  ',
    r3: '  | |  ',
    r4: '  ===  ',
  },
}

export function Clawd({ pose = 'default' }: Props = {}): React.ReactNode {
  if (env.terminal === 'Apple_Terminal') {
    return <AppleTerminalClawd pose={pose} />
  }

  const p = POSES[pose]

  return (
    <Box flexDirection="column" alignItems="center">
      <Text color="clawd_body">{p.r1}</Text>
      <Text color="clawd_body">{p.r2}</Text>
      <Text color="clawd_body">{p.r3}</Text>
      <Text color="pink_FOR_SUBAGENTS_ONLY">{p.r4}</Text>
    </Box>
  )
}

function AppleTerminalClawd({ pose }: { pose: ClawdPose }): React.ReactNode {
  const p = APPLE_POSES[pose]

  return (
    <Box flexDirection="column" alignItems="center">
      <Text color="clawd_body">{p.r1}</Text>
      <Text color="clawd_body">{p.r2}</Text>
      <Text color="clawd_body">{p.r3}</Text>
      <Text color="pink_FOR_SUBAGENTS_ONLY">{p.r4}</Text>
    </Box>
  )
}
