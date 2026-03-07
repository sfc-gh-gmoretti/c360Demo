"use client";

import { useState, useEffect, useRef } from "react";

interface TypingTextProps {
  text: string;
  speed?: number;
  onComplete?: () => void;
  className?: string;
  skipAnimation?: boolean;
}

export function TypingText({
  text,
  speed = 15,
  onComplete,
  className = "",
  skipAnimation = false,
}: TypingTextProps) {
  const [displayedText, setDisplayedText] = useState(skipAnimation ? text : "");
  const [isTyping, setIsTyping] = useState(!skipAnimation);
  const indexRef = useRef(0);

  useEffect(() => {
    if (skipAnimation) {
      setDisplayedText(text);
      setIsTyping(false);
      return;
    }

    indexRef.current = 0;
    setDisplayedText("");
    setIsTyping(true);

    const interval = setInterval(() => {
      if (indexRef.current < text.length) {
        const charsToAdd = Math.min(3, text.length - indexRef.current);
        indexRef.current += charsToAdd;
        setDisplayedText(text.slice(0, indexRef.current));
      } else {
        clearInterval(interval);
        setIsTyping(false);
        onComplete?.();
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed, skipAnimation, onComplete]);

  return (
    <span className={className}>
      {displayedText}
      {isTyping && (
        <span className="inline-block w-0.5 h-4 bg-primary ml-0.5 animate-pulse" />
      )}
    </span>
  );
}
