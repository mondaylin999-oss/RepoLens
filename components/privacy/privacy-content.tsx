"use client";

import { useLanguage } from "@/components/layout/language-provider";

type Section = { title: string; paragraphs: string[]; bullets?: string[] };

const CONTENT: Record<"en" | "my", { title: string; intro: string; updated: string; sections: Section[] }> = {
  en: {
    title: "Privacy",
    intro: "This page explains what RepoLens processes when you analyze a repository and what is saved when you choose its optional features.",
    updated: "Last updated November 13, 2026",
    sections: [
      {
        title: "Repository analysis",
        paragraphs: [
          "When you submit a GitHub repository URL, your browser sends it to RepoLens. The server validates the address and requests public repository details and the default-branch file list from the GitHub REST API. RepoLens only analyzes public repositories and makes read-only GitHub requests; it does not change repository contents.",
          "A complete analysis made without a personal token may be served from a shared cache for five minutes; stale results may remain available for up to ten more minutes while a fresh result is requested. Analyses using a token, incomplete file lists, and error responses are marked not to be cached by RepoLens.",
        ],
      },
      {
        title: "Optional GitHub token",
        paragraphs: [
          "If you enter a personal access token to help with GitHub API limits, your browser sends it to RepoLens over HTTPS in a request header. RepoLens forwards it to GitHub for public-repository read requests. The token is kept in page memory for the current visit, is not saved in browser storage by RepoLens, and is not included in RepoLens's custom request metrics. Do not use a token that grants write access.",
        ],
      },
      {
        title: "Data kept in your browser",
        paragraphs: [
          "These optional features use this browser's local storage: recent analysis history, saved repositories and their score snapshots, checklist completion, your interface and description language choices, whether the first-visit guide was dismissed, and your history-sync preferences. They are not uploaded unless you enable their account sync options. You can clear recent analysis history from its control, remove saved repositories in the saved-repositories list, or clear RepoLens site data in your browser settings.",
        ],
      },
      {
        title: "GitHub sign-in and account history",
        paragraphs: [
          "GitHub sign-in is optional. RepoLens uses your GitHub account identifier to associate account features with you. If you enable account history sync, RepoLens stores up to 50 selected analysis records for your account in Neon: repository name and public URL, score, earned points, whether file checks were complete, and analysis time. You can separately sync up to 100 saved repositories, including their public URLs, language, save and refresh dates, and up to 12 score snapshots each. This lets you access them on another device. Your GitHub profile name is shown with account history.",
          "Turning a sync option off stops future uploads; it does not delete data already stored for your account. Synced saved repositories can be removed individually from the saved list while sync is enabled. RepoLens currently has no self-service control to delete synced analysis history. Local browser history can be cleared separately using its control.",
        ],
      },
      {
        title: "Team workspaces",
        paragraphs: [
          "If you create or join a team workspace, RepoLens stores its name, membership and role, plus the public repository URL and score details that members share. Workspace members can view shared reviews. Invite links contain a secret code, expire after seven days, and allow up to 20 joins; RepoLens stores a one-way hash of the code rather than the code itself. The code stays in the current browser tab while you sign in and is cleared after you join.",
        ],
      },
      {
        title: "Operational metrics",
        paragraphs: [
          "RepoLens records a small custom metric for analysis API requests: the endpoint category, HTTP status, and response time. These custom metrics do not include repository URLs or GitHub tokens. The hosting provider may separately process request and security logs as part of operating the service.",
          "To enforce short-term request limits, RepoLens also stores a keyed, non-reversible hash of the requester network address with endpoint counters in Neon. These counters are removed after 48 hours. If Neon is temporarily unavailable, a per-runtime limit is used until the shared store is reachable again.",
        ],
      },
      {
        title: "Third-party services",
        paragraphs: [
          "Repository data is requested from GitHub. The website and API are hosted by Vercel, and optional account history is stored by Neon. GitHub, Vercel, and Neon process data under their own policies and service terms.",
        ],
        bullets: ["GitHub: github.com/privacy", "Vercel: vercel.com/legal/privacy-policy", "Neon: neon.tech/privacy-policy"],
      },
      {
        title: "Your choices",
        paragraphs: [
          "You can analyze public repositories without signing in, leave the token field empty, keep history only in this browser, or leave account sync disabled. If you have questions about account history stored by RepoLens, contact the project maintainer through the RepoLens GitHub repository.",
        ],
      },
    ],
  },
  my: {
    title: "ကိုယ်ရေးအချက်အလက်",
    intro: "Repository စစ်ဆေးချိန်တွင် RepoLens က မည်သည့်အချက်အလက်များကို အသုံးပြုသည်၊ ရွေးချယ်နိုင်သော လုပ်ဆောင်ချက်များကို ဖွင့်ထားပါက မည်သည့်အချက်အလက်များကို သိမ်းဆည်းသည်ကို ဤစာမျက်နှာတွင် ရှင်းပြထားသည်။",
    updated: "နောက်ဆုံးပြင်ဆင်သည့်ရက် — ၂၀၂၆ နိုဝင်ဘာ ၁၃",
    sections: [
      { title: "Repository စစ်ဆေးခြင်း", paragraphs: ["GitHub repository URL ကို ထည့်သွင်းပါက သင့် browser မှ RepoLens သို့ ပေးပို့သည်။ ဆာဗာက လိပ်စာကို စစ်ဆေးပြီး GitHub REST API မှ အများမြင်နိုင်သော repository အချက်အလက်များနှင့် မူလ branch ၏ ဖိုင်စာရင်းကို တောင်းယူသည်။ အများမြင်နိုင်သော repository များကိုသာ စစ်ဆေးပြီး GitHub တွင် ဖတ်ရှုရန်သာ တောင်းဆိုသည်။ repository အတွင်းရှိ အကြောင်းအရာများကို ပြောင်းလဲခြင်း မရှိပါ။", "ကိုယ်ပိုင် token မပါဘဲ ပြီးပြည့်စုံသော စစ်ဆေးမှုရလဒ်ကို shared cache မှ ငါးမိနစ်အထိ ရနိုင်သည်။ ရလဒ်အသစ်တောင်းနေစဉ် အဟောင်းကို နောက်ထပ် ဆယ်မိနစ်အထိ ပြသနိုင်သည်။ Token ပါသော စစ်ဆေးမှု၊ မပြည့်စုံသော ဖိုင်စာရင်းနှင့် အမှားတုံ့ပြန်ချက်များကို RepoLens က cache မလုပ်ရန် သတ်မှတ်ထားသည်။"] },
      { title: "ရွေးချယ်နိုင်သော GitHub token", paragraphs: ["GitHub API ကန့်သတ်ချက်အတွက် Personal Access Token ထည့်ပါက browser မှ HTTPS ဖြင့် request header ထဲတွင် RepoLens သို့ ပေးပို့သည်။ RepoLens က အများမြင်နိုင်သော repository များကို ဖတ်ရန် GitHub သို့ ပြန်လည်ပေးပို့သည်။ လက်ရှိစာမျက်နှာအသုံးပြုနေစဉ် memory ထဲတွင်သာ ထားပြီး browser storage ထဲသို့ မသိမ်းပါ။ RepoLens ၏ ကိုယ်ပိုင် request metrics ထဲတွင်လည်း မပါဝင်ပါ။ Write ခွင့်ပြုချက်ပါသော token ကို မသုံးပါနှင့်။"] },
      { title: "သင့် browser ထဲတွင် သိမ်းဆည်းသောအချက်များ", paragraphs: ["ရွေးချယ်နိုင်သော လုပ်ဆောင်ချက်များဖြစ်သည့် မကြာသေးမီက စစ်ဆေးမှုမှတ်တမ်း၊ သိမ်းထားသော repository နှင့် ရမှတ်မှတ်တမ်း၊ checklist ပြီးစီးမှု၊ ဘာသာစကားရွေးချယ်မှုများ၊ ပထမဆုံးအသုံးပြုမှုလမ်းညွှန်ကို ပိတ်ထား/မထားခြင်းနှင့် history sync ဆက်တင်တို့ကို ဤ browser ၏ local storage တွင် သိမ်းသည်။ Account sync မဖွင့်ထားပါက အချက်အလက်များကို ဆာဗာသို့ ပေးပို့ခြင်း မရှိပါ။ မကြာသေးမီမှတ်တမ်းကို ၎င်း၏ Clear ခလုတ်ဖြင့် ရှင်းနိုင်ပြီး၊ သိမ်းထားသော repository များကို စာရင်းမှ ဖယ်ရှားနိုင်သည်။ Browser ဆက်တင်တွင် RepoLens site data ကိုလည်း ရှင်းနိုင်သည်။"] },
      { title: "GitHub ဝင်ရောက်မှုနှင့် အကောင့်မှတ်တမ်း", paragraphs: ["GitHub ဖြင့် ဝင်ရောက်ခြင်းသည် ရွေးချယ်နိုင်သည်။ Account history sync ဖွင့်ပါက ရွေးချယ်ထားသော စစ်ဆေးမှုမှတ်တမ်း ၅၀ ခုအထိကို Neon တွင် သိမ်းသည်။ Repository အမည်နှင့် အများမြင်နိုင်သော URL၊ ရမှတ်၊ ရရှိထားသောအမှတ်၊ ဖိုင်စစ်ဆေးမှု ပြည့်စုံ/မပြည့်စုံ၊ စစ်ဆေးသည့်အချိန်တို့ ပါဝင်သည်။ သီးခြားစီဖွင့်ပါက သိမ်းထားသော repository ၁၀၀ ခုအထိ၊ ၎င်းတို့၏ အများမြင်နိုင်သော URL၊ ဘာသာစကား၊ သိမ်း/ပြန်စစ်သည့်အချိန်နှင့် ရမှတ်မှတ်တမ်း ၁၂ ခုအထိကိုလည်း sync လုပ်နိုင်သည်။ အခြားစက်မှ ဝင်ကြည့်နိုင်သည်။ Account history တွင် GitHub profile အမည်ကို ပြသသည်။", "Sync ပိတ်လိုက်ပါက နောက်ထပ် upload များကို ရပ်တန့်သော်လည်း အကောင့်ထဲတွင် သိမ်းပြီးသားအချက်အလက်များကို ဖျက်မည်မဟုတ်ပါ။ Sync ဖွင့်ထားစဉ် saved list ထဲမှ repository တစ်ခုချင်းကို ဖယ်ရှားနိုင်သည်။ Synced analysis history ကို ကိုယ်တိုင်ဖျက်နိုင်သည့် ခလုတ် လက်ရှိတွင် မရှိပါ။ Browser ထဲကမှတ်တမ်းကို သီးခြားရှင်းနိုင်သည်။"] },
      { title: "အဖွဲ့ workspace များ", paragraphs: ["အဖွဲ့ workspace တစ်ခုကို ဖန်တီး/ဝင်ရောက်ပါက ၎င်း၏အမည်၊ အသင်းဝင်နှင့် အခန်းကဏ္ဍများ၊ အဖွဲ့ဝင်များ မျှဝေသော အများမြင်နိုင်သည့် repository URL နှင့် ရမှတ်အချက်အလက်များကို RepoLens က Neon တွင် သိမ်းသည်။ Workspace အသင်းဝင်များက မျှဝေထားသော review များကို ကြည့်နိုင်သည်။ Invite link များတွင် လျှို့ဝှက်ကုဒ်ပါပြီး ၇ ရက်အတွင်း သက်တမ်းကုန်ကာ လူ ၂၀ အထိ ဝင်နိုင်သည်။ RepoLens က ကုဒ်ကို တိုက်ရိုက်မသိမ်းဘဲ one-way hash ကိုသာ သိမ်းသည်။"] },
      { title: "ဝန်ဆောင်မှုဆိုင်ရာ metrics", paragraphs: ["RepoLens က analysis API တောင်းဆိုမှုတိုင်းအတွက် endpoint အမျိုးအစား၊ HTTP အခြေအနေကုဒ်နှင့် တုံ့ပြန်ချိန်တို့ကိုသာ custom metric အဖြစ် မှတ်တမ်းတင်သည်။ ဤ metrics များတွင် repository URL သို့မဟုတ် GitHub token မပါဝင်ပါ။ Hosting provider သည် ဝန်ဆောင်မှုလည်ပတ်ရန် request နှင့် security log များကို သီးခြားစီ ကိုင်တွယ်နိုင်သည်။", "ကာလတို request limit ကို အကောင်အထည်ဖော်ရန် requester ၏ network address ကို keyed hash ပြုလုပ်ပြီး endpoint counter နှင့်အတူ Neon တွင် သိမ်းသည်။ Counter များကို ၄၈ နာရီအကြာတွင် ဖျက်သည်။ Neon ခဏတာ မရရှိပါက shared database ပြန်ရသည်အထိ runtime တစ်ခုချင်းစီ၏ limit ကို အသုံးပြုသည်။"] },
      { title: "ပြင်ပဝန်ဆောင်မှုများ", paragraphs: ["Repository အချက်အလက်ကို GitHub မှ တောင်းယူသည်။ Website နှင့် API ကို Vercel တွင် လက်ခံထားပြီး ရွေးချယ်နိုင်သော အကောင့်မှတ်တမ်းကို Neon တွင် သိမ်းသည်။ ဝန်ဆောင်မှုတစ်ခုစီသည် ၎င်း၏ ကိုယ်ပိုင် privacy policy နှင့် ဝန်ဆောင်မှုစည်းကမ်းချက်များအတိုင်း အချက်အလက်ကို ကိုင်တွယ်သည်။"], bullets: ["GitHub: github.com/privacy", "Vercel: vercel.com/legal/privacy-policy", "Neon: neon.tech/privacy-policy"] },
      { title: "သင့်ရွေးချယ်ခွင့်များ", paragraphs: ["ဝင်ရောက်ခြင်းမပြုဘဲ အများမြင်နိုင်သော repository များကို စစ်ဆေးနိုင်သည်၊ token မထည့်ဘဲ ဆက်လက်အသုံးပြုနိုင်သည်၊ မှတ်တမ်းကို ဤ browser ထဲတွင်သာ ထားနိုင်သည်၊ သို့မဟုတ် account sync ကို ပိတ်ထားနိုင်သည်။ RepoLens အကောင့်မှတ်တမ်းနှင့်ပတ်သက်၍ မေးမြန်းလိုပါက RepoLens GitHub repository မှတစ်ဆင့် ပရောဂျက်ထိန်းသိမ်းသူထံ ဆက်သွယ်ပါ။"] },
    ],
  },
};

