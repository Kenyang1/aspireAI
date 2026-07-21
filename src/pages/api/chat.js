/**
 * POST /api/chat
 * --------------
 * Body: { message: string, uid?: string }
 * AI mentor chat. Rate limited per caller IP (Redis-backed when REDIS_URL is
 * set), and when a uid is provided each exchange is logged to the student's
 * interaction history in PostgreSQL.
 */

import { getOpenAI } from "@/lib/openaiClient";
import { rateLimit, requestIp } from "@/lib/cache";
import { logInteraction, upsertStudent } from "@/lib/repository";

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { message, uid } = req.body;

    const limit = await rateLimit(`chat:${requestIp(req)}`, 30, 60);
    if (!limit.allowed) {
        return res.status(429).json({ error: "Too many messages — give it a minute and try again." });
    }

    try {
        const completion = await getOpenAI().chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "developer", content: "You are a chatbot that will answer a user's questions regarding potential careers and career goals for a given major. The target audience is high school students. Answer succinctly under 50 words and without markdown." },
                { role: "user", content: message }
            ],
            max_completion_tokens: 50
        });

        const reply = completion.choices[0].message;

        if (typeof uid === "string" && uid.length > 0) {
            await upsertStudent(uid);
            await logInteraction(uid, "mentor_chat", { message, reply: reply.content });
        }

        res.status(200).json({ message: reply });
    } catch (error) {
        console.error("Error fetching response:", error);
        res.status(500).json({ error: "Failed to fetch response" });
    }
}
