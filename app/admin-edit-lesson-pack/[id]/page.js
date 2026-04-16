"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

const HEADING_MAP = {
  chapter: "chapter",
  "chapter name": "chapter",
  "simple explanation": "simple_explanation",
  "lesson summary": "lesson_summary",
  "quick revision": "quick_revision",
  "previous year question insights": "pyq_insights",
  "important questions": "important_questions",
  "practice questions": "practice_questions",
  "audio link": "audio_link",
};

const DETECTED_LABELS = {
  chapter: "Chapter",
  simple_explanation: "Simple Explanation",
  lesson_summary: "Lesson Summary",
  quick_revision: "Quick Revision",
  pyq_insights: "Previous Year Question Insights",
  important_questions: "Important Questions",
  practice_questions: "Practice Questions",
  audio_link: "Audio Link",
};

const BULK_PLACEHOLDER = `Chapter Name:
Light Reflection and Refraction

Simple Explanation:
Light travels in a straight line. When light falls on a shiny surface, it bounces back. This is called reflection. Refraction means bending of light when it moves from one medium to another.

Lesson Summary:
This lesson explains reflection, refraction, ray diagrams, and common examples.

Quick Revision:
Reflection = bouncing of light.
Refraction = bending of light.
Mirror forms image.
Lens bends light.

Previous Year Question Insights:
Define reflection.
Explain refraction.
Draw ray diagram.
Difference between real image and virtual image.

Important Questions:
What is reflection?
What is refraction?
Differentiate between reflection and refraction.

Practice Questions:
Define reflection.
Define refraction.
Draw a simple ray diagram.

Audio Link:
https://example.com/audio`;

function parseStoredUser() {
  if (typeof window === "undefined") return null;

  const possibleKeys = [
    "user",
    "adminUser",
    "schoolUser",
    "managementUser",
    "teacherUser",
    "studentUser",
  ];

  for (const key of possibleKeys) {
    const raw = localStorage.getItem(key);
    if (!raw) continue;

    try {
      const parsed = JSON.parse(raw);
      if (parsed) return parsed;
    } catch {
      continue;
    }
  }

  return null;
}

function normalizeHeading(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/\*/g, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\s*:\s*$/, "")
    .trim();
}

function cleanParsedValue(text) {
  return String(text || "")
    .replace(/^\s+|\s+$/g, "")
    .replace(/\n{3,}/g, "\n\n");
}

function parseLessonContent(rawText) {
  const result = {
    chapter: "",
    simple_explanation: "",
    lesson_summary: "",
    quick_revision: "",
    pyq_insights: "",
    important_questions: "",
    practice_questions: "",
    audio_link: "",
  };

  const text = String(rawText || "").replace(/\r\n/g, "\n").trim();
  if (!text) return result;

  const lines = text.split("\n");
  let currentKey = null;

  for (let i = 0; i < lines.length; i++) {
    const originalLine = lines[i];
    const trimmedLine = originalLine.trim();

    if (!trimmedLine) {
      if (currentKey) {
        result[currentKey] += result[currentKey] ? "\n" : "";
      }
      continue;
    }

    const headingWithValue = trimmedLine.match(
      /^(chapter name|chapter|simple explanation|lesson summary|quick revision|previous year question insights|important questions|practice questions|audio link)\s*:\s*(.*)$/i
    );

    if (headingWithValue) {
      const headingText = normalizeHeading(headingWithValue[1]);
      const detectedKey = HEADING_MAP[headingText] || null;
      const inlineValue = cleanParsedValue(headingWithValue[2] || "");

      currentKey = detectedKey;

      if (currentKey) {
        result[currentKey] = inlineValue;
      }

      continue;
    }

    const headingOnly = trimmedLine.match(
      /^(chapter name|chapter|simple explanation|lesson summary|quick revision|previous year question insights|important questions|practice questions|audio link)\s*:?\s*$/i
    );

    if (headingOnly) {
      const headingText = normalizeHeading(headingOnly[1]);
      currentKey = HEADING_MAP[headingText] || null;

      if (currentKey && !result[currentKey]) {
        result[currentKey] = "";
      }
      continue;
    }

    if (currentKey) {
      result[currentKey] += (result[currentKey] ? "\n" : "") + originalLine;
    }
  }

  Object.keys(result).forEach((key) => {
    result[key] = cleanParsedValue(result[key]);
  });

  return result;
}

