import React, { useEffect, useRef, useState, useId } from 'react';
import { Animated, AccessibilityInfo, Easing } from 'react-native';
import Svg, { Defs, RadialGradient, LinearGradient, Stop, ClipPath, Circle, G, Polygon, Path } from 'react-native-svg';
import { brand } from '../theme';

const AnimatedG = Animated.createAnimatedComponent(G);

export default function BrandMark({ size = 100, variant = 'icon', animated = false }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  
  const sunId = `sun-${uid}`;
  const haloId = `halo-${uid}`;
  const skyId = `sky-${uid}`;
  const fieldId = `field-${uid}`;
  const discId = `disc-${uid}`;

  const spinValue = useRef(new Animated.Value(0)).current;
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

  useEffect(() => {
    if (animated && !reduceMotion) {
      Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 25000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    } else {
      spinValue.stopAnimation();
      spinValue.setValue(0);
    }
  }, [animated, reduceMotion]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  const isMono = variant === 'mono';
  
  const rays = [0, 45, 90, 135, 180, 225, 270, 315].map(angle => (
    <Polygon
      key={angle}
      points="100,4 108,48 92,48"
      fill={isMono ? "#FFFFFF" : brand.haldi}
      rotation={angle}
      origin="100, 76"
    />
  ));

  // The Animated transform needs to rotate around the sun's center (100, 76).
  // RN's transform origin can be tricky, so we translate to center, rotate, and translate back.
  // Wait, for RN SVG, AnimatedG supports `origin="100, 76"`. But `transform={[{ rotate: spin }]}` on a standard RN view differs.
  // We can just use standard view transform + origin since react-native-svg handles origin on elements? No, AnimatedG maps to the G element.
  // G element doesn't take 'origin' natively, but react-native-svg supports it.
  
  return (
    <Svg viewBox="0 0 200 200" width={size} height={size} role="img" aria-label="Surya Kshetra icon">
      <Defs>
        {!isMono && (
          <>
            <RadialGradient id={sunId} cx="42%" cy="34%">
              <Stop offset="0%" stopColor="#FFE0A0"/>
              <Stop offset="50%" stopColor={brand.haldi}/>
              <Stop offset="100%" stopColor="#BE7A20"/>
            </RadialGradient>
            
            <RadialGradient id={haloId} cx="50%" cy="50%">
              <Stop offset="0%"  stopColor={brand.haldi} stopOpacity=".42"/>
              <Stop offset="55%" stopColor={brand.haldi} stopOpacity=".16"/>
              <Stop offset="100%" stopColor={brand.haldi} stopOpacity="0"/>
            </RadialGradient>
            
            <LinearGradient id={skyId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#26395F"/>
              <Stop offset="100%" stopColor={brand.neelDeep}/>
            </LinearGradient>
            
            <LinearGradient id={fieldId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#4FB47A"/>
              <Stop offset="100%" stopColor="#1C5133"/>
            </LinearGradient>
          </>
        )}
        <ClipPath id={discId}>
          <Circle cx="100" cy="100" r="94"/>
        </ClipPath>
      </Defs>

      {!isMono && <Circle cx="100" cy="100" r="94" fill={`url(#${skyId})`}/>}
      
      <G clipPath={`url(#${discId})`}>
        {!isMono && <Circle cx="100" cy="76" r="86" fill={`url(#${haloId})`}/>}
        
        {animated && !reduceMotion ? (
          <AnimatedG origin="100, 76" style={{ transform: [{ rotate: spin }] }}>
            {rays}
          </AnimatedG>
        ) : (
          <G>{rays}</G>
        )}
        
        <Circle cx="100" cy="76" r="37" fill={isMono ? "#FFFFFF" : `url(#${sunId})`}/>
        
        <Path d="M-10 210 Q 100 96 210 210 Z" fill={isMono ? "#FFFFFF" : `url(#${fieldId})`}/>
        {!isMono && (
          <Path d="M-10 210 Q 100 96 210 210" stroke="#8FE0B0" strokeWidth="3" fill="none" opacity=".55"/>
        )}
      </G>
    </Svg>
  );
}
