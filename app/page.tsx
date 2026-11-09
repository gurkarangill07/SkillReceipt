import Link from "next/link";
import { Icon } from "../components/icon";

export default function HomePage() {
  return <>
    <section className="shell hero career-hero">
      <div className="hero-copy">
        <p className="eyebrow"><span className="tiny-rule" /> SKILLRECEIPT</p>
        <h1>Put your skills<br />to <em>work.</em></h1>
        <p className="hero-description">Prove your approach in a camera-required work sample. Get a transparent skill score and a session integrity report, then choose whether to share the evidence with employers.</p>
        <div className="hero-actions">
          <Link className="button button-dark" href="/start">Demonstrate my skills<Icon name="arrow" size={18} /></Link>
          <Link href="/employer" className="button button-outline">Review candidate work<Icon name="arrow" size={17} /></Link>
        </div>
      </div>
      <div className="career-preview panel" aria-label="Sample assessment report, not a personal result">
        <div className="preview-heading"><span className="mono micro">ASSESSMENT REPORT</span><span className="tag">Sample</span></div>
        <div className="preview-example-banner"><Icon name="info" size={15} /><span>SAMPLE RESULT · NOT YOUR SCORE</span></div>
        <span className="preview-role">JUNIOR DATA ENGINEER</span>
        <div className="preview-score"><strong>80<span>/100</span></strong><span className="tag tag-green">3 of 4 checks passed</span></div>
        <h2>Review the work behind the score.</h2>
        <p>This sample shows how a task, scoring evidence and improvement steps fit together.</p>
        <div className="preview-checks"><span><Icon name="check" size={15} />Business keys<strong>20/20</strong></span><span><Icon name="check" size={15} />Data quality<strong>20/20</strong></span><span><Icon name="check" size={15} />Reliable loading<strong>20/20</strong></span><span className="preview-gap"><Icon name="arrow" size={15} />JavaScript basics<strong>20/40</strong></span></div>
        <div className="preview-next"><span className="eyebrow">SUGGESTED PRACTICE</span><p>Handle missing order amounts, then run four test cases to check the solution.</p></div>
        <div className="preview-footer"><Icon name="file" size={15} />An illustrative work sample and score report.</div>
      </div>
    </section>
    <section className="career-how shell" aria-label="How SkillReceipt works">{[
      { n: "01", title: "Add your resume", copy: "Use your listed skills to find relevant work samples." },
      { n: "02", title: "Complete a monitored work sample", copy: "Keep your camera on, stay in fullscreen and solve a practical task." },
      { n: "03", title: "Review the evidence", copy: "Inspect skill scoring and a separate timeline of session observations." },
      { n: "04", title: "Choose what to share", copy: "Publish your results for employers when you are ready." },
    ].map((step) => <div key={step.n}><span className="mono micro">{step.n}</span><h2>{step.title}</h2><p>{step.copy}</p></div>)}</section>
    <section className="shell employer-callout panel"><div><p className="eyebrow">FOR EMPLOYERS</p><h2>Evaluate skills through work.</h2><p>Review candidate-published work, scoring evidence and session integrity observations together. See the work behind the score and the context behind the attempt.</p></div><Link className="button button-outline" href="/employer">Explore candidate work<Icon name="arrow" size={17} /></Link></section>
  </>;
}
