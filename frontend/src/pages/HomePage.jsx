import { useChatStore } from "../store/useChatStore";

import Sidebar from "../components/Sidebar";
import NoChatSelected from "../components/NoChatSelected";
import ChatContainer from "../components/ChatContainer";

const HomePage = () => {
  const { selectedUser } = useChatStore();

  return (
    <div
      className={`h-[100dvh] max-h-[100dvh] bg-base-200/50 flex flex-col items-center justify-start relative overflow-hidden ${
        selectedUser
          ? "pt-0 sm:pt-20 pb-0 sm:pb-4 px-0 sm:px-4 md:px-6"
          : "pt-16 sm:pt-20 pb-0 sm:pb-4 px-0 sm:px-4 md:px-6"
      }`}
    >
      {/* Background ambient light blobs */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 size-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 size-96 bg-secondary/10 rounded-full blur-3xl pointer-events-none" />

      <div
        className={`w-full max-w-6xl relative z-10 flex-1 flex flex-col min-h-0 ${
          selectedUser
            ? "h-[100dvh] sm:h-[calc(100dvh-6rem)]"
            : "h-[calc(100dvh-4rem)] sm:h-[calc(100dvh-6rem)]"
        }`}
      >
        <div className="bg-base-100/80 backdrop-blur-2xl rounded-none sm:rounded-3xl shadow-2xl border-0 sm:border border-base-300/70 h-full overflow-hidden flex w-full flex-1 min-h-0">
          <Sidebar />

          {!selectedUser ? <NoChatSelected /> : <ChatContainer />}
        </div>
      </div>
    </div>
  );
};
export default HomePage;
