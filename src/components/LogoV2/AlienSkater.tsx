import * as React from 'react'
import { Box, Text } from '../../ink.js'

export type AlienSkaterPose = 'default' | 'ollie' | 'look-left' | 'look-right'

type Props = {
  pose?: AlienSkaterPose
}

// 滑板外星人 ASCII art - 基于绿色外星人玩滑板的图标
// 使用 Unicode 块字符和颜色模拟原始图片的外观
type Segments = {
  // 头部（含眼睛）
  head: string
  // 身体上半部
  body: string
  // 腿和滑板
  skateboard: string
}

const POSES: Record<AlienSkaterPose, Segments> = {
  default: {
    head: '  ▗▄◉▄▖  ',
    body: ' ▐█████▌ ',
    skateboard: ' ╱▔═══▔╲',
  },
  ollie: {
    head: '  ▗▄◉▄▖  ',
    body: ' ▐█████▌ ',
    skateboard: '  ═╪══╪═ ',
  },
  'look-left': {
    head: '  ▗◉▄▄▖  ',
    body: ' ▐█████▌ ',
    skateboard: ' ╱▔═══▔╲',
  },
  'look-right': {
    head: '  ▗▄▄◉▖  ',
    body: ' ▐█████▌ ',
    skateboard: ' ╱▔═══▔╲',
  },
}

// 对于不支持 Unicode 的终端，使用简化版
const SIMPLE_POSES: Record<AlienSkaterPose, Segments> = {
  default: {
    head: '  .---.  ',
    body: ' |() ()|',
    skateboard: '  -===-  ',
  },
  ollie: {
    head: '  .---.  ',
    body: ' |() ()|',
    skateboard: '   ===   ',
  },
  'look-left': {
    head: '  .-o-.  ',
    body: ' |() ()|',
    skateboard: '  -===-  ',
  },
  'look-right': {
    head: '  .-o-.  ',
    body: ' |() ()|',
    skateboard: '  -===-  ',
  },
}

export function AlienSkater({ pose = 'default' }: Props = {}): React.ReactNode {
  // 使用环境变量控制是否使用简化版
  const useSimple = process.env.CLAUDE_SIMPLE_LOGO === 'true'
  const p = useSimple ? SIMPLE_POSES[pose] : POSES[pose]

  return (
    <Box flexDirection="column" alignItems="center">
      <Text color="clawd_body">{p.head}</Text>
      <Text color="clawd_body">{p.body}</Text>
      <Text color="pink_FOR_SUBAGENTS_ONLY">{p.skateboard}</Text>
    </Box>
  )
}
