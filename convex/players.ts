import { query, mutation } from "./_generated/server"
import { v } from "convex/values"

export const list = query({
  args: {},
  handler: async (ctx) => {
    const players = await ctx.db.query("players").collect()
    return players.map((p) => p.name).sort()
  },
})

export const add = mutation({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    const trimmed = name.trim()
    if (!trimmed) throw new Error("Name required")
    const existing = await ctx.db
      .query("players")
      .filter((q) => q.eq(q.field("name"), trimmed))
      .first()
    if (existing) return existing._id
    return await ctx.db.insert("players", { name: trimmed })
  },
})