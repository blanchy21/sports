import React from "react";
import { Zap, Shield, Users } from "lucide-react";

export const AuthHero: React.FC = () => (
  <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary to-secondary text-primary-foreground p-12 flex-col justify-center">
    <div className="max-w-md">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4">Welcome to Sportsblock</h1>
        <p className="text-xl text-primary-foreground/80">
          Your escape to pure sports content - earn crypto rewards for your insights
        </p>
      </div>

      <div className="space-y-6">
        <Benefit
          icon={<Zap className="h-6 w-6" />}
          title="Earn Crypto Rewards"
          description="Get paid for quality sports content and engagement"
        />
        <Benefit
          icon={<Shield className="h-6 w-6" />}
          title="Decentralized & Secure"
          description="Built on Hive blockchain - no middleman, no censorship"
        />
        <Benefit
          icon={<Users className="h-6 w-6" />}
          title="Community Driven"
          description="Connect with sports fans and content creators worldwide"
        />
      </div>
    </div>
  </div>
);

interface BenefitProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const Benefit: React.FC<BenefitProps> = ({ icon, title, description }) => (
  <div className="flex items-start space-x-4">
    <div className="w-12 h-12 bg-primary-foreground/20 rounded-lg flex items-center justify-center flex-shrink-0">
      {icon}
    </div>
    <div>
      <h3 className="font-semibold text-lg mb-1">{title}</h3>
      <p className="text-primary-foreground/80">{description}</p>
    </div>
  </div>
);

export default AuthHero;

