'use client';

import React, { useState } from 'react';
import { useInView } from 'framer-motion';
import CountUp from 'react-countup';
import LandingShowcase from './LandingShowcase';
import LandingEarnings from './LandingEarnings';
import LandingMedals from './LandingMedals';
import LandingCommunity from './LandingCommunity';
import LandingCTA from './LandingCTA';

// Unsplash sports images
const sports = [
  {
    name: 'Football',
    image: '/jason-charters-IorqsMssQH0-unsplash.jpg',
    color: 'from-[#3D9B70]/85 to-[#1C5940]/90',
  },
  {
    name: 'Basketball',
    image: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&q=80',
    color: 'from-[#D47838]/85 to-[#7F4822]/90',
  },
  {
    name: 'Tennis',
    image: '/james-lewis-HqdJzlF89_g-unsplash.jpg',
    color: 'from-[#6B9E3C]/85 to-[#3F5D24]/90',
  },
  {
    name: 'American Football',
    image: 'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=800&q=80',
    color: 'from-[#A67A30]/85 to-[#62491D]/90',
  },
  {
    name: 'Cricket',
    image: '/yogendra-singh-DKcN3Lyuuro-unsplash.jpg',
    color: 'from-[#3880B8]/85 to-[#214B6C]/90',
  },
  {
    name: 'Boxing',
    image: 'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=800&q=80',
    color: 'from-[#AD3939]/85 to-[#602020]/90',
  },
  {
    name: 'Rugby',
    image: '/stefan-lehner-fqrzserMsX4-unsplash.jpg',
    color: 'from-[#3A8F8F]/85 to-[#225454]/90',
  },
  {
    name: 'Golf',
    image: '/marcus-santos-A37jWpUFdlo-unsplash.jpg',
    color: 'from-[#358F54]/85 to-[#1F5431]/90',
  },
];

export const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

export const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
};

export function AnimatedCounter({
  end,
  prefix = '',
  suffix = '',
  decimals = 0,
  duration = 2,
}: {
  end: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  duration?: number;
}) {
  const [started, setStarted] = useState(false);
  const ref = React.useRef(null);
  const inView = useInView(ref, { once: true, margin: '-50px' });

  React.useEffect(() => {
    if (inView) setStarted(true);
  }, [inView]);

  return (
    <span ref={ref}>
      {started ? (
        <CountUp
          start={0}
          end={end}
          prefix={prefix}
          suffix={suffix}
          decimals={decimals}
          duration={duration}
          separator=","
        />
      ) : (
        `${prefix}0${suffix}`
      )}
    </span>
  );
}

export default function LandingSections() {
  return (
    <>
      <LandingShowcase />
      <LandingEarnings />
      <LandingMedals />
      <LandingCommunity sports={sports} />
      <LandingCTA />
    </>
  );
}
