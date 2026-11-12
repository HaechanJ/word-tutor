import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Entry } from '../types'

const PANE = 'word-tutor'
const TITLE = 'Word tutor'
const KEEP = 30
const RECENT = 6

const entries = atom({ plugin: 'word-tutor', key: 'entries' } as const, [], {
  shape: 'entries-1',
})
// Which question's answer is shown. Empty means the latest one.
const shownId = atom({ plugin: 'word-tutor', key: 'shownId' } as const, '', {
  shape: 'shown-1',
})

// The model that answers. Picked in the pane every time /word runs, and kept
// for the questions typed into the pane afterwards.
const MODELS = [
  { name: 'haiku', note: 'fastest, short definitions' },
  { name: 'sonnet', note: 'balanced, the default' },
  { name: 'opus', note: 'more detailed explanations' },
  { name: 'fable', note: 'deepest, slowest' },
]
const isChoosing = atom(
  { plugin: 'word-tutor', key: 'isChoosing' } as const,
  false,
  { shape: 'choosing-1' },
)
// The question typed after /word, held until a model is picked.
const queued = atom({ plugin: 'word-tutor', key: 'queued' } as const, '', {
  shape: 'queued-1',
})
const model = atom({ plugin: 'word-tutor', key: 'model' } as const, 'sonnet', {
  shape: 'model-1',
})

const SYSTEM = `You are a patient tutor for someone who is learning to code while building software with an AI assistant. They ask about words they ran into and did not understand.
Rules:
- Answer in the language the question is written in.
- Use plain words. When another technical term is unavoidable, add a few words of explanation in parentheses.
- Order: (1) a one-line definition, (2) one everyday analogy, (3) where it is used in practice (a web app, server or phone app example when possible), (4) one line on the difference from a similar term that is easy to confuse with it, if there is one.
- At most 12 lines in total. Code only when it is really needed, 5 lines at most.
- When a word has several meanings, give the programming meaning first.
- If you do not know or are not sure, say so.`

async function ask($: EngineInterface, raw: string): Promise<void> {
  const question = raw.trim()
  if (question === '') return

  const id = String(await $.clock.now())
  const before = await read($, entries)
  const pending: Entry = { id, question, answer: '', isPending: true }
  await update($, entries, list => [...list, pending].slice(-KEEP))
  await update($, shownId, () => '')

  // Only the last two answered questions travel with a new one, so a follow-up
  // ("and what is that?") works while the request stays small.
  const earlier = before
    .filter(one => !one.isPending && one.answer !== '')
    .slice(-2)
    .map(one => `[Earlier question] ${one.question}\n[Earlier answer] ${one.answer}`)
    .join('\n\n')
  const prompt =
    earlier === '' ? question : `${earlier}\n\n[Question now] ${question}`

  let answer: string
  try {
    const reply = await $.model.complete({
      model: await read($, model),
      system: SYSTEM,
      prompt,
      maxTokens: 4000,
      effort: 'low',
      timeoutMs: 60000,
    })
    answer = reply.isAnswered
      ? reply.text
      : `No answer came back (${reply.reason}). Please ask again.`
  } catch (error) {
    answer = `The request was refused: ${String(error)}`
  }

  await update($, entries, list =>
    list.map(one =>
      one.id === id ? { ...one, answer, isPending: false } : one,
    ),
  )
}

async function pick($: EngineInterface, name: string): Promise<void> {
  await update($, model, () => name)
  await update($, isChoosing, () => false)
  const question = await read($, queued)
  await update($, queued, () => '')
  if (question !== '') await ask($, question)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'word',
      description:
        'Ask about an unfamiliar term in a side pane (pick a model first), e.g. /word closure',
    })

    return next(e)
  })

  on('command.run', { command: 'word' }, async ($, e) => {
    await $.ui.open({ id: PANE, title: TITLE, focus: true })
    // Every run starts with the model picker; the question waits for the pick.
    await update($, queued, () => e.args.trim())
    await update($, isChoosing, () => true)

    return { text: 'Word tutor: pick a model in the pane.' }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Input, Button, Markdown } = $.ui.resolve(e)
    const list = await read($, entries)
    const picked = await read($, shownId)
    const shown = list.find(one => one.id === picked) ?? list[list.length - 1]
    const recent = list.slice(-RECENT).reverse()
    const using = await read($, model)

    if (await read($, isChoosing)) {
      const waiting = await read($, queued)

      return (
        <Box flexDirection="column">
          <Text bold>Pick the model that answers</Text>
          <Text dimColor>Up/Down to move, Enter to pick, or press its number</Text>
          {waiting !== '' && (
            <Text dimColor>Question: {waiting.slice(0, 60)}</Text>
          )}
          <Box flexDirection="column" marginTop={1}>
            {MODELS.map((one, index) => (
              <Button
                key={`model-${one.name}`}
                hotkey={String(index + 1)}
                autoFocus={one.name === using ? true : undefined}
                onPress={() => pick($, one.name)}
              >
                {index + 1}. {one.name} <Text dimColor>{one.note}</Text>
              </Button>
            ))}
          </Box>
        </Box>
      )
    }

    return (
      <Box flexDirection="column">
        <Input
          key="question"
          placeholder="Type a word or a question, then Enter"
          submitLabel="ask"
          value=""
          autoFocus
          onSubmit={value => void ask($, value)}
        />
        <Text dimColor>Model: {using} (run /word to change)</Text>
        {shown === undefined && (
          <Text dimColor>
            What you ask here is not added to the main conversation.
          </Text>
        )}
        {shown !== undefined && (
          <Box flexDirection="column" marginTop={1}>
            <Text bold>Q. {shown.question}</Text>
            {shown.isPending ? (
              <Text dimColor>Looking it up…</Text>
            ) : (
              <Markdown text={shown.answer} />
            )}
          </Box>
        )}
        {recent.length > 1 && (
          <Box flexDirection="column" marginTop={1}>
            <Text dimColor>Recently asked</Text>
            {recent.map(one => (
              <Button
                key={`show-${one.id}`}
                label={one.question.split('\n')[0]!.slice(0, 40)}
                onPress={() => update($, shownId, () => one.id)}
              />
            ))}
          </Box>
        )}
        {list.length > 0 && (
          <Box marginTop={1}>
            <Button
              key="clear"
              label="Clear history"
              onPress={async () => {
                await update($, entries, () => [])
                await update($, shownId, () => '')
              }}
            />
          </Box>
        )}
      </Box>
    )
  })
}
