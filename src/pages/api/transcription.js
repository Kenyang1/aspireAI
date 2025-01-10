// import path from "path";
// import OpenAI from "openai";
// import { promisify } from "util";
//
// const unlinkAsync = promisify(fs.unlink);
// const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
//
// export const config = {
//     api: {
//         bodyParser: false
//     },
// };
//
// export default async function handler(req, res) {
//     if (req.method === "POST") {
//         console.log('req received')
//         const tempFilePath = path.join(process.cwd(), "/tmp", "tempAudio.wav");
//
//         if (!fs.existsSync(path.dirname(tempFilePath))) {
//             fs.mkdirSync(path.dirname(tempFilePath), { recursive: true });
//         }
//
//         const writeStream = fs.createWriteStream(tempFilePath);
//
//         req.pipe(writeStream);
//
//         writeStream.on("finish", async () => {
//             try {
//                 console.log('making req')
//                 const transcription = await openai.audio.transcriptions.create({
//                     file: fs.createReadStream(tempFilePath),
//                     model: "whisper-1",
//                     response_format: "text",
//                 });
//
//                 await unlinkAsync(tempFilePath);
//
//                 res.status(200).json({
//                     message: "Text generated successfully!",
//                     transcription: transcription,
//                 });
//             } catch (error) {
//                 console.error("Error during transcription:", error);
//                 res.status(500).json({ error: error.message });
//             }
//         });
//
//         writeStream.on("error", (error) => {
//             console.error("Error writing file:", error);
//             res.status(500).json({ error: "Error saving audio file." });
//         });
//
//         return;
//     } else {
//         console.log(req.method)
//         res.status(405).json({ error: "Method not allowed" });
//     }
//
// }
//
// import fs from "fs";
// import { formidable } from "formidable";
// import OpenAI from "openai";
//
// const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
//
// export const config = {
//     api: {
//         bodyParser: false, // Disable body parsing to handle file uploads
//     },
// };
//
// export default async function handler(req, res) {
//     if (req.method === "POST") {
//         const form = formidable({ keepExtensions: true });
//
//         form.parse(req, async (err, fields, files) => {
//             if (err) {
//                 console.error("Error parsing form:", err);
//                 return res.status(500).json({ error: "Error processing file upload" });
//             }
//
//             const audioFilePath = files.audio.filepath; // Path to the uploaded file
//
//             try {
//                 const transcription = await openai.audio.transcriptions.create({
//                     file: fs.createReadStream(audioFilePath),
//                     model: "whisper-1",
//                     response_format: "text",
//                 });
//
//                 res.status(200).json({
//                     message: "Text generated successfully!",
//                     transcription: transcription,
//                 });
//             } catch (error) {
//                 console.error("Error during transcription:", error);
//                 res.status(500).json({ error: error.message });
//             }
//         });
//     } else {
//         res.status(405).json({ error: "Method not allowed" });
//     }
// }



//
// import fs from "fs";
// import { formidable } from "formidable";
// import OpenAI from "openai";
//
// const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
//
// export const config = {
//     api: {
//         bodyParser: false, // Disable body parsing to handle file uploads
//     },
// };
//
// export default async function handler(req, res) {
//     if (req.method === "POST") {
//         const form = formidable({ keepExtensions: true });
//
//         form.parse(req, async (err, fields, files) => {
//             if (err) {
//                 console.error("Error parsing form:", err);
//                 return res.status(500).json({ error: "Error processing file upload" });
//             }
//
//             console.log("Parsed files:", files);
//
//             if (!files.audio) {
//                 console.error("No audio file uploaded");
//                 return res.status(400).json({ error: "No audio file uploaded" });
//             }
//
//             console.log('file path', files.audio[0].filepath)
//             const audioFilePath = files.audio[0].filepath;
//
//             try {
//                 const transcription = await openai.audio.transcriptions.create({
//                     file: fs.createReadStream(audioFilePath),
//                     model: "whisper-1",
//                     response_format: "text",
//                 });
//
//                 res.status(200).json({
//                     message: "Text generated successfully!",
//                     transcription: transcription,
//                 });
//             } catch (error) {
//                 console.error("Error during transcription:", error);
//                 res.status(500).json({ error: error.message });
//             }
//         });
//     } else {
//         res.status(405).json({ error: "Method not allowed" });
//     }
// }


import fs from "fs";
import { formidable } from "formidable";
import OpenAI from "openai";
import ffmpeg from "fluent-ffmpeg";

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

            console.log("MIME type:", mimetype);
            console.log("File size:", files.audio[0].size);

            if (mimetype !== "audio/webm") {
                console.error("Invalid file type:", mimetype);
                return res.status(400).json({ error: "Invalid file type. Only WAV files are supported." });
            }

            try {

                const transcription = await openai.audio.transcriptions.create({
                    file: fs.createReadStream(audioFilePath), // Use a readable stream, not a raw buffer
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
