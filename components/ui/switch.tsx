"use client";
import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";

export const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitive.Root
    ref={ref}
    className={cn(
      "relative inline-flex h-[21px] w-[38px] shrink-0 cursor-pointer rounded-full bg-zinc-200 transition-colors data-[state=checked]:bg-accent",
      className
    )}
    {...props}
  >
    <SwitchPrimitive.Thumb className="block h-[17px] w-[17px] translate-x-0.5 rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-[19px]" />
  </SwitchPrimitive.Root>
));
Switch.displayName = "Switch";
