import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle, Shield, Users, Lock, Heart, Sparkles, Globe } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import FeatureCard from "@/components/FeatureCard";
import { SignedIn, SignedOut } from "@clerk/clerk-react";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      {/* Hero Section */}
      <section className="pt-32 pb-24 md:pt-40 md:pb-32 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 md:px-8 lg:px-12 relative z-10">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-20">
            <div className="flex-1 space-y-8 max-w-2xl">
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight animate-fade-in leading-tight">
                <span>Your Online Navigator </span>
                <span className="text-neema-primary">Shield</span>
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground max-w-xl animate-slide-up mt-6" style={{animationDelay: '0.2s'}}>
                Built for <span className="font-semibold text-neema-primary">women entrepreneurs and content creators</span> who deserve to work safely online.
              </p>
              
              <p className="text-lg text-gray-600 max-w-xl animate-slide-up" style={{animationDelay: '0.4s'}}>
                Neema protects you from harassment and privacy risks while helping you build your business with confidence.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-6 pt-6 animate-slide-up" style={{animationDelay: '0.6s'}}>
                <SignedOut>
                  <Button asChild size="lg" className="neema-button px-8 py-6 text-lg">
                    <Link to="/joinwaitlist">
                      Start for Free
                      <ArrowRight className="ml-3 h-5 w-5" />
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="border-neema-secondary text-neema-text hover:bg-neema-secondary/10 px-8 py-6 text-lg">
                    <Link to="/login">
                      Log in
                    </Link>
                  </Button>
                </SignedOut>
                <SignedIn>
                  <Button asChild size="lg" className="neema-button px-8 py-6 text-lg">
                    <Link to="/dashboard">
                      Go to Dashboard
                      <ArrowRight className="ml-3 h-5 w-5" />
                    </Link>
                  </Button>
                </SignedIn>
              </div>
              
              <div className="flex flex-col gap-4 animate-slide-up pt-4" style={{animationDelay: '0.8s'}}>
                <p className="text-sm text-muted-foreground uppercase tracking-wider font-medium">Protected integrations</p>
                <div className="flex flex-wrap gap-6">
                  <div className="flex items-center gap-2 text-sm">
                    <Shield className="h-5 w-5 text-neema-primary" />
                    <span className="font-medium">Safe Networking</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Lock className="h-5 w-5 text-neema-primary" />
                    <span className="font-medium">Encrypted Notes</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Heart className="h-5 w-5 text-neema-primary" />
                    <span className="font-medium">Community Support</span>
                  </div>
                  {/* <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-5 w-5 text-neema-primary" />
                    <span className="font-medium">LinkedIn</span>
                  </div> */}
                </div>
              </div>
            </div>
            
            <div className="flex-1 flex justify-center">
              <div className="relative w-full max-w-md animate-float">
                <img 
                  src="/images/neema_mascot.png" 
                  alt="Neema Logo" 
                  className="h-full w-full object-cover"
                />
                <div className="absolute -top-12 -left-12 w-32 h-32 bg-neema-primary rounded-full opacity-10 blur-xl z-0 animate-pulse"></div>
                <div className="absolute -bottom-12 -right-12 w-40 h-40 bg-neema-accent rounded-full opacity-10 blur-xl z-0 animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Abstract shapes */}
        <div className="absolute top-0 right-0 w-1/3 h-1/3 bg-neema-secondary/10 rounded-bl-full z-0"></div>
        <div className="absolute bottom-0 left-0 w-1/4 h-1/4 bg-neema-primary/5 rounded-tr-full z-0"></div>
      </section>
      
      {/* Features Section */}
      <section className="py-24 md:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-6 md:px-8 lg:px-12">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">SbD Features for Women Entrepreneurs</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Every feature is designed with your safety and empowerment in mind, so you can focus on building your business.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <FeatureCard 
              icon={<Shield className="h-10 w-10 text-neema-primary" />} 
              title="AI Safety Mentor" 
              description="Personalized safety guidance that learns your risk patterns and provides tailored protection recommendations."
            />
            <FeatureCard 
              icon={<Lock className="h-10 w-10 text-neema-primary" />} 
              title="Secure Comms" 
              description="End-to-end encrypted notes and messages with threat detection for safe communications."
            />
            <FeatureCard 
              icon={<Users className="h-10 w-10 text-neema-primary" />} 
              title="Safe Networking" 
              description="Verified connections and risk assessment for LinkedIn interactions with safe meeting recommendations."
            />
            <FeatureCard 
              icon={<Heart className="h-10 w-10 text-neema-primary" />} 
              title="Community Protection" 
              description="Anonymous threat intelligence sharing and local support organization integration for collective safety."
            />
          </div>
        </div>
      </section>
      
      {/* How It Works Section */}
      <section className="py-24 md:py-32 bg-neema-background">
        <div className="max-w-7xl mx-auto px-6 md:px-8 lg:px-12">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">How Neema Works</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Your AI companion  proactively protects you while helping you build your business with confidence.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="neema-card p-10 bg-white rounded-2xl shadow-sm border border-neema-secondary/10 hover:shadow-md transition-all duration-300">
              <div className="w-16 h-16 rounded-full bg-neema-secondary/30 flex items-center justify-center mb-8">
                <Shield className="h-8 w-8 text-neema-primary" />
              </div>
              <h3 className="text-2xl font-semibold mb-4">Assess Your Safety Profile</h3>
              <p className="text-muted-foreground text-lg">
                Complete a personalized safety assessment to understand your risk tolerance and protection needs.
              </p>
            </div>
            
            <div className="neema-card p-10 bg-white rounded-2xl shadow-sm border border-neema-secondary/10 hover:shadow-md transition-all duration-300">
              <div className="w-16 h-16 rounded-full bg-neema-secondary/30 flex items-center justify-center mb-8">
                <Sparkles className="h-8 w-8 text-neema-primary" />
              </div>
              <h3 className="text-2xl font-semibold mb-4">Customize Protection</h3>
              <p className="text-muted-foreground text-lg">
                Get real-time safety guidance, threat detection, and personalized recommendations for safe online interactions.
              </p>
            </div>
            
            <div className="neema-card p-10 bg-white rounded-2xl shadow-sm border border-neema-secondary/10 hover:shadow-md transition-all duration-300">
              <div className="w-16 h-16 rounded-full bg-neema-secondary/30 flex items-center justify-center mb-8">
                <Users className="h-8 w-8 text-neema-primary" />
              </div>
              <h3 className="text-2xl font-semibold mb-4">Community & Support</h3>
              <p className="text-muted-foreground text-lg">
                Connect with local support organizations and benefit from collective safety intelligence while maintaining privacy.
              </p>
            </div>
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-24 md:py-32 bg-gradient-to-r from-neema-primary to-neema-primary/80">
        <div className="max-w-7xl mx-auto px-6 md:px-8 lg:px-12 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-8 text-white leading-tight">Ready to Work Safely Online?</h2>
          <p className="text-xl text-white/90 max-w-3xl mx-auto mb-12">
            Join women entrepreneurs and content creators in Kenya who are building their businesses with confidence, knowing they're protected by AI-powered safety features.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <SignedOut>
              <Button asChild size="lg" className="bg-white text-neema-primary hover:bg-white/90 px-10 py-7 text-lg font-medium">
                <Link to="/joinwaitlist">
                  Start for Free
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white text-white hover:bg-white/10 px-10 py-7 text-lg font-medium">
                <Link to="/login">
                  Log in
                </Link>
              </Button>
            </SignedOut>
            <SignedIn>
              <Button asChild size="lg" className="bg-white text-neema-primary hover:bg-white/90 px-10 py-7 text-lg font-medium">
                <Link to="/dashboard">
                  Go to Dashboard
                </Link>
              </Button>
            </SignedIn>
          </div>
        </div>
      </section>
      
      <Footer />
    </div>
  );
};

export default Index;
