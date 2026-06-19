import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export default defineSchema({
  players: defineTable({
    name: v.string(),
  }),

  matches: defineTable({
    date: v.string(),
    winner: v.string(),
    partner1: v.string(),
    loser: v.string(),
    partner2: v.string(),
    score: v.string(),
    surface: v.union(v.literal("Hard"), v.literal("Grass"), v.literal("Clay")),
  }).index("by_date", ["date"]),
})