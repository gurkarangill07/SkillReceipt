import Link from "next/link";
import { Icon } from "./icon";

export function Navigation() {
  return (
    <header className="site-header">
      <div className="shell header-inner">
        <Link href="/" className="brand" aria-label="SkillReceipt home"><span className="brand-mark"><Icon name="receipt" size={23} /></span>SkillReceipt<span className="brand-dot">.</span></Link>
        <nav aria-label="Main navigation">
          <Link href="/employer" className="nav-receipts">For employers</Link><Link href="/receipts" className="nav-receipts">My results</Link><Link href="/start" className="button button-small button-dark">Find work<Icon name="arrow" size={16} /></Link>
        </nav>
      </div>
    </header>
  );
}

export function Footer() {
  return <footer className="site-footer"><div className="shell footer-inner"><Link href="/" className="footer-brand">SkillReceipt<span className="brand-dot">.</span></Link><p>Small challenges. Work you can show.</p><span className="mono micro">BUILT FOR UNHACK · NO ACCOUNT NEEDED</span></div></footer>;
}
