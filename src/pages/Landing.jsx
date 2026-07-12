import { base44 } from "@/api/base44Client";

export default function Landing() {
  return (
    <div className="h-screen flex flex-col items-center justify-center gap-8 bg-[#1a1a1a] text-slate-100 px-6 text-center">
      <h1 className="text-3xl sm:text-5xl font-bold max-w-3xl leading-tight">
        It's shit for now, but it'll get better.
      </h1>
      <button
        onClick={() => base44.auth.redirectToLogin("/Dashboard")}
        className="h-12 px-8 bg-gradient-to-r from-[#C9A227] to-[#A8841C] hover:from-[#A8841C] hover:to-[#8a6c16] text-white font-semibold text-sm rounded-xl transition-all"
      >
        Sign in
      </button>
    </div>
  );
}