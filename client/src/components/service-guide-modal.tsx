import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import {
  FileText,
  BookOpen,
  TrendingUp,
  CreditCard,
  Briefcase,
  HelpCircle,
  ArrowRight,
  ChevronLeft,
} from "lucide-react";

interface Category {
  id: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  description: string;
  serviceKeywords: string[];
  color: string;
  bgColor: string;
}

const CATEGORIES: Category[] = [
  {
    id: "tax",
    icon: <FileText className="w-6 h-6" />,
    title: "Tax Questions",
    subtitle: "Taxes & Filing",
    description:
      "Basic tax confusion, notices, filing questions, deductions, or 'what should I do next?'",
    serviceKeywords: ["tax", "filing", "irs", "deduction", "return"],
    color: "text-emerald-700",
    bgColor: "bg-emerald-50 border-emerald-200",
  },
  {
    id: "bookkeeping",
    icon: <BookOpen className="w-6 h-6" />,
    title: "Bookkeeping Help",
    subtitle: "Records & Organization",
    description:
      "Business owners and freelancers who need help organizing income, expenses, or records.",
    serviceKeywords: ["bookkeeping", "accounting", "records", "expenses"],
    color: "text-blue-700",
    bgColor: "bg-blue-50 border-blue-200",
  },
  {
    id: "budgeting",
    icon: <TrendingUp className="w-6 h-6" />,
    title: "Budgeting & Cash Flow",
    subtitle: "Planning & Forecasting",
    description:
      "Understanding where money is going or planning ahead for your financial future.",
    serviceKeywords: ["budget", "cash flow", "planning", "forecast"],
    color: "text-violet-700",
    bgColor: "bg-violet-50 border-violet-200",
  },
  {
    id: "debt",
    icon: <CreditCard className="w-6 h-6" />,
    title: "Debt Questions",
    subtitle: "Payoff Strategy",
    description:
      "Payoff strategy, credit card debt, student loans, or general debt direction.",
    serviceKeywords: ["debt", "credit", "loan", "payoff"],
    color: "text-rose-700",
    bgColor: "bg-rose-50 border-rose-200",
  },
  {
    id: "business",
    icon: <Briefcase className="w-6 h-6" />,
    title: "Business Finance",
    subtitle: "Founders & Small Business",
    description:
      "Founders and small business owners needing help with pricing, projections, or financial systems.",
    serviceKeywords: ["business", "startup", "pricing", "projections"],
    color: "text-amber-700",
    bgColor: "bg-amber-50 border-amber-200",
  },
  {
    id: "unsure",
    icon: <HelpCircle className="w-6 h-6" />,
    title: "Not Sure Where to Start",
    subtitle: "Let us guide you",
    description:
      "Not sure what kind of help you need? Start here and we'll route you to the right professional.",
    serviceKeywords: [],
    color: "text-gray-700",
    bgColor: "bg-gray-50 border-gray-200",
  },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function ServiceGuideModal({ open, onClose }: Props) {
  const [selected, setSelected] = useState<Category | null>(null);
  const [, navigate] = useLocation();

  const handleSelect = (cat: Category) => {
    setSelected(cat);
  };

  const handleFindProfessional = () => {
    onClose();
    if (selected?.id !== "unsure") {
      sessionStorage.setItem("serviceGuideCategory", selected?.id || "");
    }
    navigate("/");
    setTimeout(() => {
      document.getElementById("services-section")?.scrollIntoView({ behavior: "smooth" });
    }, 300);
  };

  const handleBack = () => setSelected(null);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg w-full p-0 overflow-hidden rounded-2xl gap-0">
        {/* Header */}
        <div className="bg-[#3A6B47] px-6 py-5 text-white">
          {selected ? (
            <button
              onClick={handleBack}
              className="flex items-center gap-1 text-sm text-white/80 hover:text-white mb-3 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
          ) : null}
          <p className="text-xs font-semibold uppercase tracking-widest text-white/60 mb-1">
            DEVN. Financial Guide
          </p>
          <h2 className="text-xl font-bold">
            {selected ? selected.title : "What can we help you with?"}
          </h2>
          <p className="text-sm text-white/75 mt-1">
            {selected
              ? selected.description
              : "Pick the topic that best describes your situation and we'll match you with the right expert."}
          </p>
        </div>

        {/* Body */}
        <div className="p-4 max-h-[60vh] overflow-y-auto">
          {!selected ? (
            <div className="grid grid-cols-1 gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => handleSelect(cat)}
                  className={`flex items-center gap-4 p-4 rounded-xl border text-left transition-all hover:shadow-sm active:scale-[0.99] ${cat.bgColor}`}
                >
                  <div className={`shrink-0 ${cat.color}`}>{cat.icon}</div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold text-sm ${cat.color}`}>{cat.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{cat.subtitle}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400 shrink-0" />
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {selected.id === "unsure" ? (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">
                    No worries — here's a quick way to figure it out. Answer one question:
                  </p>
                  <p className="font-semibold text-gray-800">
                    Are you dealing with a personal or business financial situation?
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "Personal", sub: "Income, taxes, debt, budgeting", target: 3 },
                      { label: "Business", sub: "Bookkeeping, projections, pricing", target: 4 },
                    ].map((opt) => (
                      <button
                        key={opt.label}
                        onClick={() => setSelected(CATEGORIES[opt.target])}
                        className="flex flex-col p-4 rounded-xl border border-gray-200 bg-gray-50 hover:border-[#3A6B47] hover:bg-green-50 transition-all text-left"
                      >
                        <span className="font-semibold text-gray-800 text-sm">{opt.label}</span>
                        <span className="text-xs text-gray-500 mt-1">{opt.sub}</span>
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 text-center pt-2">
                    Or just browse all services below.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className={`p-4 rounded-xl border ${selected.bgColor}`}>
                    <p className={`text-sm font-semibold ${selected.color} mb-1`}>
                      What this covers
                    </p>
                    <p className="text-sm text-gray-600">{selected.description}</p>
                  </div>
                  <div className="bg-[#FFE6C7]/60 border border-amber-200 rounded-xl p-4">
                    <p className="text-sm font-semibold text-amber-800 mb-1">What to expect</p>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li className="flex items-start gap-2">
                        <span className="text-[#3A6B47] font-bold mt-0.5">✓</span>
                        Browse verified professionals in this category
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-[#3A6B47] font-bold mt-0.5">✓</span>
                        See their rates, experience, and specializations
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-[#3A6B47] font-bold mt-0.5">✓</span>
                        Book a session directly at your convenience
                      </li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 pb-5 pt-2 flex flex-col gap-2">
          {selected && selected.id !== "unsure" && (
            <Button
              onClick={handleFindProfessional}
              className="w-full bg-[#3A6B47] hover:bg-[#2d5538] text-white rounded-xl h-11 font-semibold"
            >
              Find a {selected.title} Professional
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
          <Button
            variant="ghost"
            onClick={onClose}
            className="w-full text-gray-500 hover:text-gray-700 rounded-xl h-10 text-sm"
          >
            {selected ? "Skip for now" : "Skip — I'll browse on my own"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
