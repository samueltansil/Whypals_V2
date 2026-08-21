import { Link } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import logo from "@assets/whypals-logo.png";
import { ArrowLeft, Sparkles } from "lucide-react";

// Shown at /login and /register instead of the real forms whenever the
// site's "free access" switch (toggled from /admin/banners) is on — the
// routes stay live, they just don't render an actual login/signup flow.
export default function LoginUnavailableNotice() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background flex items-center justify-center p-4 relative">
      <div className="absolute top-4 left-4">
        <Link href="/">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Button>
        </Link>
      </div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <Link href="/">
            <img src={logo} alt="WhyPals" className="h-20 w-20 mx-auto mb-4" />
          </Link>
        </div>

        <Card className="shadow-xl border-2 border-primary/10 text-center" data-testid="card-login-unavailable">
          <CardHeader>
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
              <Sparkles className="w-7 h-7 text-primary" />
            </div>
            <CardTitle className="font-heading text-xl">Login unavailable</CardTitle>
            <CardDescription className="text-base">
              WhyPals is free to use at the moment — no login is needed!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/">
              <Button className="w-full">Back to WhyPals</Button>
            </Link>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
