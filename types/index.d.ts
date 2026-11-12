export type Entry = {
  id: string
  question: string
  answer: string
  isPending: boolean
}

declare module 'claude-code' {
  interface PluginState {
    'word-tutor': {
      entries: Shaped<Entry[]>
      shownId: Shaped<string>
      model: Shaped<string>
      isChoosing: Shaped<boolean>
      queued: Shaped<string>
    }
  }
}
