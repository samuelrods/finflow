import React from "react";
import * as Icons from "lucide-react";
import { LucideProps } from "lucide-react";

export const ICON_MAP: Record<string, keyof typeof Icons> = {
  // Map common emojis to Lucide icons for backward compatibility
  "💰": "Banknote",
  "💵": "Banknote",
  "🍔": "Utensils",
  "☕": "Coffee",
  "🚗": "Car",
  "🚌": "Bus",
  "🏠": "Home",
  "🏢": "Building",
  "⚡": "Zap",
  "🌐": "Globe",
  "🎉": "PartyPopper",
  "🏥": "Hospital",
  "📚": "BookText",
  "🛍️": "ShoppingBag",
  "🛒": "ShoppingCart",
  "🔄": "Repeat",
  // Direct names
  "Banknote": "Banknote",
  "Utensils": "Utensils",
  "Coffee": "Coffee",
  "Car": "Car",
  "Bus": "Bus",
  "Home": "Home",
  "Building": "Building",
  "Zap": "Zap",
  "Globe": "Globe",
  "PartyPopper": "PartyPopper",
  "Hospital": "Hospital",
  "BookText": "BookText",
  "ShoppingBag": "ShoppingBag",
  "ShoppingCart": "ShoppingCart",
  "Repeat": "Repeat",
  "Plane": "Plane",
  "Gamepad2": "Gamepad2",
  "Pill": "Pill",
  "Shirt": "Shirt",
  "Gift": "Gift",
  "Dumbbell": "Dumbbell",
  "Music": "Music",
  "PawPrint": "PawPrint",
  "Lightbulb": "Lightbulb",
  "Wrench": "Wrench",
  "Smartphone": "Smartphone",
  "Leaf": "Leaf",
  "GraduationCap": "GraduationCap",
  "Briefcase": "Briefcase",
  "Waves": "Waves",
  "Palette": "Palette",
};

interface CategoryIconProps extends Omit<LucideProps, "name"> {
  name: string | null | undefined;
  fallback?: string;
}

export function CategoryIcon({ name, fallback = "📁", ...props }: CategoryIconProps) {
  if (!name) return <span>{fallback}</span>;

  const iconName = ICON_MAP[name];
  
  if (!iconName) {
    // If it's an emoji not in our map, just render it as text
    return <span className="text-xl">{name}</span>;
  }

  const IconComponent = Icons[iconName] as React.ElementType;
  
  if (!IconComponent) {
    return <span>{fallback}</span>;
  }

  return <IconComponent {...props} />;
}
