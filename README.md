# word-tutor

A Claude Code mod for people who are learning to code while they build. When a
word you do not know comes up in a session, ask about it in a side pane instead
of in the chat, so the explanation does not pile up in the main conversation's
context.

## What it does

- `/word` opens a "Word tutor" pane beside the chat.
- Every run starts with a model picker: `haiku`, `sonnet`, `opus` or `fable`.
- Answers follow one shape: a one-line definition, an everyday analogy, where
  the thing is used in practice, and how it differs from a similar term.
- Answers come in the language you asked in.
- Questions and answers stay in the pane. They are not sent to the main
  conversation, and the main conversation is not sent to the tutor.

## Install

At the prompt of a Claude Code terminal session:

```
/plugin install word-tutor --marketplace HaechanJ/word-tutor
```

Answer `y` to add the marketplace, then pick a scope (the user scope makes the
mod available in every session).

From a shell:

```
claude plugin install word-tutor --marketplace HaechanJ/word-tutor
```

In the desktop app, where `/plugin` does not run: click + next to the prompt
box, then Plugins, Add marketplace with `HaechanJ/word-tutor`, then Add plugin.

## Usage

| You type | What happens |
| --- | --- |
| `/word` | Opens the pane and shows the model picker |
| `/word closure` | Shows the model picker, then asks "closure" with the model you pick |
| a question in the pane's input, then Enter | Asks with the model picked last |

In the model picker, move with Up/Down and pick with Enter, or press the number
next to a model (1 to 4). The cursor starts on the model used last.

Below the answer, the pane lists the six most recent questions; press one to
see its answer again. "Clear history" empties the pane.

## Good to know

- **Context.** Typing into the pane adds nothing to the main conversation.
  Running `/word` leaves one short line there ("Word tutor: pick a model in the
  pane.").
- **The tutor cannot see your session.** Add a hint when a word depends on
  context: "service worker in a PWA" rather than "worker".
- **Follow-ups work.** The last two answered questions travel with each new
  one, so "and how is that different from X?" is understood. Older questions
  are never sent, so the request size stays flat however much you ask.
- **History.** The pane keeps the last 30 questions for the session.
- **Cost.** Each question is one small model call on your own Claude Code
  account, at low effort.
- **Width.** In a narrow terminal the pane may wait until the window is wider.

## Changing how it answers

The tutor's instructions are the `SYSTEM` text near the top of
`hooks/register.tsx`, and the model list is `MODELS` in the same file. Edit
them to change the tone, the length or the choice of models.

## License

MIT
