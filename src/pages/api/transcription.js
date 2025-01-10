import fs from "fs";
import { formidable } from "formidable";
import OpenAI, { toFile } from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const config = {
    api: {
        bodyParser: false,
    },
};

export default async function handler(req, res) {
    if (req.method === "POST") {
        const form = formidable({ keepExtensions: true });

        form.parse(req, async (err, fields, files) => {
            if (err) {
                console.error("Error parsing form:", err);
                return res.status(500).json({ error: "Error processing file upload" });
            }

            if (!files.audio || !Array.isArray(files.audio) || files.audio.length === 0) {
                return res.status(400).json({ error: "No audio file uploaded" });
            }

            const audioFilePath = files.audio[0].filepath;
            const mimetype = files.audio[0].mimetype;

            const audioBuffer = fs.readFileSync(audioFilePath);

            const fileObj = await toFile(
                audioBuffer,
                "temp.webm",
                { type: files.audio[0].mimetype }
            );

            try {

                const transcription = await openai.audio.transcriptions.create({
                    file: fileObj,
                    model: "whisper-1",
                    response_format: "text",
                });

                res.status(200).json({
                    message: "Text generated successfully!",
                    transcription: transcription,
                });
            } catch (error) {
                console.error("Error during transcription:", error);
                res.status(500).json({ error: error.message });
            }
        });
    } else {
        res.status(405).json({ error: "Method not allowed" });
    }
}
