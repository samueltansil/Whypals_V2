import { useState, useEffect } from "react";
import { Link } from "wouter";
import logo from "@assets/whypals-logo.png";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Helmet } from "@/lib/helmet";

export default function Terms() {
  const [fromRegister, setFromRegister] = useState(false);

  useEffect(() => {
    const search = window.location.search;
    const params = new URLSearchParams(search);
    setFromRegister(params.get("from") === "register");
  }, []);
  return (
    <div className="min-h-screen bg-background font-sans flex flex-col">
      <Helmet>
        <title>Terms and Conditions | WhyPals</title>
        <meta name="description" content="The terms and conditions governing use of the WhyPals platform, including parental consent, child safety, and data privacy under Singapore's PDPA." />
        <meta name="robots" content="noindex, follow" />
      </Helmet>
      <nav className="p-4 border-b border-border/50 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 font-heading text-2xl font-bold text-primary hover:opacity-80 transition-opacity">
            <img src={logo} alt="WhyPals Logo" className="h-10 w-10 object-contain" />
            WhyPals
          </Link>
          <Link href={fromRegister ? "/register" : "/"}>
            <Button variant="ghost" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              {fromRegister ? "Back to Register" : "Back to Home"}
            </Button>
          </Link>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-12 flex-grow">
        <div className="max-w-4xl mx-auto space-y-12">
          <section className="space-y-4 text-center">
            <h1 className="font-heading text-4xl md:text-5xl font-bold text-primary">WhyPals – Terms and Conditions</h1>
            <p className="text-sm text-muted-foreground">Last updated: 4 January 2026</p>
            <p className="text-xl text-muted-foreground leading-relaxed">
              These Terms and Conditions govern your access to and use of the WhyPals website, platform, and related services (collectively, the Platform).
              By accessing or using WhyPals, you agree to be bound by these Terms. If you do not agree with these Terms, please do not use the Platform.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="font-heading text-3xl font-bold text-primary">1. About WhyPals</h2>
            <div className="text-xl text-muted-foreground leading-relaxed space-y-3">
              <p>
                WhyPals is an educational platform designed to help children learn about the world through age-appropriate,
                informative, and engaging content. WhyPals is intended for use by children with parental or guardian involvement.
              </p>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="font-heading text-3xl font-bold text-primary">2. Eligibility and Parental Consent</h2>
            <div className="text-xl text-muted-foreground leading-relaxed space-y-3">
              <ul className="list-disc pl-6 space-y-2">
                <li>Users under the age of 13 may only create and use an account with the review, approval, and consent of a parent or legal guardian.</li>
                <li>WhyPals does not knowingly collect personal data from children under 13 without parental consent.</li>
                <li>Parents or guardians are responsible for supervising their child's use of the Platform. If you are a parent or guardian, you confirm that you have the authority to provide consent on behalf of the child.</li>
              </ul>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="font-heading text-3xl font-bold text-primary">3. Educational Use Only</h2>
            <div className="text-xl text-muted-foreground leading-relaxed space-y-3">
              <p>
                The WhyPals Platform is provided solely for educational and informational purposes. The content on WhyPals is not intended to
                replace professional advice, including educational, medical, psychological, or legal advice. Parents and guardians remain
                responsible for guiding and supporting their child's learning.
              </p>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="font-heading text-3xl font-bold text-primary">4. Account Registration and Responsibility</h2>
            <div className="text-xl text-muted-foreground leading-relaxed space-y-3">
              <p>When creating an account:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Information provided must be accurate and up to date.</li>
                <li>Accounts may not be shared between users.</li>
                <li>Parents or guardians are responsible for all activities conducted under a child's account.</li>
                <li>WhyPals reserves the right to suspend or terminate accounts that violate these Terms.</li>
              </ul>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="font-heading text-3xl font-bold text-primary">5. Child Safety and Monitoring</h2>
            <div className="text-xl text-muted-foreground leading-relaxed space-y-3">
              <ul className="list-disc pl-6 space-y-2">
                <li>WhyPals may monitor or review content, interactions, or activity on the Platform for safety, moderation, and educational purposes only.</li>
                <li>Monitoring is not used for advertising, behavioural tracking, or profiling of children.</li>
                <li>Inappropriate, harmful, or unsafe content or behaviour is strictly prohibited.</li>
              </ul>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="font-heading text-3xl font-bold text-primary">6. Acceptable Use</h2>
            <div className="text-xl text-muted-foreground leading-relaxed space-y-3">
              <p>Users agree that they will not:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Share inappropriate, offensive, or harmful content</li>
                <li>Harass, bully, or threaten other users</li>
                <li>Attempt to bypass safety features or moderation systems</li>
                <li>Upload content that infringes intellectual property or privacy rights</li>
                <li>Use the Platform for non-educational or commercial purposes</li>
              </ul>
              <p>WhyPals may remove content or restrict access at its discretion to protect users.</p>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="font-heading text-3xl font-bold text-primary">7. Personal Data and Privacy</h2>
            <div className="text-xl text-muted-foreground leading-relaxed space-y-3">
              <p>
                WhyPals complies with the Personal Data Protection Act 2012 (PDPA) of Singapore and is committed to protecting children's personal data through reasonable and appropriate safeguards.
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>WhyPals collects only limited personal data necessary to operate the Platform.</li>
                <li>Personal data is used only for stated educational and operational purposes.</li>
                <li>Parents or guardians may request access to, correction of, or deletion of their child's personal data.</li>
              </ul>
              <p>Further details are set out in the WhyPals Privacy Policy, which forms part of these Terms.</p>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="font-heading text-3xl font-bold text-primary">8. Parental Rights</h2>
            <div className="text-xl text-muted-foreground leading-relaxed space-y-3">
              <p>Parents or guardians may:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Review personal information collected about their child</li>
                <li>Request correction or deletion of such information</li>
                <li>Withdraw consent and request account closure</li>
              </ul>
              <p>
                Requests may be made by contacting WhyPals at:{" "}
                <a href="mailto:admin@whypals.com" className="text-primary font-semibold hover:underline">admin@whypals.com</a>
              </p>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="font-heading text-3xl font-bold text-primary">9. Intellectual Property</h2>
            <div className="text-xl text-muted-foreground leading-relaxed space-y-3">
              <p>
                All content on WhyPals, including text, illustrations, logos, and educational materials, is owned by or licensed to WhyPals.
                Users may not copy, distribute, modify, or reproduce content without prior written permission, except for personal, non-commercial educational use.
              </p>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="font-heading text-3xl font-bold text-primary">10. Suspension and Termination</h2>
            <div className="text-xl text-muted-foreground leading-relaxed space-y-3">
              <p>WhyPals may suspend or terminate access to the Platform if:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>These Terms are breached</li>
                <li>There are safety or legal concerns</li>
                <li>Continued use may pose risk to other users</li>
              </ul>
              <p>Termination does not affect any rights or obligations accrued before termination.</p>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="font-heading text-3xl font-bold text-primary">11. Disclaimer and Limitation of Liability</h2>
            <div className="text-xl text-muted-foreground leading-relaxed space-y-3">
              <p>WhyPals provides the Platform on an "as is" and "as available" basis. To the fullest extent permitted by law:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>WhyPals does not guarantee uninterrupted or error-free access.</li>
                <li>WhyPals is not liable for indirect, incidental, or consequential losses arising from use of the Platform.</li>
              </ul>
              <p>Nothing in these Terms limits liability that cannot be excluded under Singapore law.</p>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="font-heading text-3xl font-bold text-primary">12. Changes to These Terms</h2>
            <div className="text-xl text-muted-foreground leading-relaxed space-y-3">
              <p>
                WhyPals may update these Terms from time to time. Updated Terms will be posted on the Platform, and continued use indicates acceptance of the revised Terms.
              </p>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="font-heading text-3xl font-bold text-primary">13. Governing Law and Jurisdiction</h2>
            <div className="text-xl text-muted-foreground leading-relaxed space-y-3">
              <p>
                These Terms and Conditions are governed by and construed in accordance with the laws of Singapore. Any dispute arising out of or in connection with these Terms shall be subject to the exclusive jurisdiction of the courts of Singapore.
              </p>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="font-heading text-3xl font-bold text-primary">14. Contact Us</h2>
            <div className="text-xl text-muted-foreground leading-relaxed space-y-3">
              <p>
                If you have any questions about these Terms, please contact{" "}
                <a href="mailto:admin@whypals.com" className="text-primary font-semibold hover:underline">admin@whypals.com</a>.
              </p>
            </div>
          </section>
        </div>
      </main>

      <footer className="bg-white border-t border-border py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-3">
              <img src={logo} alt="WhyPals Logo" className="h-10 w-10 object-contain grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all" />
              <span className="font-heading text-xl font-bold text-muted-foreground">WhyPals</span>
            </div>
            <div className="flex gap-8 text-sm font-semibold text-muted-foreground">
              <Link href="/about" className="hover:text-primary transition-colors">About Us</Link>
              <Link href="/contact" className="hover:text-primary transition-colors">Contact</Link>
            </div>
            <p className="text-xs text-muted-foreground/50">
              © 2026 Edu Foundations. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
