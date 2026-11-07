import Link from "next/link";
import { Icon } from "./icon";

export function Navigation() {
  return (
    <header className="site-header">
      <div className="shell header-inner">
        <Link href="/" className="brand" aria-label="SkillReceipt home"><span className="brand-mark"><Icon name="receipt" size={23} /></span>SkillReceipt<span className="brand-dot">.</span></Link>
        <nav aria-label="Main navigation">
          <Link href="/receipts" prefetch={false} className="nav-receipts">My receipts</Link>
          <Link href="/assessment" className="button button-small button-dark">Take the challenge <Icon name="arrow" size={16} /></Link>
        </nav>
      </div>
    </header>
  );
}

export function Footer() {
  return <footer className="site-footer"><div className="shell footer-inner"><Link href="/" className="footer-brand">SkillReceipt<span className="brand-dot">.</span></Link><p>Practical work. Inspectable evidence.</p><span className="mono micro">UNHACK 2026 · LOCAL PROTOTYPE</span></div></footer>;
}
