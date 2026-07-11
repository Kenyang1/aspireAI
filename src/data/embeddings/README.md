These two files start as empty arrays (`[]`) as placeholders so the app can
build before you've generated real embeddings.

Run this once (and again any time you edit the knowledge JSON in
`src/data/knowledge/`):

```
node scripts/build-embeddings.mjs
```

It requires `OPENAI_API_KEY` to be set in `.env.local` (same variable the
rest of the app already uses). Commit the resulting `careers.json` and
`rubric.json` files -- they're just data, not secrets.
