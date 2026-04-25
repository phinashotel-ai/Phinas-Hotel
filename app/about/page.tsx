"use client";

import Image from "next/image";
import Link from "next/link";
import SiteHeader from "../components/site-header";

const highlights = [
  {
    title: "Thoughtful stays",
    text: "Comfortable rooms, calm interiors, and a booking flow that keeps things simple from start to finish.",
  },
  {
    title: "Central location",
    text: "A convenient base for guests who want easy access to landmarks, dining, and city life.",
  },
  {
    title: "Guest-first service",
    text: "Friendly support, clear communication, and a team focused on making every stay feel effortless.",
  },
];

const missionPoints = [
  "Deliver a smooth and welcoming stay for every guest.",
  "Provide comfortable rooms with thoughtful service.",
  "Make booking, check-in, and support simple and reliable.",
];

const visionPoints = [
  "Be a trusted hotel known for comfort and consistency.",
  "Create memorable stays that guests want to repeat.",
  "Continue improving the guest experience in every detail.",
];

export default function AboutPage() {
  return (
    <div className="min-h-screen font-sans" style={{ backgroundColor: "#faf9f6", color: "#1c352c" }}>
      <SiteHeader activeHref="/about us" />

      <section className="relative flex min-h-[70vh] items-end justify-center overflow-hidden px-6 pb-20 pt-28">
        <Image
          src="/che.jpg"
          alt="Phinas Hotel interior"
          fill
          priority
          className="object-cover"
          style={{ filter: "brightness(0.4)" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/25 to-[#132222]/80" />
        <div className="relative z-10 mx-auto max-w-4xl text-center">
          <p className="mb-3 text-xs uppercase tracking-[0.5em] text-[#d4d7c7]">About Us</p>
          <h1 className="mb-5 text-4xl font-thin tracking-[0.18em] text-white md:text-6xl">
            PHINAS HOTEL
          </h1>
          <p className="mx-auto max-w-2xl text-sm leading-7 text-[#eef0e8] md:text-base">
            A refined hotel experience built around comfort, convenience, and the feeling of being
            cared for from the moment you arrive.
          </p>
        </div>
      </section>

      <section className="px-6 py-20">
        <div className="mx-auto grid max-w-6xl gap-12 md:grid-cols-2 md:items-center">
          <div className="relative h-[420px] overflow-hidden rounded-[2rem]">
            <Image
              src="/che4.jpg"
              alt="Hotel lobby"
              fill
              className="object-cover"
              style={{ filter: "brightness(0.85)" }}
            />
          </div>

          <div>
            <p className="mb-3 text-xs uppercase tracking-[0.35em] text-[#71867e]">Our Story</p>
            <h2 className="mb-6 text-3xl font-light md:text-4xl">
              Designed for guests who value <span className="font-semibold">comfort and ease</span>
            </h2>
            <p className="mb-6 text-sm leading-7 text-[#4a6358] md:text-base">
              Phinas Hotel was created to give travelers a welcoming place to rest, recharge, and
              enjoy a polished stay experience. Every detail, from the room layouts to the booking
              flow, is intended to feel straightforward and pleasant.
            </p>
            <p className="mb-8 text-sm leading-7 text-[#4a6358] md:text-base">
              Whether you are visiting for business, leisure, or a special occasion, we aim to make
              your time with us smooth, memorable, and comfortable.
            </p>
            
          </div>
        </div>
      </section>

      <section className="px-6 pb-20">
        <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-2">
          <div className="rounded-[2rem] bg-[#1c352c] p-8 text-white md:p-10">
            <p className="mb-3 text-xs uppercase tracking-[0.35em] text-[#a0b0a8]">Mission</p>
            <h2 className="mb-5 text-3xl font-light">
              Our <span className="font-semibold">Mission</span>
            </h2>
            <ul className="space-y-3 text-sm leading-7 text-[#eef0e8]">
              {missionPoints.map((point) => (
                <li key={point} className="flex gap-3">
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#d4d7c7]" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-[2rem] bg-[#eef0e8] p-8 md:p-10">
            <p className="mb-3 text-xs uppercase tracking-[0.35em] text-[#71867e]">Vision</p>
            <h2 className="mb-5 text-3xl font-light">
              Our <span className="font-semibold">Vision</span>
            </h2>
            <ul className="space-y-3 text-sm leading-7 text-[#4a6358]">
              {visionPoints.map((point) => (
                <li key={point} className="flex gap-3">
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#1c352c]" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="bg-[#132222] px-6 py-20 text-white">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <p className="mb-3 text-xs uppercase tracking-[0.35em] text-[#a0b0a8]">What We Offer</p>
            <h2 className="text-3xl font-light md:text-4xl">
              A stay shaped by <span className="font-semibold">simple Phinas Hotel</span>
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {highlights.map((item) => (
              <article key={item.title} className="rounded-[1.5rem] border border-white/10 bg-white/5 p-8">
                <h3 className="mb-4 text-xl font-medium text-[#d4d7c7]">{item.title}</h3>
                <p className="text-sm leading-7 text-[#eef0e8]">{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-[#132222] px-8 py-14">
        <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-3">
          <div>
            <h3 className="mb-4 text-sm font-light tracking-[0.2em] text-[#fff8ed]">PHINAS HOTEL</h3>
            <p className="text-[#71867e] text-xs leading-relaxed">Experience PHINAS like never before.</p>
          </div>
          <div>
            <h4 className="text-[#fff8ed] tracking-widest text-xs mb-4">QUICK LINKS</h4>
            <ul className="space-y-2 text-[#71867e] text-xs">
              <li><Link href="/rooms" className="hover:text-[#d4d7c7] transition">Our Rooms</Link></li>
              <li><Link href="/about" className="hover:text-[#d4d7c7] transition">About Us</Link></li>
              <li><Link href="/contact" className="hover:text-[#d4d7c7] transition">Contact</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-[#fff8ed] tracking-widest text-xs mb-4">CONTACT</h4>
            <ul className="space-y-2 text-[#71867e] text-xs">
              <li>📞 +639 702 230 263</li>
              <li>✉️ phinashotel@gmail.com</li>
            </ul>
          </div>
        </div>
        <div className="mt-10 border-t border-[#1c352c] pt-8 text-center text-xs tracking-[0.2em] text-[#71867e]">
          © PHINAS HOTEL. ALL RIGHTS RESERVED.
        </div>
      </footer>

    </div>
  );
}
