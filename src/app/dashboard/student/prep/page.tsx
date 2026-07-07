'use client';

/**
 * Interview Prep Setup page
 * --------------------------
 * New entry point to the mock interview flow. The student pastes their
 * resume + a target job description; we run the agent pipeline
 * (/api/agents/prep) and stash the resulting role brief + tailored questions
 * in sessionStorage (same pattern the app already uses for audio_files),
 * then hand off to the existing mock interview page.
 *
 * If a student skips this page and goes straight to "Mock Interview" from
 * the menu, that page falls back to the original static question bank --
 * nothing breaks, this is purely additive.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import ReactLoading from "react-loading";

export default function PrepPage() {
  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async () => {
    if (!resumeText.trim() || !jobDescription.trim()) {
      setError("Paste both your resume and a job description to continue.");
      return;
    }
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/agents/prep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText, jobDescription }),
      });

      if (!response.ok) throw new Error(`Request failed: ${response.statusText}`);

      const result = await response.json();
      sessionStorage.setItem("tailored_prep", JSON.stringify(result));
      router.push("/dashboard/student/mockinterview");
    } catch (err) {
      console.error("Error building tailored prep:", err);
      setError("Something went wrong generating your tailored questions. Please try again.");
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-[90%] w-full flex flex-col items-center justify-center gap-4">
        <ReactLoading type="bubbles" color="black" />
        <p className="text-gray-600">
          Researching the role and tailoring your questions...
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-2">Tailor Your Mock Interview</h1>
      <p className="text-gray-600 mb-6">
        Paste your resume and a target job description. We&apos;ll generate interview
        questions and a scoring rubric specific to this role, instead of the generic
        question bank.
      </p>

      <label className="block font-semibold mb-1">Your Resume (plain text)</label>
      <textarea
        className="w-full h-40 p-3 border border-gray-300 rounded-lg mb-4"
        value={resumeText}
        onChange={(e) => setResumeText(e.target.value)}
        placeholder="Paste your resume text here..."
      />

      <label className="block font-semibold mb-1">Target Job Description</label>
      <textarea
        className="w-full h-40 p-3 border border-gray-300 rounded-lg mb-4"
        value={jobDescription}
        onChange={(e) => setJobDescription(e.target.value)}
        placeholder="Paste the job posting text here..."
      />

      {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

      <button
        className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition duration-200"
        onClick={handleSubmit}
      >
        Generate Tailored Interview
      </button>
    </div>
  );
}
