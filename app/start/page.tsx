import type { Metadata } from "next";
import { CareerStart } from "../../components/career-start";
export const metadata: Metadata = { title: "Explore challenges" };
export default function StartPage() { return <div className="shell career-shell"><CareerStart /></div>; }
