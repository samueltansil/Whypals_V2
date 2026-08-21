import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useFreeAccessMode } from "@/hooks/useFreeAccessMode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import logo from "@assets/whypals-logo.png";
import { Mail, Lock, User, Eye, EyeOff, Loader2, Shield, ArrowLeft } from "lucide-react";
import LoginUnavailableNotice from "@/components/LoginUnavailableNotice";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [acknowledgedParent, setAcknowledgedParent] = useState(false);
  const [showTermsDialog, setShowTermsDialog] = useState(false);
  const { register, isRegistering, isAuthenticated } = useAuth();
  const { freeAccessEnabled } = useFreeAccessMode();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, navigate]);

  // The route/page itself stays live — this just swaps what renders at it
  // whenever the site-wide "free access" switch (set from /admin/banners) is on.
  if (freeAccessEnabled) {
    return <LoginUnavailableNotice />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Passwords don't match",
        description: "Please make sure your passwords match.",
      });
      return;
    }

    if (password.length < 8) {
      toast({
        variant: "destructive",
        title: "Password too short",
        description: "Password must be at least 8 characters long.",
      });
      return;
    }

    if (!agreedToTerms) {
      toast({
        variant: "destructive",
        title: "Terms Agreement Required",
        description: "Please agree to the Terms of Service and Privacy Policy to continue.",
      });
      return;
    }

    if (!acknowledgedParent) {
      toast({
        variant: "destructive",
        title: "Parent or guardian acknowledgement required",
        description: "Please confirm that this account is being created by a parent or legal guardian.",
      });
      return;
    }

    try {
      const result = await register({ email, parentEmail: email, password, confirmPassword, firstName, lastName, agreedToTerms });
      if (result.success) {
        toast({
          title: "Check your email",
          description: "We’ve emailed your parent or guardian to verify your account.",
        });
        navigate("/verify-parent");
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Registration failed",
        description: error.message || "Something went wrong. Please try again.",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background flex items-center justify-center p-4 relative">
      <div className="absolute top-4 left-4">
        <Link href="/">
          <Button variant="ghost" className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
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
          <h1 className="font-heading text-3xl font-bold text-primary">Join WhyPals!</h1>
          <p className="text-muted-foreground mt-2">Create your account to start learning</p>
        </div>

        <Card className="shadow-xl border-2 border-primary/10">
          <CardHeader>
            <CardTitle className="font-heading text-xl">Create Account</CardTitle>
            <CardDescription>
              A parent or legal guardian must create the account. Children should not enter their own email address.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="firstName"
                      type="text"
                      placeholder="First name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    type="text"
                    placeholder="Last name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Parent or Guardian Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="parent@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Re-enter your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {password && confirmPassword && password !== confirmPassword && (
                  <p className="text-sm text-destructive">Passwords don't match</p>
                )}
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex items-start gap-3 p-4 bg-muted/30 rounded-xl">
                  <Checkbox
                    id="terms"
                    checked={agreedToTerms}
                    onCheckedChange={(checked) => setAgreedToTerms(checked === true)}
                    className="mt-0.5"
                  />
                  <div className="text-sm">
                    <Label htmlFor="terms" className="cursor-pointer">
                      i agree to the{" "}
                      <Link href="/about?from=register" className="text-primary font-semibold hover:underline">
                        terms & conditions
                      </Link>
                      .
                    </Label>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-muted/20 rounded-xl">
                  <Checkbox
                    id="parentAcknowledgement"
                    checked={acknowledgedParent}
                    onCheckedChange={(checked) => setAcknowledgedParent(checked === true)}
                    className="mt-0.5"
                  />
                  <div className="text-sm">
                    <Label htmlFor="parentAcknowledgement" className="cursor-pointer">
                      I acknowledge that this account must be created by a parent or legal guardian.
                    </Label>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button
                type="submit"
                className="w-full gap-2"
                size="lg"
                disabled={isRegistering || !email || !password || !confirmPassword || password !== confirmPassword || !agreedToTerms || !acknowledgedParent}
              >
                {isRegistering ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  "Create Account"
                )}
              </Button>
              <p className="text-sm text-center text-muted-foreground">
                Already have an account?{" "}
                <Link href="/login" className="text-primary font-semibold hover:underline">
                  Log in
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </motion.div>

      <Dialog open={showTermsDialog} onOpenChange={setShowTermsDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Terms of Service & Privacy Policy
            </DialogTitle>
            <DialogDescription>Last updated: December 2024</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4 text-sm">
            <section>
              <h3 className="font-heading font-bold text-lg mb-2">Terms of Service</h3>
              <p className="text-muted-foreground mb-3">
                By creating an account on WhyPals, you agree to the following terms:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>You will use the platform for educational purposes only</li>
                <li>You will not share inappropriate content or engage in harmful behavior</li>
                <li>You understand that adults may monitor activity for safety purposes</li>
                <li>You will respect other users and their content</li>
                <li>If you are under 13, a parent or guardian must approve your account</li>
              </ul>
            </section>

            <section>
              <h3 className="font-heading font-bold text-lg mb-2">Privacy Policy</h3>
              <p className="text-muted-foreground mb-3">
                WhyPals is committed to protecting children's privacy:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>We collect minimal personal information (name, email)</li>
                <li>We track learning activities to provide personalized content</li>
                <li>We never sell or share personal data with third parties</li>
                <li>All content is reviewed for age-appropriateness</li>
                <li>No direct messaging between users is allowed</li>
                <li>Parents/guardians can request data deletion at any time</li>
              </ul>
            </section>

            <section>
              <h3 className="font-heading font-bold text-lg mb-2">Child Safety</h3>
              <p className="text-muted-foreground mb-3">
                We prioritize child safety through:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>COPPA compliance for users under 13</li>
                <li>Teacher verification before selling content</li>
                <li>Content moderation and review processes</li>
                <li>Secure data storage with encryption</li>
                <li>No advertising or marketing to children without consent</li>
              </ul>
            </section>

            <section>
              <h3 className="font-heading font-bold text-lg mb-2">Contact Us</h3>
              <p className="text-muted-foreground">
                Questions about these terms? Contact us at: <strong>support@newspals.com</strong>
              </p>
            </section>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setShowTermsDialog(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
