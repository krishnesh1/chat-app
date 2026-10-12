import { useChatStore } from "../store/useChatStore";

import Sidebar from "../components/Sidebar";
import NoChatSelected from "../components/NoChatSelected";
import ChatContainer from "../components/ChatContainer";

const HomePage = () => {
  const { selectedUser } = useChatStore();

  return (
    <div className="min-h-screen bg-base-200/50 pt-20 pb-4 px-2 sm:px-6 flex items-center justify-center relative overflow-hidden">
      {/* Background ambient light blobs */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 size-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 size-96 bg-secondary/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-6xl h-[calc(100vh-6rem)] sm:h-[calc(100vh-7rem)] relative z-10">
        <div className="bg-base-100/80 backdrop-blur-2xl rounded-2xl sm:rounded-3xl shadow-2xl border border-base-300/70 h-full overflow-hidden flex">
          <Sidebar />

          {!selectedUser ? <NoChatSelected /> : <ChatContainer />}
        </div>
      </div>
    </div>
  );
};
export default HomePage;