const SERVICE_URLS = ["https://github.com/privacy", "https://vercel.com/legal/privacy-policy", "https://neon.tech/privacy-policy"];

export function PrivacyContent() {
  const { language } = useLanguage();
  const content = CONTENT[language];
  return (
    <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
      <header className="mb-10">
        <p className="text-sm font-medium text-primary">RepoLens</p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight">{content.title}</h1>
        <p className="mt-4 max-w-2xl leading-7 text-muted-foreground">{content.intro}</p>
        <p className="mt-3 text-sm text-muted-foreground">{content.updated}</p>
      </header>
      <div className="space-y-8">
        {content.sections.map((section, index) => (
          <section key={section.title} aria-labelledby={`privacy-section-${index}`}>
            <h2 id={`privacy-section-${index}`} className="text-xl font-semibold">{section.title}</h2>
            {section.paragraphs.map((paragraph) => <p key={paragraph} className="mt-3 leading-7 text-muted-foreground">{paragraph}</p>)}
            {section.bullets && <ul className="mt-3 list-inside list-disc space-y-2 text-sm text-primary">{section.bullets.map((label, i) => <li key={label}><a href={SERVICE_URLS[i]} target="_blank" rel="noreferrer" className="underline underline-offset-4">{label}</a></li>)}</ul>}
          </section>
        ))}
      </div>
    </main>
  );
}
