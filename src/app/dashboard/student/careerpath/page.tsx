'use client';

/**
 * Career Paths page
 * -------------------
 * Previously this page was a fully static grid -- every visitor saw the same
 * 15 cards regardless of who they were, despite the app being branded
 * "AI-powered". This version adds a short interest quiz that actually calls
 * the Career Discovery Agent (RAG over src/data/knowledge/careers.json,
 * see /api/agents/career-match) to rank and explain the top 3 matches for
 * THIS student, using their own words. The full static grid stays below as
 * "Browse All Majors" -- nothing is removed, only personalization is added.
 */

import { useState } from "react";
import CareerCard from "./CareerCard";
import ReactLoading from "react-loading";

const INTEREST_OPTIONS = [
  "Building software",
  "Helping patients",
  "Leading teams & projects",
  "Data, numbers & analysis",
  "Writing & storytelling",
  "Lab work & research",
  "Teaching & mentoring",
  "Law, policy & government",
  "Design & visual creativity",
  "Sustainability & the environment",
];

interface CareerMatch {
  major: string;
  whyItFits: string;
}

const Page = () => {
  const cards = [
    {
      title: "Computer Science",
      description:
        "With the tech industry's rapid growth, this major is in high demand, covering software development, data science, AI, cybersecurity, and more.",
      imageUrl: "/compsci.jpg",
      linkText: "What is Computer Science?",
      linkUrl: "https://www.coursera.org/articles/what-is-computer-science",
    },
    {
      title: "Business Administration",
      description:
        "This versatile major prepares students for leadership roles in companies, covering areas like management, finance, marketing, and entrepreneurship.",
      imageUrl: "/business.jpg",
      linkText: "Learn About Business Administration",
      linkUrl: "https://www.businessnewsdaily.com/",
    },
    {
      title: "Nursing",
      description:
        "A major focused on healthcare and patient care, which continues to be in high demand as the healthcare industry grows.",
      imageUrl: "/nursing.webp",
      linkText: "Explore Nursing Careers",
      linkUrl: "https://nurse.org/",
    },
    {
      title: "Psychology",
      description:
        "The study of human behavior, emotions, and mental processes, which is popular among students interested in counseling, therapy, research, and human resources.",
      imageUrl: "/psychology.jpg",
      linkText: "Discover Psychology",
      linkUrl: "https://www.apa.org/",
    },
    {
      title: "Biology",
      description:
        "A foundational major for students pursuing careers in medicine, research, environmental science, and biotechnology.",
      imageUrl: "/biology.jpg",
      linkText: "Learn About Biology",
      linkUrl: "https://www.nature.com/",
    },
    {
      title: "Engineering",
      description:
        "Engineering majors, including electrical, civil, mechanical, and chemical, are popular for students interested in technical, problem-solving careers.",
      imageUrl: "/engineering.jpg",
      linkText: "Learn About Engineering",
      linkUrl: "https://www.engineering.com/",
    },
    {
      title: "Education",
      description:
        "This major prepares students for teaching and education-related roles, including early childhood education, secondary education, and special education.",
      imageUrl: "/education.jpg",
      linkText: "Explore Education Careers",
      linkUrl: "https://www.education.com/",
    },
    {
      title: "Health Professions",
      description:
        "Other than nursing, this includes majors like public health, pre-med, dental hygiene, and physical therapy, all geared towards careers in healthcare.",
      imageUrl: "/health.webp",
      linkText: "Discover Health Professions",
      linkUrl: "https://explorehealthcareers.org/",
    },
    {
      title: "Communication",
      description:
        "A broad field covering journalism, public relations, advertising, and media studies, which is popular for students interested in media and communication roles.",
      imageUrl: "/communications.jpg",
      linkText: "Explore Communication",
      linkUrl: "https://www.communicationstudies.com/",
    },
    {
      title: "Finance and Accounting",
      description:
        "These majors are popular for students interested in working in banking, investment, corporate finance, and accounting.",
      imageUrl: "/finance.jpg",
      linkText: "Learn About Finance",
      linkUrl: "https://www.investopedia.com/",
    },
    {
      title: "Political Science",
      description:
        "A major focusing on government, politics, international relations, and law, often pursued by students interested in public service, law, or policy-making.",
      imageUrl: "/politics.jpeg",
      linkText: "Discover Political Science",
      linkUrl: "https://www.apsanet.org/",
    },
    {
      title: "Art and Design",
      description:
        "Including fine arts, graphic design, animation, and digital media, these majors are popular for students interested in creative careers.",
      imageUrl: "/art.jpg",
      linkText: "Learn About Art and Design",
      linkUrl: "https://www.aiga.org/",
    },
    {
      title: "Sociology",
      description:
        "The study of society, social behavior, and institutions, often pursued by students aiming for careers in social work, research, or public policy.",
      imageUrl: "/sociology.jpeg",
      linkText: "Discover Sociology",
      linkUrl: "https://www.asanet.org/",
    },
    {
      title: "Economics",
      description:
        "A major that focuses on the study of economies, markets, and resource allocation, offering career opportunities in business, government, and research.",
      imageUrl: "/economics.jpg",
      linkText: "Learn About Economics",
      linkUrl: "https://www.economicshelp.org/",
    },
    {
      title: "Environmental Science",
      description:
        "A growing field focused on understanding and addressing environmental challenges, appealing to students passionate about sustainability and conservation.",
      imageUrl: "/environmental.jpg",
      linkText: "Discover Environmental Science",
      linkUrl: "https://www.environmentalscience.org/",
    },
  ];

  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [matches, setMatches] = useState<CareerMatch[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const toggleInterest = (interest: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]
    );
  };

  const findMatches = async () => {
    if (selectedInterests.length === 0) {
      setError("Pick at least one interest to get personalized matches.");
      return;
    }
    setError("");
    setIsLoading(true);
    try {
      const response = await fetch("/api/agents/career-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interests: selectedInterests }),
      });
      if (!response.ok) throw new Error(`Request failed: ${response.statusText}`);
      const result = await response.json();
      setMatches(result.matches);
    } catch (err) {
      console.error("Error finding career matches:", err);
      setError("Something went wrong finding your matches. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <main className="p-8">
        <h1 className="text-3xl font-bold mb-6 text-center">
          Career Paths for You & Me
        </h1>

        {/* Interest quiz -> personalized, AI-generated matches */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8 max-w-3xl mx-auto">
          <h4 className="text-xl font-semibold mb-3">What are you into?</h4>
          <p className="text-sm text-gray-600 mb-4">
            Pick a few things that describe you, and we&apos;ll find the majors that
            actually fit -- not just show you all of them.
          </p>
          <div className="flex flex-wrap gap-2 mb-4">
            {INTEREST_OPTIONS.map((interest) => (
              <button
                key={interest}
                onClick={() => toggleInterest(interest)}
                className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                  selectedInterests.includes(interest)
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-700 border-gray-300 hover:border-blue-400"
                }`}
              >
                {interest}
              </button>
            ))}
          </div>
          {error && <p className="text-sm text-red-500 mb-3">{error}</p>}
          <button
            onClick={findMatches}
            className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition duration-200"
          >
            Find My Matches
          </button>
        </div>

        {isLoading && (
          <div className="flex justify-center mb-8">
            <ReactLoading type="bubbles" color="black" />
          </div>
        )}

        {matches && matches.length > 0 && (
          <div className="mb-10">
            <h4 className="text-xl font-semibold mb-4 text-center">Recommended For You</h4>
            <div className="flex flex-wrap justify-center">
              {matches.map((match, index) => {
                const card = cards.find((c) => c.title === match.major);
                if (!card) return null;
                return (
                  <CareerCard
                    key={index}
                    title={card.title}
                    description={card.description}
                    imageUrl={card.imageUrl}
                    linkText={card.linkText}
                    linkUrl={card.linkUrl}
                    whyItFits={match.whyItFits}
                  />
                );
              })}
            </div>
          </div>
        )}

        <h4 className="text-xl font-semibold mb-4">Browse All Majors</h4>
        <div className="flex flex-wrap justify-center">
          {cards.map((card, index) => (
            <CareerCard
              key={index}
              title={card.title}
              description={card.description}
              imageUrl={card.imageUrl}
              linkText={card.linkText}
              linkUrl={card.linkUrl}
            />
          ))}
        </div>
      </main>
    </div>

  );
};

export default Page;
