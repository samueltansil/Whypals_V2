import { Switch, Route, useLocation } from "wouter";
import { Helmet } from "@/lib/helmet";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Games from "@/pages/games";
import Videos from "@/pages/videos";
import Teachers from "@/pages/teachers";
import Settings from "@/pages/settings";
import Story from "@/pages/story";
import VideoPlayer from "@/pages/video-player";
import R2VideoPlayer from "@/pages/r2-video-player";
import GamePreview from "@/pages/game-preview";
import AdminStories from "@/pages/admin-stories";
import AdminVideos from "@/pages/admin-videos";
import AdminGames from "@/pages/admin-games";
import AdminBanners from "@/pages/admin-banners";
import AdminQuestions from "@/pages/admin-questions";
import BigWhyPage from "@/pages/big-why";
import TeacherDashboard from "@/pages/teacher-dashboard";
import AdminTeachers from "@/pages/admin-teachers";
import VerifyTeacher from "@/pages/verify-teacher";
import Marketplace from "@/pages/marketplace";
import CourseworkDetail from "@/pages/coursework-detail";
import TeacherProfile from "@/pages/teacher-profile";
import Leaderboard from "@/pages/leaderboard";
import VerifyParent from "@/pages/verify-parent";
import Register from "@/pages/register";
import Login from "@/pages/login";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
import About from "@/pages/about";
import Terms from "@/pages/terms";
import Contact from "@/pages/contact";
import { useAuth } from "@/hooks/useAuth";
import { CanonicalTag } from "@/components/canonical-tag";

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground font-heading">Loading WhyPals...</p>
      </div>
    </div>
  );
}

function Router() {
  const { isAuthenticated, isLoading } = useAuth();
  const [location] = useLocation();
  const isAdminRoute = location.startsWith('/admin');
  
  // Show loading screen only if it's NOT an admin route and we are loading auth
  if (isLoading && !isAdminRoute) {
    return (
      <Switch>
        <Route path="/register" component={Register} />
        <Route path="/login" component={Login} />
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route path="/reset-password" component={ResetPassword} />
        <Route path="/verify-parent" component={VerifyParent} />
        <Route component={LoadingScreen} />
      </Switch>
    );
  }

  return (
    <ErrorBoundary>
      <Switch>
        {/* Admin Routes - Priority */}
        <Route path="/admin/stories" component={AdminStories} />
        <Route path="/admin/videos" component={AdminVideos} />
        <Route path="/admin/games" component={AdminGames} />
        <Route path="/admin/banners" component={AdminBanners} />

        {/* Auth Routes */}
        <Route path="/register" component={Register} />
        <Route path="/login" component={Login} />
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route path="/reset-password" component={ResetPassword} />
        <Route path="/verify-parent" component={VerifyParent} />

        {/* Public Routes */}
        <Route path="/" component={Home} />
        <Route path="/about" component={About} />
        <Route path="/terms" component={Terms} />
        <Route path="/contact" component={Contact} />
        <Route path="/admin/stories" component={AdminStories} />
        <Route path="/admin/videos" component={AdminVideos} />
        <Route path="/admin/games" component={AdminGames} />
        <Route path="/admin/teachers" component={AdminTeachers} />
        <Route path="/admin/banners" component={AdminBanners} />
        <Route path="/admin/questions" component={AdminQuestions} />

        {/* Auth Routes */}
        <Route path="/register" component={Register} />
        <Route path="/login" component={Login} />
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route path="/reset-password" component={ResetPassword} />
        <Route path="/verify-parent" component={VerifyParent} />

        {/* Public Routes */}
        <Route path="/" component={Home} />
        <Route path="/about" component={About} />
        <Route path="/terms" component={Terms} />
        <Route path="/contact" component={Contact} />
        <Route path="/games" component={Games} />
        <Route path="/game/:id" component={GamePreview} />
        <Route path="/videos" component={Videos} />
        <Route path="/video/:id" component={VideoPlayer} />
        <Route path="/story/:id" component={Story} />
        <Route path="/big-why" component={BigWhyPage} />

        {/* Protected Routes - Only match if authenticated */}
        {isAuthenticated ? <Route path="/r2-video/:key" component={R2VideoPlayer} /> : null}
        {isAuthenticated ? <Route path="/teachers" component={Teachers} /> : null}
        {isAuthenticated ? <Route path="/teacher-dashboard" component={TeacherDashboard} /> : null}
        {isAuthenticated ? <Route path="/marketplace" component={Marketplace} /> : null}
        {isAuthenticated ? <Route path="/marketplace/:id" component={CourseworkDetail} /> : null}
        {isAuthenticated ? <Route path="/teacher/:id" component={TeacherProfile} /> : null}
        {isAuthenticated ? <Route path="/leaderboard" component={Leaderboard} /> : null}
        {isAuthenticated ? <Route path="/verify-teacher" component={VerifyTeacher} /> : null}
        {isAuthenticated ? <Route path="/settings" component={Settings} /> : null}

        {/* Fallback */}
        <Route component={isAuthenticated ? NotFound : Home} />
      </Switch>
    </ErrorBoundary>
  );
}

function App() {
  // console.log('[SSR] App rendering');
  
  return (
    <TooltipProvider>
      <CanonicalTag />
      <Helmet>
        <title>WhyPals - Listen to News for Kids</title>
      </Helmet>
      <Toaster />
      <Router />
    </TooltipProvider>
  );
}



export default App;
