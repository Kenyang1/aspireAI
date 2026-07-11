import { Sparkles } from "lucide-react";
import Link from "next/link";

export default function BrandLogo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" aria-label="Aspire AI home" className="brand-logo">
      <span className={`brand-orbit ${compact ? "h-9 w-9" : "h-10 w-10"}`}>
        <Sparkles size={compact ? 17 : 19} strokeWidth={2.4} />
      </span>
      {!compact && <span className="whitespace-nowrap text-[17px] font-extrabold">Aspire<span className="brand-ai">AI</span></span>}
    </Link>
  );
}
