import { MessageSquare, Sparkles, Image, ShieldCheck, Share2 } from "lucide-react";

const NoChatSelected = () => {
  return (
    <div className="hidden sm:flex w-full flex-1 flex-col items-center justify-center p-8 sm:p-16 bg-base-100/40 relative">
      <div className="max-w-md text-center space-y-6">
        {/* Animated Icon Display */}
        <div className="flex justify-center mb-2">
          <div className="relative">
            <div className="size-20 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-lg shadow-primary/10 animate-pulse">
              <MessageSquare className="size-10 text-primary" />
            </div>
            <div className="absolute -top-1 -right-1 size-6 rounded-full bg-secondary/20 flex items-center justify-center">
              <Sparkles className="size-3.5 text-secondary animate-spin [animation-duration:6s]" />
            </div>
          </div>
        </div>

        {/* Welcome Text */}
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Welcome to <span className="text-primary">Chatt-App</span>
          </h2>
          <p className="text-sm sm:text-base text-base-content/60 mt-2">
            Select a contact from the sidebar or start a new conversation.
          </p>
        </div>

        {/* Feature Highlights Pills */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-4 text-xs text-base-content/70">
          <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-base-200/50 border border-base-300/50">
            <Image className="size-4 text-primary" />
            <span className="font-semibold text-base-content/90">Ultra HQ Photos</span>
            <span className="text-[10px] text-base-content/50">iPhone & RAW ready</span>
          </div>
          <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-base-200/50 border border-base-300/50">
            <Share2 className="size-4 text-secondary" />
            <span className="font-semibold text-base-content/90">Easy Forward</span>
            <span className="text-[10px] text-base-content/50">1-click sharing</span>
          </div>
          <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-base-200/50 border border-base-300/50">
            <ShieldCheck className="size-4 text-emerald-500" />
            <span className="font-semibold text-base-content/90">Direct Save</span>
            <span className="text-[10px] text-base-content/50">Save to your device</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NoChatSelected;
