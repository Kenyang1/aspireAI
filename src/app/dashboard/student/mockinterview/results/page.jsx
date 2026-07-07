'use client'
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ReactLoading from "react-loading";

/**
 * Results page -- now reads the exact question set that was actually asked
 * (whichever set src/app/dashboard/student/mockinterview/page.jsx stashed in
 * sessionStorage under "active_questions"), instead of re-importing the
 * static question bank and indexing into it by position. That also fixes a
 * subtle pre-existing bug: this page previously always labeled feedback with
 * questionData[0..2]'s text regardless of which questions were actually
 * randomly chosen.
 *
 * Feedback now comes from /api/agents/assess (the Feedback Agent, grounded
 * with RAG against the interview rubric + this session's role brief) instead
 * of the old single-paragraph /api/text call.
 */
export default function Results () {
    const [audioFiles, setAudioFiles] = useState(null);
    const [activeQuestions, setActiveQuestions] = useState([]);
    const [roleBrief, setRoleBrief] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [feedback, setFeedback] = useState([]);

    const router = useRouter();

    useEffect(() => {
        try {
            const stored = JSON.parse(sessionStorage.getItem("active_questions") ?? "[]");
            setActiveQuestions(stored);
        } catch (err) {
            console.error("Could not read active_questions from sessionStorage:", err);
            setActiveQuestions([]);
        }

        try {
            const prep = JSON.parse(sessionStorage.getItem("tailored_prep") ?? "null");
            setRoleBrief(prep?.roleBrief ?? null);
        } catch (err) {
            setRoleBrief(null);
        }
    }, []);

    useEffect(() => {
        const audioData = JSON.parse(sessionStorage.getItem("audio_files"));
        setAudioFiles(audioData);
    }, []);


    useEffect(() => {
        const getFeedback = async () => {
            try {
                const feedbackResults = [];
                for (const [index, url] of audioFiles.entries()) {
                    const res = await fetch(url);
                    const blob = await res.blob();
                    const audioFile = new File([blob], `userAudio${index}`, { type: "audio/wav" });
                    const question = activeQuestions[index]?.[0] ?? "";
                    const feedback = await sendToTranscription(audioFile, question);
                    feedbackResults.push(feedback);
                }

                setFeedback(feedbackResults);
                setIsLoading(false);
            } catch (error) {
                console.error("Error in getFeedback:", error);
            }
        };

        if (audioFiles && audioFiles.length > 0 && activeQuestions.length > 0) {
            getFeedback();
        }
    }, [audioFiles, activeQuestions]);


    // turn user audio into text using openai api (whisper model) -- unchanged
    async function sendToTranscription(audioFile, question) {
        try {
            const response = await fetch("/api/transcription", {
                method: "POST",
                headers: {
                    "Content-Type": "application/octet-stream",
                },
                body: audioFile,
            });

            if (!response.ok) {
                throw new Error(`Error: ${response.statusText}`);
            }

            const result = await response.json();
            if (result.transcription) {
                const assessment = await makeAssessment(result.transcription, question);
                return assessment;
            } else {
                return null;
            }

        } catch (error) {
            console.error("Error sending transcription", error);
        }
    }

    async function makeAssessment(transcription, question) {
        try {
            const response = await fetch("/api/agents/assess", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    question,
                    transcript: transcription,
                    roleBrief,
                })
            });

            if (!response.ok) {
                throw new Error(`Error: ${response.statusText}`);
            }

            const result = await response.json();
            return result.feedback;
        } catch (error) {
            console.error("Error getting assessment", error);
            return null;
        }
    }

    const handleRestart = () => {
        router.push('/dashboard/student/mockinterview');
    }

    if (!audioFiles) return <div>Loading...</div>;


    return (
        <div
            className={`h-[90%] w-full flex overflow-hidden ${isLoading ? "items-center justify-center" : "items-baseline"} space-y-6 p-4 bg-gray-50`}
        >
            {
                isLoading ?
                    <ReactLoading type="bubbles" color="black" /> :
                    <div className="flex flex-col gap-5 items-center">
                        <div className="flex gap-5 flex-wrap justify-center">
                            {
                                activeQuestions.map((question, index) => (
                                <div key={index} className="w-full max-w-2xl h-[40%] overflow-y-scroll p-4 bg-white shadow-md rounded-lg border border-gray-200">
                                    <p className="text-lg font-semibold text-gray-700 mb-2">{question[0]}</p>
                                    <audio controls className="w-full mb-4">
                                        <source src={audioFiles[index]} type="audio/wav"></source>
                                    </audio>
                                    {
                                        feedback[index] ?
                                        <div className="text-sm text-gray-700 space-y-2">
                                            <p className="font-semibold">
                                                STAR Score: {feedback[index].starScore}/5
                                            </p>
                                            {feedback[index].strengths?.length > 0 && (
                                                <div>
                                                    <p className="font-semibold text-green-700">Strengths</p>
                                                    <ul className="list-disc list-inside">
                                                        {feedback[index].strengths.map((s, i) => <li key={i}>{s}</li>)}
                                                    </ul>
                                                </div>
                                            )}
                                            {feedback[index].gaps?.length > 0 && (
                                                <div>
                                                    <p className="font-semibold text-amber-700">Areas to Improve</p>
                                                    <ul className="list-disc list-inside">
                                                        {feedback[index].gaps.map((g, i) => <li key={i}>{g}</li>)}
                                                    </ul>
                                                </div>
                                            )}
                                            {feedback[index].rewriteSuggestion && (
                                                <p className="italic text-gray-600">
                                                    Try instead: {feedback[index].rewriteSuggestion}
                                                </p>
                                            )}
                                        </div> :
                                        <p className="text-sm text-gray-400">No feedback available.</p>
                                    }
                                </div>
                                ))
                            }
                        </div>
                        <button onClick={handleRestart}
                                className="mt-6 w-fit px-6 py-3 bg-blue-600 text-white font-semibold text-lg rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300 transition duration-300"
                        >
                            Restart
                        </button>
                    </div>
            }
        </div>
    );
}
