import path from 'path'
import dotenv from 'dotenv'
import { defineConfig } from 'prisma/config'

const envPath = path.resolve(__dirname, '.env')
dotenv.config({ path: envPath })

export default defineConfig({
  migrations: {
    seed: 'node prisma/seed.js',
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
})