import { Link } from "wouter";
import logo from "@assets/whypals-logo.png";
import { ArrowLeft, Volume2, ShieldCheck, Sparkles, Gamepad2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Helmet } from "@/lib/helmet";

export default function About() {
  return (
    <div className="min-h-screen bg-background font-sans flex flex-col">
      <Helmet>
        <title>About WhyPals - Audio News for Kids</title>
        <meta name="description" content="WhyPals turns real, age-appropriate news stories into narrated audio kids can listen to like a podcast — with games and a growing library of Big Why questions to go with every story." />
        <meta property="og:title" content="About WhyPals - Audio News for Kids" />
        <meta property="og:description" content="WhyPals turns real, age-appropriate news stories into narrated audio kids can listen to like a podcast — with games and a growing library of Big Why questions to go with every story." />
        <meta property="og:type" content="website" />
      </Helmet>

      <nav className="p-4 border-b border-border/50 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 font-heading text-2xl font-bold text-primary hover:opacity-80 transition-opacity">
            <img src={logo} alt="WhyPals Logo" className="h-10 w-10 object-contain" />
            WhyPals
          </Link>
          <Link href="/">
            <Button variant="ghost" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Button>
          </Link>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-12 flex-grow">
        <div className="max-w-4xl mx-auto space-y-16">
          <section className="space-y-4 text-center">
            <h1 className="font-heading text-4xl md:text-5xl font-bold text-primary">News You Can Listen To</h1>
            <p className="text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
              WhyPals is audio news for kids — real stories about what's happening in the world, narrated out loud,
              with games and questions built around every one.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground">Why we built WhyPals</h2>
            <div className="text-lg text-muted-foreground leading-relaxed space-y-4">
              <p>
                Most "news for kids" is still built to be read: long articles, small text, a lot to sit still for.
                Kids don't always want to read the news — sometimes they just want someone to tell it to them.
              </p>
              <p>
                So every story on WhyPals is narrated out loud, the same way a podcast episode would be. Kids can
                listen while they're drawing, in the car, or before bed — and read along with the transcript if
                they want to follow the words too. It's news that fits how kids actually want to take it in.
              </p>
            </div>
          </section>

          <section className="space-y-6">
            <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground">What's inside</h2>
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="flex gap-4 p-5 rounded-2xl bg-primary/5 border border-primary/10">
                <div className="w-11 h-11 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                  <Volume2 className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-foreground mb-1">Narrated stories</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    New, age-appropriate news stories, narrated out loud and updated on a regular schedule — a
                    library kids can play through like a podcast.
                  </p>
                </div>
              </div>
              <div className="flex gap-4 p-5 rounded-2xl bg-primary/5 border border-primary/10">
                <div className="w-11 h-11 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-foreground mb-1">Big Why questions</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Every story comes with a "Big Why" — a question that digs a little deeper into an idea the
                    story touches on but doesn't fully explain.
                  </p>
                </div>
              </div>
              <div className="flex gap-4 p-5 rounded-2xl bg-primary/5 border border-primary/10">
                <div className="w-11 h-11 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                  <Gamepad2 className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-foreground mb-1">Games for every story</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Quizzes and mini-games built around what kids just listened to, so the story sticks after the
                    audio ends.
                  </p>
                </div>
              </div>
              <div className="flex gap-4 p-5 rounded-2xl bg-primary/5 border border-primary/10">
                <div className="w-11 h-11 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                  <ShieldCheck className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-foreground mb-1">Built for kids, with parents in mind</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Every story is age-appropriate and reviewed before it's published, with parental involvement
                    built into how accounts work.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-4 text-center bg-primary/5 rounded-2xl p-8 border border-primary/10">
            <h2 className="font-heading text-2xl font-bold text-foreground">Questions or feedback?</h2>
            <p className="text-muted-foreground">
              We'd love to hear from you at{" "}
              <a href="mailto:admin@whypals.com" className="text-primary font-semibold hover:underline">admin@whypals.com</a>.
            </p>
            <p className="text-sm text-muted-foreground/80">
              For the legal details, see our{" "}
              <Link href="/terms" className="text-primary font-semibold hover:underline">Terms and Conditions</Link>.
            </p>
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
              <Link href="/terms" className="text-primary font-bold hover:opacity-80 transition-opacity">Terms & Privacy</Link>
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
