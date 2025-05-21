import { PropsWithChildren, useEffect, useRef } from "react";
import { Animated, ViewStyle } from "react-native";

interface DropUpViewProps extends PropsWithChildren {
  style?: ViewStyle | ViewStyle[];
  duration?: number; // Optional: duration of the animation
  startFromOffset?: number; // Optional: how far below the screen to start (e.g., 100 for 100px below)
}

interface FadeInViewProps extends PropsWithChildren {
  style?: ViewStyle | ViewStyle[]; // Allow single style object or array of styles
}


export const FadeInView: React.FC<FadeInViewProps> = ({ style, children }) => {
  // 3. Type useRef to hold an Animated.Value
  //    The 'current' property of the ref will directly be the Animated.Value
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(
      fadeAnim,
      {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }
    ).start();
  }, [fadeAnim]); // Dependency array: fadeAnim is stable because it's from useRef().current

  return (
    // 4. Ensure style prop is spread correctly and Animated.Value is applied to opacity
    <Animated.View
      style={[
        style, // Pass the incoming style prop (can be an array or single object)
        { opacity: fadeAnim } // Apply the animated opacity
      ]}
    >
      {children}
    </Animated.View>
  );
};

export const DropUpView: React.FC<DropUpViewProps> = ({
  style,
  children,
  duration = 200, // Default duration
  startFromOffset = 10, // Default start 50px below its final position
}) => {
  // Animated.Value for both translateY and opacity
  const translateYAnim = useRef(new Animated.Value(startFromOffset)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Run animations in parallel
    Animated.parallel([
      Animated.timing(
        translateYAnim,
        {
          toValue: 0, // Animate to 0 (its natural position)
          duration: duration,
          useNativeDriver: true, // For performance, especially for transform
        }
      ),
      Animated.timing(
        opacityAnim,
        {
          toValue: 1, // Animate opacity to fully visible
          duration: duration,
          useNativeDriver: true, // For performance
        }
      ),
    ]).start();
  }, [translateYAnim, opacityAnim, duration]); // Dependencies for useEffect

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: opacityAnim,
          transform: [{ translateY: translateYAnim }], // Apply translateY animation
        },
      ]}
    >
      {children}
    </Animated.View>
  );
};
