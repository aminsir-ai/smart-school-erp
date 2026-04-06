"use client";

import Link from "next/link";

const FEATURES = [
  {
    title: "Attendance",
    description: "Track daily student and staff attendance with clear status updates.",
    icon: "📅",
  },
  {
    title: "Fees",
    description: "Manage fee collection, pending dues, and payment records easily.",
    icon: "💳",
  },
  {
    title: "Homework",
    description: "Create, assign, submit, and review homework in one system.",
    icon: "📘",
  },
  {
    title: "Test Papers",
    description: "Generate print-friendly test papers for classroom use and exams.",
    icon: "📝",
  },
  {
    title: "Reports",
    description: "View dashboard summaries, school performance, and smart insights.",
    icon: "📊",
  },
];

const ROLE_LINKS = [
  {
    title: "Login",
    subtitle: "Go to secure login page",
    href: "/login",
    style: "primary",
  },
  {
    title: "Admin Panel",
    subtitle: "School administration dashboard",
    href: "/admin-dashboard",
    style: "dark",
  },
  {
    title: "Teacher Panel",
    subtitle: "Manage work, papers, and class tasks",
    href: "/teacher-dashboard",
    style: "light",
  },
  {
    title: "Student Panel",
    subtitle: "Access homework, classwork, and updates",
    href: "/student-dashboard",
    style: "light",
  },
];

function getButtonClass(style) {
  if (style === "primary") {
    return "bg-blue-600 text-white hover:bg-blue-700";
  }

  if (style === "dark") {
    return "bg-slate-900 text-white hover:bg-slate-800";
  }

  return "bg-white text-slate-800 border border-slate-200 hover:bg-slate-50";
}

