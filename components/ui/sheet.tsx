"use client";
import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Sheet = DialogPrimitive.Root;

export function SheetContent({ className, children, ...props }: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="animate-overlay-in fixed inset-0 z-30 bg-black/35" />
      <DialogPrimitive.Content
        className={cn(
          "animate-sheet-in fixed inset-y-0 right-0 z-40 w-[420px] max-w-[92vw] overflow-y-auto border-l border-zinc-200 bg-white p-6 shadow-2xl focus:outline-none",
          className
        )}
        {...props}
      >
        <DialogPrimitive.Close className="absolute right-5 top-5 text-2xl leading-none text-zinc-400 hover:text-zinc-600">
          <X size={20} />
        </DialogPrimitive.Close>
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export const SheetTitle = DialogPrimitive.Title;
export const SheetDescription = DialogPrimitive.Description;