export default function AdminEditLessonPackPage() {
  const router = useRouter();
  const params = useParams();
  const lessonId = params?.id;

  const [ready, setReady] = useState(false);
  const [adminName, setAdminName] = useState("Admin");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [fullLessonContent, setFullLessonContent] = useState("");

  const [form, setForm] = useState({
    title: "",
    class_name: "",
    subject: "",
    chapter: "",
    simple_explanation: "",
    lesson_summary: "",
    quick_revision: "",
    pyq_insights: "",
    important_questions: "",
    practice_questions: "",
    pdf_url: "",
    pdf_name: "",
    audio_link: "",
    lesson_type: "lesson_pack",
  });

  useEffect(() => {
    const savedUser = parseStoredUser();

    if (!savedUser) {
      router.replace("/login");
      return;
    }

    setAdminName(savedUser?.name || "Admin");
    setReady(true);
  }, [router]);

  useEffect(() => {
    if (!ready) return;
    if (!lessonId) return;
    fetchLessonPack();
  }, [ready, lessonId]);

  async function fetchLessonPack() {
    setLoading(true);
    setError("");
    setSuccess("");

    const { data, error } = await supabase
      .from("works")
      .select("*")
      .eq("id", lessonId)
      .single();

    if (error) {
      setError(error.message || "Could not load lesson pack.");
      setLoading(false);
      return;
    }

    if (!data) {
      setError("Lesson pack not found.");
      setLoading(false);
      return;
    }

    let parsedGenerated = {};
    try {
      parsedGenerated = data.generated_paper_text
        ? JSON.parse(data.generated_paper_text)
        : {};
    } catch {
      parsedGenerated = {};
    }

    setForm({
      title: data.title || "",
      class_name: data.class_name || data.class || "",
      subject: data.subject || data.subject_name || "",
      chapter: data.chapter || parsedGenerated.chapter || "",
      simple_explanation:
        data.simple_explanation ||
        parsedGenerated.simpleExplanation ||
        parsedGenerated.simple_explanation ||
        data.question ||
        "",
      lesson_summary:
        data.lesson_summary ||
        parsedGenerated.lessonSummary ||
        parsedGenerated.lesson_summary ||
        "",
      quick_revision:
        data.quick_revision ||
        parsedGenerated.quickRevision ||
        parsedGenerated.quick_revision ||
        "",
      pyq_insights:
        data.pyq_insights ||
        parsedGenerated.previousYearInsights ||
        parsedGenerated.previous_year_insights ||
        parsedGenerated.pyq_insights ||
        "",
      important_questions:
        data.important_questions ||
        parsedGenerated.importantQuestions ||
        parsedGenerated.important_questions ||
        "",
      practice_questions:
        data.practice_questions ||
        parsedGenerated.practiceQuestions ||
        parsedGenerated.practice_questions ||
        "",
      pdf_url: data.pdf_url || data.file_url || "",
      pdf_name: data.pdf_name || data.file_name || "",
      audio_link:
        data.audio_link ||
        parsedGenerated.audioLink ||
        parsedGenerated.audio_link ||
        "",
      lesson_type: data.lesson_type || data.type || "lesson_pack",
    });

    setLoading(false);
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function handleAutoFill() {
    const parsed = parseLessonContent(fullLessonContent);
    const detectedCount = Object.values(parsed).filter((value) => String(value || "").trim()).length;

    if (detectedCount === 0) {
      setError("No supported headings were detected. Please check the pasted format.");
      setSuccess("");
      return;
    }

    setForm((prev) => ({
      ...prev,
      chapter: parsed.chapter || prev.chapter,
      simple_explanation: parsed.simple_explanation || prev.simple_explanation,
      lesson_summary: parsed.lesson_summary || prev.lesson_summary,
      quick_revision: parsed.quick_revision || prev.quick_revision,
      pyq_insights: parsed.pyq_insights || prev.pyq_insights,
      important_questions: parsed.important_questions || prev.important_questions,
      practice_questions: parsed.practice_questions || prev.practice_questions,
      audio_link: parsed.audio_link || prev.audio_link,
    }));

    setError("");
    setSuccess("Content detected and fields auto-filled. You can still edit everything manually.");
  }

  function clearBulkContentOnly() {
    setFullLessonContent("");
    setError("");
    setSuccess("Full lesson content box cleared.");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    const structuredLessonData = {
      chapter: form.chapter || "",
      simpleExplanation: form.simple_explanation || "",
      lessonSummary: form.lesson_summary || "",
      quickRevision: form.quick_revision || "",
      previousYearInsights: form.pyq_insights || "",
      importantQuestions: form.important_questions || "",
      practiceQuestions: form.practice_questions || "",
      audioLink: form.audio_link || "",
    };

    const payload = {
      title: form.title,
      class_name: form.class_name,
      subject: form.subject,
      chapter: form.chapter,
      simple_explanation: form.simple_explanation,
      lesson_summary: form.lesson_summary,
      quick_revision: form.quick_revision,
      pyq_insights: form.pyq_insights,
      important_questions: form.important_questions,
      practice_questions: form.practice_questions,
      pdf_url: form.pdf_url,
      pdf_name: form.pdf_name,
      audio_link: form.audio_link,
      lesson_type: "lesson_pack",
      type: "lesson_pack",
      generated_paper_text: JSON.stringify(structuredLessonData),
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("works")
      .update(payload)
      .eq("id", lessonId);

    if (error) {
      setError(error.message || "Failed to update lesson pack.");
      setSaving(false);
      return;
    }

    setSuccess("Lesson pack updated successfully.");
    setSaving(false);
  }

  function handleLogout() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("user");
      localStorage.removeItem("adminUser");
      localStorage.removeItem("schoolUser");
      localStorage.removeItem("managementUser");
      localStorage.removeItem("teacherUser");
      localStorage.removeItem("studentUser");
    }
    router.replace("/login");
  }

  const pageTitle = useMemo(() => {
    return form.title || "Edit Lesson Pack";
  }, [form.title]);

  const detectedPreview = useMemo(() => {
    return parseLessonContent(fullLessonContent);
  }, [fullLessonContent]);

  if (!ready) {
    return (
      <div style={styles.page}>
        <div style={styles.centerCard}>Checking login...</div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.hero}>
          <div>
            <div style={styles.badge}>AI STUDY ASSISTANT</div>
            <h1 style={styles.heroTitle}>Edit Lesson Pack</h1>
            <p style={styles.heroText}>
              Update saved lesson pack content carefully and safely.
            </p>
          </div>

          <div style={styles.heroButtons}>
            <button
              onClick={() => router.push("/admin-lesson-packs")}
              style={styles.lightButton}
            >
              Back to List
            </button>

            <button onClick={handleLogout} style={styles.dangerButton}>
              Logout
            </button>
          </div>
        </div>

        <div style={styles.layout}>
          <div style={styles.mainCard}>
            {loading ? (
              <div style={styles.messageBox}>Loading lesson pack...</div>
            ) : (
              <>
                <div style={styles.sectionTop}>
                  <h2 style={styles.sectionTitle}>{pageTitle}</h2>
                  <div style={styles.smallMuted}>Editing ID: {lessonId}</div>
                </div>

                <div style={styles.bulkCard}>
                  <div style={styles.bulkHeader}>
                    <div>
                      <h3 style={styles.bulkTitle}>Full Lesson Content</h3>
                      <p style={styles.bulkText}>
                        Paste the full lesson in one block, auto-detect sections, then edit manually if needed.
                      </p>
                    </div>

                    <div style={styles.bulkActions}>
                      <button type="button" onClick={handleAutoFill} style={styles.primarySmallButton}>
                        Auto Fill Fields
                      </button>

                      <button type="button" onClick={clearBulkContentOnly} style={styles.secondarySmallButton}>
                        Clear Box
                      </button>
                    </div>
                  </div>

                  <textarea
                    value={fullLessonContent}
                    onChange={(e) => setFullLessonContent(e.target.value)}
                    rows={14}
                    placeholder={BULK_PLACEHOLDER}
                    style={styles.bulkTextarea}
                  />

                  <div style={styles.previewGrid}>
                    {Object.entries(DETECTED_LABELS).map(([key, label]) => (
                      <div key={key} style={styles.previewCard}>
                        <div style={styles.previewLabel}>{label}</div>
                        <div style={styles.previewValue}>{detectedPreview[key] || "—"}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <form onSubmit={handleSubmit}>
                  <div style={styles.grid2}>
                    <Input
                      label="Title"
                      name="title"
                      value={form.title}
                      onChange={handleChange}
                    />
                    <Input
                      label="Chapter"
                      name="chapter"
                      value={form.chapter}
                      onChange={handleChange}
                    />
                  </div>

                  <div style={styles.grid2}>
                    <Input
                      label="Class"
                      name="class_name"
                      value={form.class_name}
                      onChange={handleChange}
                    />
                    <Input
                      label="Subject"
                      name="subject"
                      value={form.subject}
                      onChange={handleChange}
                    />
                  </div>

                  <Textarea
                    label="Simple Explanation"
                    name="simple_explanation"
                    value={form.simple_explanation}
                    onChange={handleChange}
                    rows={5}
                  />

                  <Textarea
                    label="Lesson Summary"
                    name="lesson_summary"
                    value={form.lesson_summary}
                    onChange={handleChange}
                    rows={5}
                  />

                  <Textarea
                    label="Quick Revision"
                    name="quick_revision"
                    value={form.quick_revision}
                    onChange={handleChange}
                    rows={4}
                  />

                  <Textarea
                    label="Previous Year Question Insights"
                    name="pyq_insights"
                    value={form.pyq_insights}
                    onChange={handleChange}
                    rows={4}
                  />

                  <Textarea
                    label="Important Questions"
                    name="important_questions"
                    value={form.important_questions}
                    onChange={handleChange}
                    rows={5}
                  />

                  <Textarea
                    label="Practice Questions"
                    name="practice_questions"
                    value={form.practice_questions}
                    onChange={handleChange}
                    rows={5}
                  />

                  <div style={styles.grid2}>
                    <Input
                      label="Audio Link"
                      name="audio_link"
                      value={form.audio_link}
                      onChange={handleChange}
                    />
                    <Input
                      label="PDF URL"
                      name="pdf_url"
                      value={form.pdf_url}
                      onChange={handleChange}
                    />
                  </div>

                  <Input
                    label="PDF Name"
                    name="pdf_name"
                    value={form.pdf_name}
                    onChange={handleChange}
                  />

                  {error ? <div style={styles.errorBox}>{error}</div> : null}
                  {success ? <div style={styles.successBox}>{success}</div> : null}

                  <div style={styles.actionRow}>
                    <button type="submit" disabled={saving} style={styles.saveButton}>
                      {saving ? "Updating..." : "Update Lesson Pack"}
                    </button>

                    <button
                      type="button"
                      onClick={() => router.push(`/lesson/${lessonId}`)}
                      style={styles.previewButton}
                    >
                      Open Lesson Preview
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>

          <div style={styles.sideCard}>
            <Info label="Logged In Admin" value={adminName} />
            <Info label="Lesson ID" value={lessonId || "-"} />
            <Info label="Database Table" value="works" />
            <Info label="Lesson Type" value="lesson_pack" />
          </div>
        </div>
      </div>
    </div>
  );
}

function Input({ label, name, value, onChange }) {
  return (
    <div style={{ marginBottom: "16px" }}>
      <label style={styles.label}>{label}</label>
      <input
        name={name}
        value={value}
        onChange={onChange}
        style={styles.input}
      />
    </div>
  );
}

function Textarea({ label, name, value, onChange, rows = 5 }) {
  return (
    <div style={{ marginBottom: "16px" }}>
      <label style={styles.label}>{label}</label>
      <textarea
        name={name}
        value={value}
        onChange={onChange}
        rows={rows}
        style={styles.textarea}
      />
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div style={styles.infoBox}>
      <div style={styles.infoLabel}>{label}</div>
      <div style={styles.infoValue}>{value || "-"}</div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#eef3fb",
    padding: "24px",
    fontFamily: "Arial, sans-serif",
  },
  container: {
    maxWidth: "1200px",
    margin: "0 auto",
  },
  hero: {
    background: "linear-gradient(135deg, #2563eb, #9333ea)",
    color: "#fff",
    borderRadius: "24px",
    padding: "28px",
    marginBottom: "24px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "16px",
    flexWrap: "wrap",
  },
  badge: {
    display: "inline-block",
    background: "rgba(255,255,255,0.18)",
    padding: "10px 16px",
    borderRadius: "999px",
    fontSize: "13px",
    fontWeight: "800",
    letterSpacing: "2px",
    marginBottom: "12px",
  },
  heroTitle: {
    margin: 0,
    fontSize: "44px",
    lineHeight: 1.1,
    fontWeight: "800",
  },
  heroText: {
    marginTop: "12px",
    marginBottom: 0,
    fontSize: "18px",
    maxWidth: "760px",
  },
  heroButtons: {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
  },
  lightButton: {
    border: "none",
    background: "#fff",
    color: "#6d28d9",
    padding: "12px 18px",
    borderRadius: "12px",
    fontWeight: "700",
    cursor: "pointer",
  },
  dangerButton: {
    border: "none",
    background: "#ef4444",
    color: "#fff",
    padding: "12px 18px",
    borderRadius: "12px",
    fontWeight: "700",
    cursor: "pointer",
  },
  layout: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 2fr) minmax(280px, 1fr)",
    gap: "24px",
  },
  mainCard: {
    background: "#fff",
    borderRadius: "20px",
    padding: "24px",
    boxShadow: "0 10px 30px rgba(15, 23, 42, 0.06)",
  },
  sideCard: {
    background: "#fff",
    borderRadius: "20px",
    padding: "24px",
    height: "fit-content",
    boxShadow: "0 10px 30px rgba(15, 23, 42, 0.06)",
  },
  centerCard: {
    maxWidth: "500px",
    margin: "80px auto",
    background: "#fff",
    borderRadius: "20px",
    padding: "30px",
    boxShadow: "0 10px 30px rgba(15, 23, 42, 0.06)",
    textAlign: "center",
    fontSize: "18px",
    fontWeight: "700",
    color: "#0f172a",
  },
  messageBox: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    padding: "16px",
    color: "#334155",
    fontWeight: "600",
  },
  sectionTop: {
    marginBottom: "20px",
  },
  sectionTitle: {
    fontSize: "28px",
    fontWeight: "800",
    margin: 0,
    color: "#0f172a",
  },
  smallMuted: {
    marginTop: "6px",
    fontSize: "13px",
    color: "#64748b",
  },
  bulkCard: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "18px",
    padding: "18px",
    marginBottom: "22px",
  },
  bulkHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "14px",
    flexWrap: "wrap",
    marginBottom: "14px",
  },
  bulkTitle: {
    margin: 0,
    fontSize: "22px",
    fontWeight: "800",
    color: "#0f172a",
  },
  bulkText: {
    marginTop: "6px",
    marginBottom: 0,
    color: "#475569",
    fontSize: "14px",
    lineHeight: 1.6,
    maxWidth: "760px",
  },
  bulkActions: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
  },
  primarySmallButton: {
    border: "none",
    background: "#0f172a",
    color: "#fff",
    padding: "10px 14px",
    borderRadius: "12px",
    fontWeight: "700",
    cursor: "pointer",
  },
  secondarySmallButton: {
    border: "1px solid #cbd5e1",
    background: "#fff",
    color: "#334155",
    padding: "10px 14px",
    borderRadius: "12px",
    fontWeight: "700",
    cursor: "pointer",
  },
  bulkTextarea: {
    width: "100%",
    borderRadius: "16px",
    border: "1px solid #cbd5e1",
    padding: "14px",
    fontSize: "14px",
    color: "#0f172a",
    resize: "vertical",
    outline: "none",
    boxSizing: "border-box",
    marginBottom: "16px",
  },
  previewGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "12px",
  },
  previewCard: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    padding: "14px",
  },
  previewLabel: {
    fontSize: "13px",
    fontWeight: "700",
    color: "#334155",
    marginBottom: "8px",
  },
  previewValue: {
    fontSize: "14px",
    color: "#475569",
    whiteSpace: "pre-wrap",
    lineHeight: 1.6,
  },
  grid2: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "16px",
  },
  label: {
    display: "block",
    marginBottom: "8px",
    fontSize: "14px",
    fontWeight: "700",
    color: "#334155",
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid #cbd5e1",
    borderRadius: "14px",
    padding: "12px 14px",
    fontSize: "14px",
    color: "#0f172a",
    outline: "none",
  },
  textarea: {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid #cbd5e1",
    borderRadius: "14px",
    padding: "12px 14px",
    fontSize: "14px",
    color: "#0f172a",
    resize: "vertical",
    outline: "none",
  },
  errorBox: {
    marginTop: "16px",
    marginBottom: "16px",
    background: "#fef2f2",
    border: "1px solid #fecaca",
    color: "#b91c1c",
    borderRadius: "14px",
    padding: "14px 16px",
    fontWeight: "700",
  },
  successBox: {
    marginTop: "16px",
    marginBottom: "16px",
    background: "#ecfdf5",
    border: "1px solid #a7f3d0",
    color: "#047857",
    borderRadius: "14px",
    padding: "14px 16px",
    fontWeight: "700",
  },
  actionRow: {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
  },
  saveButton: {
    border: "none",
    background: "linear-gradient(135deg, #2563eb, #9333ea)",
    color: "#fff",
    padding: "13px 18px",
    borderRadius: "14px",
    fontWeight: "800",
    cursor: "pointer",
  },
  previewButton: {
    border: "1px solid #cbd5e1",
    background: "#fff",
    color: "#334155",
    padding: "13px 18px",
    borderRadius: "14px",
    fontWeight: "700",
    cursor: "pointer",
  },
  infoBox: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    padding: "14px",
    marginBottom: "12px",
  },
  infoLabel: {
    fontSize: "12px",
    fontWeight: "700",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    marginBottom: "6px",
  },
  infoValue: {
    fontSize: "15px",
    fontWeight: "700",
    color: "#0f172a",
    wordBreak: "break-word",
  },
};