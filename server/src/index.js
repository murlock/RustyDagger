import { app } from './app.js'

const PORT = process.env.PORT ?? 8787

app.listen(PORT, () => {
  console.log(`Dragon Court CGI server listening on :${PORT}`)
})
