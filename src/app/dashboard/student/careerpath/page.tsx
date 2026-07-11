"use client";

import { Bookmark, BriefcaseBusiness, ChevronRight, Filter, Search, Sparkles, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const interests = ["Building software", "Helping patients", "Leading teams & projects", "Data, numbers & analysis", "Writing & storytelling", "Lab work & research", "Teaching & mentoring", "Law, policy & government", "Design & visual creativity", "Sustainability & the environment"];
const careers = [
  { name: "UX Designer", fit: 92, salary: "$78k-$132k", outlook: "Growing fast", why: "Your creative problem-solving and interest in people align strongly.", skills: ["Research", "Prototyping", "Communication"] },
  { name: "Product Manager", fit: 87, salary: "$92k-$158k", outlook: "High demand", why: "Your leadership and systems thinking make this a promising direction.", skills: ["Strategy", "Leadership", "Analytics"] },
  { name: "Data Analyst", fit: 81, salary: "$67k-$112k", outlook: "Steady growth", why: "A strong match for your curiosity and evidence-based decision making.", skills: ["SQL", "Visualization", "Statistics"] },
  { name: "Content Strategist", fit: 78, salary: "$65k-$108k", outlook: "Growing", why: "Combines your communication strengths with product thinking.", skills: ["Writing", "Research", "Content systems"] },
];

export default function Careers() {
  const [selected, setSelected] = useState<string[]>([]);
  const [matches, setMatches] = useState<{ major: string; whyItFits: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const toggle = (value: string) => setSelected((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  const findMatches = async () => {
    if (!selected.length) return setError("Choose at least one interest first.");
    setError(""); setLoading(true);
    try {
      const response = await fetch("/api/agents/career-match", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ interests: selected }) });
      if (!response.ok) throw new Error(response.statusText);
      setMatches((await response.json()).matches ?? []);
    } catch { setError("Aspire could not create matches right now. Please try again."); }
    finally { setLoading(false); }
  };

  return <main className="page-wrap">
    <div className="flex flex-wrap items-end justify-between gap-5"><div><p className="eyebrow">Career discovery</p><h1 className="page-title mt-2">Paths that fit who you are</h1><p className="muted mt-2 max-w-2xl">Recommendations combine your interests with grounded career research. They are possibilities, not predictions.</p></div><button className="secondary-btn"><Bookmark size={16}/> Saved careers</button></div>
    <section className="surface-strong mt-7 p-6"><div className="flex gap-4"><span className="grid h-11 w-11 flex-none place-items-center rounded-lg bg-blue-500/15 text-blue-400"><Sparkles size={20}/></span><div><h2 className="font-semibold">Find your personalized matches</h2><p className="muted mt-1 text-sm">Choose a few interests and Aspire will explain the majors that align.</p></div></div><div className="mt-5 flex flex-wrap gap-2">{interests.map((item) => <button key={item} onClick={() => toggle(item)} className={`pill transition ${selected.includes(item) ? "border-blue-400 bg-blue-500/15 text-blue-200" : "hover:border-blue-400/50"}`}>{item}</button>)}</div>{error && <p className="mt-4 text-sm text-rose-400">{error}</p>}<button onClick={findMatches} disabled={loading} className="primary-btn mt-5 disabled:opacity-50">{loading ? "Finding matches..." : "Find my matches"}</button></section>
    {matches.length > 0 && <section className="mt-6"><p className="eyebrow">AI recommendations</p><div className="mt-3 grid gap-3 md:grid-cols-3">{matches.map((match) => <article key={match.major} className="surface card-hover p-5"><Sparkles size={17} className="text-blue-400"/><h2 className="mt-5 font-semibold">{match.major}</h2><p className="muted mt-3 text-sm leading-6">{match.whyItFits}</p></article>)}</div></section>}
    <div className="mt-7 flex gap-3"><label className="relative flex-1"><Search size={17} className="absolute left-4 top-3.5 text-slate-500"/><input className="field !pl-11" placeholder="Search careers, skills, or industries"/></label><button className="icon-btn !h-[46px] !w-[46px]" aria-label="Filter careers"><Filter size={18}/></button></div>
    <div className="mt-6 grid gap-4 md:grid-cols-2">{careers.map((career, index) => <article key={career.name} className="surface card-hover p-6"><div className="flex items-start justify-between"><span className="grid h-10 w-10 place-items-center rounded-lg bg-blue-500/10 text-blue-400"><BriefcaseBusiness size={19}/></span><button className="icon-btn !h-9 !w-9" aria-label={`Save ${career.name}`}><Bookmark size={16}/></button></div><div className="mt-7 flex items-end justify-between"><div><h2 className="text-xl font-semibold">{career.name}</h2><p className="mt-1 text-sm text-slate-500">{career.salary} · {career.outlook}</p></div><div className="text-right"><span className="text-2xl font-semibold text-green-400">{career.fit}%</span><p className="text-xs text-slate-500">fit range</p></div></div><p className="muted mt-5 text-sm leading-6">{career.why}</p><div className="mt-5 flex flex-wrap gap-2">{career.skills.map((skill) => <span className="pill" key={skill}>{skill}</span>)}</div><div className="mt-6 flex items-center justify-between border-t border-white/[.07] pt-5"><span className="flex items-center gap-2 text-xs text-slate-500"><TrendingUp size={14}/> {index < 2 ? "Strong opportunity" : "Worth exploring"}</span><Link href="/dashboard/student/roadmap" className="flex items-center gap-1 text-sm text-blue-400">View path <ChevronRight size={15}/></Link></div></article>)}</div>
  </main>;
}