export default function HomePage() {
  return (
    <main style={styles.page}>
      <div style={styles.backgroundGlowTop} />
      <div style={styles.backgroundGlowBottom} />

      <section style={styles.wrapper}>
        <div style={styles.topBadge}>United English School, Morba</div>

        <div style={styles.heroCard}>
          <div style={styles.heroContent}>
            <div style={styles.label}>Demo Ready School Management Platform</div>

            <h1 style={styles.title}>Smart School ERP</h1>

            <p style={styles.description}>
              A modern, simple, and mobile-friendly ERP system for Admin, Teachers,
              and Students. Manage attendance, fees, homework, test papers, and reports
              from one platform.
            </p>

            <div style={styles.actionGrid}>
              {ROLE_LINKS.map((item) => (
                <Link
                  key={item.title}
                  href={item.href}
                  style={{
                    ...styles.actionButton,
                    ...(item.style === "primary"
                      ? styles.actionButtonPrimary
                      : item.style === "dark"
                      ? styles.actionButtonDark
                      : styles.actionButtonLight),
                  }}
                >
                  <div style={styles.actionTitle}>{item.title}</div>
                  <div style={styles.actionSubtitle}>{item.subtitle}</div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        <section style={styles.featureSection}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>Core Features</h2>
            <p style={styles.sectionSubtitle}>
              Built for daily school operations and ready for live demo presentation.
            </p>
          </div>

          <div style={styles.featureGrid}>
            {FEATURES.map((feature) => (
              <div key={feature.title} style={styles.featureCard}>
                <div style={styles.featureIcon}>{feature.icon}</div>
                <h3 style={styles.featureTitle}>{feature.title}</h3>
                <p style={styles.featureDescription}>{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section style={styles.bottomInfo}>
          <div style={styles.bottomInfoCard}>
            <div style={styles.bottomInfoTitle}>System Access</div>
            <div style={styles.bottomInfoText}>
              Admin, Teacher, and Student panels are available through the existing ERP routes.
            </div>
          </div>

          <div style={styles.bottomInfoCard}>
            <div style={styles.bottomInfoTitle}>Fast & Clean UI</div>
            <div style={styles.bottomInfoText}>
              Lightweight layout with responsive design for mobile demo and desktop presentation.
            </div>
          </div>

          <div style={styles.bottomInfoCard}>
            <div style={styles.bottomInfoTitle}>School Branding</div>
            <div style={styles.bottomInfoText}>
              United English School, Morba is shown permanently as the school identity.
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    position: "relative",
    overflow: "hidden",
    background:
      "linear-gradient(180deg, #f8fbff 0%, #eef4ff 45%, #f8fafc 100%)",
    padding: "20px 14px 40px",
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  backgroundGlowTop: {
    position: "absolute",
    top: "-120px",
    right: "-80px",
    width: "280px",
    height: "280px",
    borderRadius: "999px",
    background: "rgba(59, 130, 246, 0.10)",
    filter: "blur(10px)",
    pointerEvents: "none",
  },
  backgroundGlowBottom: {
    position: "absolute",
    bottom: "-120px",
    left: "-80px",
    width: "260px",
    height: "260px",
    borderRadius: "999px",
    background: "rgba(15, 23, 42, 0.06)",
    filter: "blur(10px)",
    pointerEvents: "none",
  },
  wrapper: {
    maxWidth: "1100px",
    margin: "0 auto",
    position: "relative",
    zIndex: 1,
  },
  topBadge: {
    display: "inline-block",
    marginBottom: "14px",
    padding: "8px 14px",
    borderRadius: "999px",
    background: "#ffffff",
    color: "#0f172a",
    fontSize: "13px",
    fontWeight: 700,
    border: "1px solid #dbeafe",
    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.05)",
  },
  heroCard: {
    background: "rgba(255, 255, 255, 0.92)",
    border: "1px solid rgba(226, 232, 240, 0.9)",
    borderRadius: "24px",
    boxShadow: "0 20px 50px rgba(15, 23, 42, 0.08)",
    padding: "24px 18px",
  },
  heroContent: {
    maxWidth: "900px",
    margin: "0 auto",
    textAlign: "center",
  },
  label: {
    fontSize: "12px",
    fontWeight: 800,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "#2563eb",
    marginBottom: "10px",
  },
  title: {
    margin: 0,
    fontSize: "clamp(30px, 6vw, 54px)",
    lineHeight: 1.1,
    fontWeight: 800,
    color: "#0f172a",
  },
  description: {
    margin: "14px auto 0",
    maxWidth: "760px",
    fontSize: "15px",
    lineHeight: 1.7,
    color: "#475569",
  },
  actionGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
    gap: "14px",
    marginTop: "28px",
  },
  actionButton: {
    textDecoration: "none",
    borderRadius: "18px",
    padding: "18px 16px",
    textAlign: "left",
    transition: "all 0.2s ease",
    boxShadow: "0 10px 25px rgba(15, 23, 42, 0.05)",
  },
  actionButtonPrimary: {
    background: "#2563eb",
    color: "#ffffff",
  },
  actionButtonDark: {
    background: "#0f172a",
    color: "#ffffff",
  },
  actionButtonLight: {
    background: "#ffffff",
    color: "#0f172a",
    border: "1px solid #e2e8f0",
  },
  actionTitle: {
    fontSize: "18px",
    fontWeight: 800,
    marginBottom: "6px",
  },
  actionSubtitle: {
    fontSize: "13px",
    lineHeight: 1.5,
    opacity: 0.9,
  },
  featureSection: {
    marginTop: "26px",
  },
  sectionHeader: {
    textAlign: "center",
    marginBottom: "16px",
  },
  sectionTitle: {
    margin: 0,
    fontSize: "28px",
    fontWeight: 800,
    color: "#0f172a",
  },
  sectionSubtitle: {
    margin: "8px 0 0",
    fontSize: "14px",
    color: "#64748b",
  },
  featureGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "14px",
  },
  featureCard: {
    background: "#ffffff",
    borderRadius: "20px",
    padding: "18px 16px",
    border: "1px solid #e2e8f0",
    boxShadow: "0 12px 30px rgba(15, 23, 42, 0.05)",
    textAlign: "left",
  },
  featureIcon: {
    fontSize: "28px",
    marginBottom: "10px",
  },
  featureTitle: {
    margin: 0,
    fontSize: "18px",
    fontWeight: 800,
    color: "#0f172a",
  },
  featureDescription: {
    margin: "8px 0 0",
    fontSize: "13px",
    lineHeight: 1.6,
    color: "#64748b",
  },
  bottomInfo: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "14px",
    marginTop: "24px",
  },
  bottomInfoCard: {
    background: "rgba(255,255,255,0.85)",
    border: "1px solid #e2e8f0",
    borderRadius: "18px",
    padding: "16px",
  },
  bottomInfoTitle: {
    fontSize: "16px",
    fontWeight: 800,
    color: "#0f172a",
    marginBottom: "6px",
  },
  bottomInfoText: {
    fontSize: "13px",
    lineHeight: 1.6,
    color: "#64748b",
  },
};