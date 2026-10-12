import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { gsap } from "gsap";
import {
  MessageSquare,
  Zap,
  Shield,
  Palette,
  Image as ImageIcon,
  Users,
  Radio,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Lock,
  Globe,
  Send,
  Flame,
  ChevronRight,
} from "lucide-react";

const LandingPage = () => {
  const heroRef = useRef(null);
  const badgeRef = useRef(null);
  const titleRef = useRef(null);
  const subtitleRef = useRef(null);
  const ctaGroupRef = useRef(null);
  const statsRef = useRef(null);
  const card3dRef = useRef(null);
  const canvasRef = useRef(null);
  const featuresRef = useRef(null);

  // Mini live demo chat state
  const [demoInput, setDemoInput] = useState("");
  const [demoMessages, setDemoMessages] = useState([
    { id: 1, sender: "Samir", text: "Hey! Did you check out the new chat app?", isMe: false, time: "12:00 PM" },
    { id: 2, sender: "You", text: "Yes! The 3D UI and WebSocket speed are unbelievable 🔥", isMe: true, time: "12:01 PM" },
    { id: 3, sender: "Samir", text: "Images upload instantly now too with auto-conversion!", isMe: false, time: "12:01 PM" },
  ]);
  const [isDemoTyping, setIsDemoTyping] = useState(false);

  // 1. 3D Particle Canvas Animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animationFrameId;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    const particles = [];
    const particleCount = Math.min(65, Math.floor(window.innerWidth / 20));

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        z: Math.random() * 2 + 0.5,
        radius: Math.random() * 2 + 1,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        color: i % 3 === 0 ? "rgba(99, 102, 241, " : i % 3 === 1 ? "rgba(168, 85, 247, " : "rgba(236, 72, 153, ",
      });
    }

    let mouseX = width / 2;
    let mouseY = height / 2;

    const onMouseMove = (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };
    window.addEventListener("mousemove", onMouseMove);

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw faint connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 130) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(147, 51, 234, ${0.15 * (1 - dist / 130)})`;
            ctx.lineWidth = 0.6;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      // Draw and update particles
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;

        // Subtle mouse repulsion / attraction
        const dx = mouseX - p.x;
        const dy = mouseY - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 180) {
          p.x -= (dx / dist) * 0.6;
          p.y -= (dy / dist) * 0.6;
        }

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * p.z, 0, Math.PI * 2);
        ctx.fillStyle = p.color + "0.65)";
        ctx.shadowBlur = 10;
        ctx.shadowColor = "rgba(168, 85, 247, 0.5)";
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", onMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // 2. GSAP Entrance Timeline & Floating Loop
  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      tl.from(badgeRef.current, {
        y: -30,
        opacity: 0,
        duration: 0.8,
      })
        .from(
          titleRef.current,
          {
            y: 40,
            opacity: 0,
            duration: 1,
          },
          "-=0.5"
        )
        .from(
          subtitleRef.current,
          {
            y: 25,
            opacity: 0,
            duration: 0.8,
          },
          "-=0.6"
        )
        .from(
          ctaGroupRef.current,
          {
            y: 20,
            opacity: 0,
            duration: 0.8,
          },
          "-=0.5"
        )
        .from(
          statsRef.current,
          {
            y: 20,
            opacity: 0,
            duration: 0.8,
          },
          "-=0.5"
        )
        .from(
          card3dRef.current,
          {
            scale: 0.85,
            rotationY: 25,
            rotationX: -15,
            opacity: 0,
            duration: 1.2,
            ease: "elastic.out(1, 0.75)",
          },
          "-=0.9"
        );

      // Continuous gentle 3D hover float
      gsap.to(card3dRef.current, {
        y: "-=14",
        rotationZ: "+=1",
        duration: 3,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
    }, heroRef);

    return () => ctx.revert();
  }, []);

  // 3. Interactive Mouse 3D Parallax Tilt on Hero Card
  const handleCardMouseMove = (e) => {
    const card = card3dRef.current;
    if (!card) return;

    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;

    const rotateX = -(y / (rect.height / 2)) * 14;
    const rotateY = (x / (rect.width / 2)) * 14;

    gsap.to(card, {
      rotateX,
      rotateY,
      duration: 0.4,
      ease: "power2.out",
      transformPerspective: 1000,
    });
  };

  const handleCardMouseLeave = () => {
    const card = card3dRef.current;
    if (!card) return;

    gsap.to(card, {
      rotateX: 0,
      rotateY: 0,
      duration: 0.8,
      ease: "elastic.out(1, 0.5)",
    });
  };

  // Demo interactive message sending
  const handleSendDemoMessage = (e) => {
    e.preventDefault();
    if (!demoInput.trim()) return;

    const newMsg = {
      id: Date.now(),
      sender: "You",
      text: demoInput.trim(),
      isMe: true,
      time: "Just now",
    };

    setDemoMessages((prev) => [...prev, newMsg]);
    setDemoInput("");
    setIsDemoTyping(true);

    setTimeout(() => {
      setIsDemoTyping(false);
      setDemoMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: "Samir",
          text: "Awesome! With Socket.IO, this happens in sub-milliseconds across Vercel & Render ⚡",
          isMe: false,
          time: "Just now",
        },
      ]);
    }, 1200);
  };

  return (
    <div ref={heroRef} className="relative min-w-full min-h-screen bg-base-100 overflow-x-hidden text-base-content select-none">
      {/* Background Interactive 3D Particle Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-0 opacity-70" />

      {/* Radiant Gradient Ambient Blobs */}
      <div className="absolute top-[-150px] left-1/2 -translate-x-1/2 w-[650px] h-[650px] bg-primary/20 rounded-full blur-[140px] pointer-events-none -z-10 animate-pulse" />
      <div className="absolute top-[35%] -left-[100px] w-[500px] h-[500px] bg-secondary/15 rounded-full blur-[140px] pointer-events-none -z-10" />
      <div className="absolute top-[60%] -right-[100px] w-[550px] h-[550px] bg-accent/15 rounded-full blur-[140px] pointer-events-none -z-10" />

      {/* ===================== HERO SECTION ===================== */}
      <section className="relative z-10 pt-28 pb-20 px-4 max-w-7xl mx-auto flex flex-col items-center text-center">
        {/* Pill Badge */}
        <div
          ref={badgeRef}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-base-200/80 border border-primary/30 backdrop-blur-md shadow-lg shadow-primary/5 hover:border-primary/60 transition-all cursor-pointer mb-6"
        >
          <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
          <span className="text-xs font-semibold tracking-wide uppercase bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Next-Gen Realtime Communication
          </span>
          <Sparkles className="size-3.5 text-primary" />
        </div>

        {/* Main Headline */}
        <h1
          ref={titleRef}
          className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight max-w-5xl leading-[1.1] mb-6"
        >
          Connect in Realtime. <br />
          <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
            Across Every Dimension.
          </span>
        </h1>

        {/* Subtitle */}
        <p
          ref={subtitleRef}
          className="text-base sm:text-xl text-base-content/70 max-w-2xl leading-relaxed mb-10"
        >
          Experience lightning-fast instant messaging with full-duplex WebSockets, rich media sharing, live typing intelligence, and adaptive themes. Built for true speed.
        </p>

        {/* Action Buttons */}
        <div ref={ctaGroupRef} className="flex flex-col sm:flex-row items-center gap-4 mb-14 w-full sm:w-auto">
          <Link
            to="/signup"
            className="btn btn-primary btn-lg px-8 rounded-2xl shadow-xl shadow-primary/25 hover:shadow-primary/40 hover:scale-105 transition-all duration-300 w-full sm:w-auto group gap-3 text-base font-bold"
          >
            Start Chatting Free
            <ArrowRight className="size-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            to="/login"
            className="btn btn-outline btn-lg px-8 rounded-2xl hover:scale-105 transition-all duration-300 w-full sm:w-auto text-base"
          >
            Sign In to Account
          </Link>
        </div>

        {/* Realtime Performance Metric Badges */}
        <div
          ref={statsRef}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-8 max-w-4xl w-full pt-4 pb-12 border-y border-base-300/60 backdrop-blur-sm"
        >
          <div className="flex flex-col items-center">
            <span className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              &lt; 5ms
            </span>
            <span className="text-xs sm:text-sm text-base-content/60 font-medium">Socket Latency</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-2xl sm:text-3xl font-black text-emerald-400">100%</span>
            <span className="text-xs sm:text-sm text-base-content/60 font-medium">Message Delivery</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-2xl sm:text-3xl font-black text-primary">32</span>
            <span className="text-xs sm:text-sm text-base-content/60 font-medium">DaisyUI Themes</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-2xl sm:text-3xl font-black text-secondary">24/7</span>
            <span className="text-xs sm:text-sm text-base-content/60 font-medium">Heartbeat Probe</span>
          </div>
        </div>

        {/* ===================== 3D INTERACTIVE DEVICE MOCKUP ===================== */}
        <div className="w-full max-w-5xl mt-12 px-2 perspective-[1200px]">
          <div
            ref={card3dRef}
            onMouseMove={handleCardMouseMove}
            onMouseLeave={handleCardMouseLeave}
            style={{ transformStyle: "preserve-3d" }}
            className="relative rounded-3xl p-3 sm:p-5 bg-base-200/50 backdrop-blur-xl border border-primary/20 shadow-2xl shadow-primary/10 transition-shadow duration-300 group"
          >
            {/* Top Bar Mockup */}
            <div
              style={{ transform: "translateZ(30px)" }}
              className="flex items-center justify-between pb-3 mb-3 border-b border-base-300/70 px-2"
            >
              <div className="flex items-center gap-2">
                <div className="size-3 rounded-full bg-error/80" />
                <div className="size-3 rounded-full bg-warning/80" />
                <div className="size-3 rounded-full bg-success/80" />
                <span className="ml-3 text-xs font-semibold text-base-content/60 hidden sm:inline">
                  Chatt-App Realtime Preview
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                Socket Active
              </div>
            </div>

            {/* Inner Chat Sandbox Mockup */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 rounded-2xl overflow-hidden bg-base-100/90 border border-base-300/80 p-3 sm:p-4 text-left">
              {/* Left Mini Sidebar */}
              <div
                style={{ transform: "translateZ(25px)" }}
                className="hidden md:flex md:col-span-4 flex-col gap-2 border-r border-base-300/60 pr-3"
              >
                <div className="flex items-center justify-between pb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-base-content/50">Online Friends</span>
                  <span className="badge badge-primary badge-xs">4 Online</span>
                </div>
                {[
                  { name: "Samir", time: "Now", msg: "Images upload instantly...", online: true },
                  { name: "Emma Thompson", time: "2m", msg: "Meeting was great!", online: true },
                  { name: "James Anderson", time: "1h", msg: "See you tomorrow", online: true },
                ].map((user, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-3 p-2.5 rounded-xl transition-all ${
                      i === 0 ? "bg-base-200/90 shadow-sm border border-primary/20" : "hover:bg-base-200/40"
                    }`}
                  >
                    <div className="relative">
                      <div className="size-9 rounded-full bg-primary/20 flex items-center justify-center font-bold text-xs text-primary">
                        {user.name.charAt(0)}
                      </div>
                      <span className="absolute bottom-0 right-0 size-2.5 bg-emerald-500 rounded-full ring-2 ring-base-100" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex justify-between items-baseline">
                        <span className="text-xs font-semibold truncate">{user.name}</span>
                        <span className="text-[10px] text-base-content/40">{user.time}</span>
                      </div>
                      <p className="text-[11px] text-base-content/60 truncate">{user.msg}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Right Mini Chat Playground */}
              <div
                style={{ transform: "translateZ(45px)" }}
                className="col-span-12 md:col-span-8 flex flex-col justify-between h-[360px]"
              >
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b border-base-300/60">
                  <div className="flex items-center gap-2.5">
                    <div className="size-9 rounded-full bg-secondary/20 flex items-center justify-center font-bold text-xs text-secondary">
                      S
                    </div>
                    <div>
                      <h4 className="text-xs font-bold leading-tight">Samir</h4>
                      <span className="text-[10px] text-emerald-400">● Active right now</span>
                    </div>
                  </div>
                  <span className="badge badge-ghost badge-sm text-[10px]">Realtime Demo</span>
                </div>

                {/* Messages Body */}
                <div className="flex-1 overflow-y-auto space-y-3 py-3 pr-1 text-xs">
                  {demoMessages.map((m) => (
                    <div
                      key={m.id}
                      className={`flex flex-col ${m.isMe ? "items-end" : "items-start"} animate-fadeIn`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-3.5 py-2 shadow-sm ${
                          m.isMe
                            ? "bg-primary text-primary-content rounded-tr-none"
                            : "bg-base-200 text-base-content rounded-tl-none border border-base-300/60"
                        }`}
                      >
                        <p>{m.text}</p>
                      </div>
                      <span className="text-[9px] text-base-content/40 mt-1 px-1">{m.time}</span>
                    </div>
                  ))}

                  {isDemoTyping && (
                    <div className="flex items-center gap-1.5 text-xs text-base-content/50 italic py-1">
                      <span className="size-1.5 bg-primary rounded-full animate-bounce" />
                      <span className="size-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.2s]" />
                      <span className="size-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.4s]" />
                      <span className="text-[11px] ml-1">Samir is typing...</span>
                    </div>
                  )}
                </div>

                {/* Input Simulator */}
                <form onSubmit={handleSendDemoMessage} className="flex gap-2 pt-2 border-t border-base-300/60">
                  <input
                    type="text"
                    value={demoInput}
                    onChange={(e) => setDemoInput(e.target.value)}
                    placeholder="Try typing a demo message..."
                    className="input input-sm input-bordered flex-1 rounded-xl text-xs bg-base-200/50"
                  />
                  <button type="submit" className="btn btn-primary btn-sm rounded-xl px-3">
                    <Send className="size-3.5" />
                  </button>
                </form>
              </div>
            </div>

            {/* 3D Floating Out-of-Bounds Badges */}
            <div
              style={{ transform: "translateZ(80px)" }}
              className="absolute -top-5 -left-4 sm:-left-8 bg-base-100/90 backdrop-blur-md border border-primary/30 rounded-2xl p-3 shadow-xl flex items-center gap-2.5 hidden sm:flex"
            >
              <div className="size-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Zap className="size-4" />
              </div>
              <div className="text-left">
                <p className="text-[10px] text-base-content/60 font-semibold uppercase">Latency</p>
                <p className="text-xs font-black text-emerald-400">&lt; 1 millisecond</p>
              </div>
            </div>

            <div
              style={{ transform: "translateZ(75px)" }}
              className="absolute -bottom-5 -right-4 sm:-right-8 bg-base-100/90 backdrop-blur-md border border-secondary/30 rounded-2xl p-3 shadow-xl flex items-center gap-2.5 hidden sm:flex"
            >
              <div className="size-8 rounded-full bg-secondary/20 flex items-center justify-center text-secondary">
                <Flame className="size-4" />
              </div>
              <div className="text-left">
                <p className="text-[10px] text-base-content/60 font-semibold uppercase">Architecture</p>
                <p className="text-xs font-black text-secondary">Vercel + Render</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== 3D FEATURE GRID ===================== */}
      <section ref={featuresRef} className="py-24 px-4 max-w-7xl mx-auto relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-bold uppercase tracking-widest text-primary">High-Performance Core</span>
          <h2 className="text-3xl sm:text-5xl font-extrabold mt-3 mb-4">
            Built for Modern Realtime Demands
          </h2>
          <p className="text-base sm:text-lg text-base-content/70">
            Engineered from ground up with WebSocket protocols, cloud-optimized image pipelines, and dual-layer auth resilience.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {[
            {
              icon: Zap,
              color: "text-amber-400 bg-amber-400/10 border-amber-400/20",
              title: "Sub-Millisecond Sockets",
              desc: "Powered by Socket.IO for instantaneous message dispatch, typing triggers, and dynamic online statuses.",
            },
            {
              icon: ImageIcon,
              color: "text-pink-400 bg-pink-400/10 border-pink-400/20",
              title: "Smart Cloudinary Media",
              desc: "Automated Apple HEIC to JPEG conversion, lossy/lossless compression, and CDN-backed image sharing.",
            },
            {
              icon: Palette,
              color: "text-purple-400 bg-purple-400/10 border-purple-400/20",
              title: "32 Beautiful Themes",
              desc: "From sleek Dark and Cyberpunk to Coffee and Retro. Theme persistence saved directly to your local state.",
            },
            {
              icon: Shield,
              color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
              title: "Dual-Auth Resilience",
              desc: "HttpOnly cross-site cookies paired with Bearer Token fallback so login never breaks across Safari or third-party blocks.",
            },
            {
              icon: Radio,
              color: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20",
              title: "Anti-Sleep Health Heartbeat",
              desc: "Engineered specifically for Render free tiers. Built-in health endpoints allow seamless 24/7 cron pinging.",
            },
            {
              icon: Globe,
              color: "text-indigo-400 bg-indigo-400/10 border-indigo-400/20",
              title: "Full-Stack Separation",
              desc: "Deploy frontend on Vercel's global edge network and backend on Render with zero CORS conflicts.",
            },
          ].map((f, i) => (
            <div
              key={i}
              className="group p-6 rounded-3xl bg-base-200/50 border border-base-300 hover:border-primary/40 backdrop-blur-sm transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-primary/10 flex flex-col justify-between"
            >
              <div>
                <div className={`size-12 rounded-2xl flex items-center justify-center border mb-5 ${f.color} group-hover:scale-110 transition-transform`}>
                  <f.icon className="size-6" />
                </div>
                <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">{f.title}</h3>
                <p className="text-sm text-base-content/70 leading-relaxed">{f.desc}</p>
              </div>
              <div className="pt-6 flex items-center text-xs font-bold text-primary gap-1 group-hover:gap-2 transition-all">
                <span>Learn more</span>
                <ChevronRight className="size-3.5" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ===================== CALL TO ACTION BANNER ===================== */}
      <section className="py-20 px-4 max-w-5xl mx-auto relative z-10 text-center">
        <div className="relative rounded-3xl p-8 sm:p-14 overflow-hidden bg-gradient-to-br from-primary/20 via-base-200 to-secondary/20 border border-primary/30 shadow-2xl shadow-primary/10">
          <div className="relative z-10 max-w-2xl mx-auto">
            <span className="badge badge-primary badge-sm font-bold uppercase tracking-wider mb-4">
              Get Started In Seconds
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold mb-4 leading-tight">
              Ready to Upgrade Your Chat Experience?
            </h2>
            <p className="text-base sm:text-lg text-base-content/70 mb-8">
              Join now, create your profile, connect with friends, and chat in real-time with zero friction.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/signup"
                className="btn btn-primary btn-lg rounded-2xl px-9 shadow-xl shadow-primary/30 hover:scale-105 transition-all text-base font-bold w-full sm:w-auto"
              >
                Create Free Account
              </Link>
              <Link
                to="/login"
                className="btn btn-ghost btn-lg rounded-2xl hover:bg-base-100/60 transition-all text-base w-full sm:w-auto"
              >
                Sign In
              </Link>
            </div>
          </div>

          {/* Decorative glowing sphere */}
          <div className="absolute -bottom-24 -right-24 size-80 bg-primary/30 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -top-24 -left-24 size-80 bg-secondary/30 rounded-full blur-3xl pointer-events-none" />
        </div>
      </section>

      {/* ===================== FOOTER ===================== */}
      <footer className="border-t border-base-300 py-10 px-4 text-center text-xs text-base-content/60 relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="size-6 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
              <MessageSquare className="size-3.5" />
            </div>
            <span className="font-bold text-sm text-base-content">Chatt-App</span>
            <span>— Realtime Communication Platform</span>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium">
            <Link to="/settings" className="hover:text-primary transition-colors">
              Themes
            </Link>
            <Link to="/login" className="hover:text-primary transition-colors">
              Sign In
            </Link>
            <Link to="/signup" className="hover:text-primary transition-colors">
              Sign Up
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
