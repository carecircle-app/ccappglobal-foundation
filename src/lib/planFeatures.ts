import { R } from "@/lib/routes"; // keep your route helper

export type FeatureItem = { text: string; href?: string };

export const PLAN_FEATURES: { free: FeatureItem[]; lite: FeatureItem[]; elite: FeatureItem[] } = {
  free: [
    { text: "ðŸ‘¶ 1 kid", href: R.pricing },
    { text: "ðŸ“… Family calendar (simple)", href: R.calendar },
    { text: "âœ… Chores & reminders (basic)", href: R.tasks },
    { text: "ðŸ’¬ Family chat (short history)", href: R.chat },
    { text: "ðŸ“ Geofencing alerts (1â€“2 places)", href: R.map },
  ],
  lite: [
    { text: "ðŸ‘§ðŸ‘¦ 2 kids", href: R.tasks },
    { text: "ðŸ“… Better calendar (colors + smarter reminders)", href: R.calendar },
    { text: "âœ… Chores with photo check", href: R.tasks },
    { text: "ðŸ“² Text + app alerts for chores", href: R.tasks },
    { text: "ðŸ”’ Lock / pause internet*", href: R.devices },
    { text: "ðŸŽ¥ Quick check-in video", href: R.livestream },
    { text: "ðŸ›’ Shopping lists + keep simple receipts", href: R.receipts },
    { text: "ðŸ…¿ï¸ Park-my-car helper (save the spot)", href: R.map },
    { text: "ðŸ“ Home & school alerts (2 places)", href: R.map },
  ],
  elite: [
    { text: "ðŸ‘©â€ðŸ‘©â€ðŸ‘§â€ðŸ‘¦ Up to 5 kids (or more)", href: R.tasks },
    { text: "ðŸ“… Super calendar (smart colors & nudges)", href: R.calendar },
    { text: "âœ… Chores that nudge kindly if they forget", href: R.tasks },
    { text: "ðŸ“² Text + push + phone-style alerts", href: R.tasks },
    { text: "ðŸ“ Geofencing & arrival/leave alerts", href: R.map },
    { text: "ðŸ”’ Lock screen / pause internet / shut down*", href: R.devices },
    { text: "ðŸ’¬ Unlimited chat & longer live video check-ins", href: R.livestream },
    { text: "ðŸ›’ Receipts, budgets, shopping lists (advanced)", href: R.receipts },
    { text: "ðŸ…¿ï¸ Park-my-car + find my spot", href: R.map },
    { text: "ðŸ“‚ Safe place for doctor notes & school forms", href: R.vault },
    { text: "ðŸ›¡ï¸ Family safety (parents, kids, relatives, caregivers)", href: R.devices },
    { text: "ðŸš¨ SOS & fall alerts, loud alarm", href: R.devices },
    { text: "â¤ï¸ Priority support (fast help)", href: R.pricing },
    { text: "ðŸ§¼ ADL checklists + caregiver handoff", href: R.health },
    { text: "â¤ï¸ Vital signs (BP, heart, temp, O2, weight)", href: R.health },
    { text: "ðŸŽ Diabetes logs (sugar, insulin, food)", href: R.health },
    { text: "ðŸ’Š Medicine helper & MAR (pill times, refills, export)", href: R.health },
    { text: "ðŸ“ Daily care notes with photos & reports", href: R.health },
  ],
};

