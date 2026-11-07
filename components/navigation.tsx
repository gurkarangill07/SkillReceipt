import Link from "next/link";
import { currentAccount } from "../lib/server/account-http";
import { SignOut } from "./account-actions";
import { Icon } from "./icon";

export async function Navigation() {
  const account = await currentAccount();
  return (
    <header className="site-header">
      <div className="shell header-inner">
        <Link href="/" className="brand" aria-label="SkillReceipt home"><span className="brand-mark"><Icon name="receipt" size={23} /></span>SkillReceipt<span className="brand-dot">.</span></Link>
        <nav aria-label="Main navigation">
          {account ? <><Link href={account.role === "candidate" ? "/dashboard" : "/employer"} className="nav-receipts">{account.role === "candidate" ? "My workspace" : "Employer workspace"}</Link>{account.role === "candidate" && <Link href="/start" className="button button-small button-dark">Find a role<Icon name="arrow" size={16} /></Link>}<SignOut /></> : <><Link href="/login?role=employer" className="nav-receipts">For employers</Link><Link href="/login?role=candidate" className="button button-small button-dark">Candidate sign in<Icon name="arrow" size={16} /></Link></>}
        </nav>
      </div>
    </header>
  );
}

export function Footer() {
  return <footer className="site-footer"><div className="shell footer-inner"><Link href="/" className="footer-brand">SkillReceipt<span className="brand-dot">.</span></Link><p>Practical work. Inspectable evidence.</p><span className="mono micro">UNHACK 2026 · LOCAL PROTOTYPE</span></div></footer>;
}
