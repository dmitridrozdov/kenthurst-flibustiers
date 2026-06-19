import { query, mutation } from "./_generated/server"
import { v } from "convex/values"

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("matches").collect()
  },
})

export const add = mutation({
  args: {
    date: v.string(),
    winner: v.string(),
    partner1: v.string(),
    loser: v.string(),
    partner2: v.string(),
    score: v.string(),
    surface: v.union(v.literal("Hard"), v.literal("Grass"), v.literal("Clay")),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("matches", args)
  },
})