"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

// Create Context
const TabsContext = React.createContext<{
    value: string;
    onValueChange: (value: string) => void;
} | null>(null);

// Root Component
const Tabs = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement> & { defaultValue?: string; value?: string; onValueChange?: (value: string) => void }
>(({ className, defaultValue, value, onValueChange, children, ...props }, ref) => {
    // Uncontrolled state if value is not provided
    const [internalValue, setInternalValue] = React.useState(defaultValue || "");

    const isControlled = value !== undefined;
    const currentValue = isControlled ? value : internalValue;

    const handleValueChange = React.useCallback((newValue: string) => {
        if (!isControlled) {
            setInternalValue(newValue);
        }
        onValueChange?.(newValue);
    }, [isControlled, onValueChange]);

    return (
        <TabsContext.Provider value={{ value: currentValue, onValueChange: handleValueChange }}>
            <div ref={ref} className={cn("", className)} {...props}>
                {children}
            </div>
        </TabsContext.Provider>
    );
});
Tabs.displayName = "Tabs"

// List Component
const TabsList = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn(
            "inline-flex h-10 items-center justify-center rounded-md bg-neutral-900/50 border border-neutral-800 p-1 text-muted-foreground",
            className
        )}
        {...props}
    />
))
TabsList.displayName = "TabsList"

// Trigger Component
const TabsTrigger = React.forwardRef<
    HTMLButtonElement,
    React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string }
>(({ className, value, ...props }, ref) => {
    const context = React.useContext(TabsContext);
    const isSelected = context?.value === value;

    return (
        <button
            ref={ref}
            type="button"
            role="tab"
            aria-selected={isSelected}
            onClick={() => context?.onValueChange(value)}
            className={cn(
                "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                isSelected ? "bg-indigo-600 text-white shadow-sm" : "hover:bg-neutral-800 hover:text-neutral-200",
                className
            )}
            {...props}
        />
    );
})
TabsTrigger.displayName = "TabsTrigger"

// Content Component
const TabsContent = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement> & { value: string }
>(({ className, value, ...props }, ref) => {
    const context = React.useContext(TabsContext);
    if (context?.value !== value) return null;

    return (
        <div
            ref={ref}
            role="tabpanel"
            className={cn(
                "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 animate-in fade-in zoom-in-95 duration-200",
                className
            )}
            {...props}
        />
    )
})
TabsContent.displayName = "TabsContent"

export { Tabs, TabsList, TabsTrigger, TabsContent }
