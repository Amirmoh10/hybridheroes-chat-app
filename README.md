# HybridHeroesGPT

HybridHeroesGPT is a small Expo chat app built with React Native and the Vercel AI SDK. It focuses on the core mobile chat experience: streaming responses, model selection, Markdown rendering, multiline input, keyboard behavior, send/stop states, and chat-style scrolling.

The full source is available at [github.com/Amirmoh10/hybridheroes-chat-app](https://github.com/Amirmoh10/hybridheroes-chat-app).

## Tech Stack

- [Expo](https://expo.dev/) and [Expo Router](https://docs.expo.dev/router/introduction/)
- [React Native](https://reactnative.dev/)
- [Vercel AI SDK](https://ai-sdk.dev/docs/getting-started/expo)
- [`useChat`](https://ai-sdk.dev/docs/reference/ai-sdk-ui/use-chat) with [`DefaultChatTransport`](https://ai-sdk.dev/docs/ai-sdk-ui/transport)
- `expo/fetch` for streaming in the mobile runtime
- TypeScript

## Requirements

- Node.js 18+
- pnpm
- Expo CLI through the project scripts
- iOS Simulator, Android Emulator, or Expo Go
- Vercel AI Gateway API key

## Environment Variables

Create `.env.local` in the project root:

```bash
AI_GATEWAY_API_KEY=your_vercel_ai_gateway_key
```

For production builds or any setup where the mobile app calls a deployed API host, also set:

```bash
EXPO_PUBLIC_API_BASE_URL=https://your-api-host.example
```

In local development, the app derives the API origin from Expo using `utils.ts`.

## Install

```bash
pnpm install
```

## Run

Start the Expo dev server:

```bash
pnpm start
```

Open directly on iOS:

```bash
pnpm ios
```

Open directly on Android:

```bash
pnpm android
```

## Quality Checks

```bash
PATH=/usr/local/bin:$PATH pnpm exec tsc --noEmit
PATH=/usr/local/bin:$PATH pnpm lint
```

## Project Structure

```text
app/api/chat+api.ts              Streaming AI SDK API route
app/index.tsx                    App entry screen
components/chat/chat-screen.tsx  Chat state, transport, keyboard, and scroll coordination
components/chat/composer.tsx     Multiline composer, model chip, send/stop, expanded input
components/chat/message-list.tsx FlatList-based message list
components/chat/message-item.tsx User and assistant message rendering
components/chat/markdown.tsx     Lightweight Markdown renderer
components/chat/models.ts        Supported chat models
utils.ts                         Expo API URL helper
docs/blog.md                     Tutorial article
```

## Tutorial

The implementation walkthrough lives in [docs/blog.md](docs/blog.md).
