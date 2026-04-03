export function formatCurrency(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

export function getAlertStyles(severity) {
  if (severity === "high") {
    return {
      card: "border-red-200 bg-red-50",
      badge: "bg-red-100 text-red-700",
      title: "text-red-800",
      text: "text-red-700",
    };
  }

  if (severity === "medium") {
    return {
      card: "border-yellow-200 bg-yellow-50",
      badge: "bg-yellow-100 text-yellow-700",
      title: "text-yellow-800",
      text: "text-yellow-700",
    };
  }

  if (severity === "success") {
    return {
      card: "border-green-200 bg-green-50",
      badge: "bg-green-100 text-green-700",
      title: "text-green-800",
      text: "text-green-700",
    };
  }

  return {
    card: "border-blue-200 bg-blue-50",
    badge: "bg-blue-100 text-blue-700",
    title: "text-blue-800",
    text: "text-blue-700",
  };
}

export function getSeverityLabel(severity) {
  if (severity === "high") return "High";
  if (severity === "medium") return "Medium";
  if (severity === "success") return "Good";
  return "Normal";
}

export function getRiskCardStyles(tone) {
  if (tone === "high") {
    return {
      box: "bg-red-50 border-red-200",
      label: "text-red-700",
      value: "text-red-800",
    };
  }

  if (tone === "medium") {
    return {
      box: "bg-yellow-50 border-yellow-200",
      label: "text-yellow-700",
      value: "text-yellow-800",
    };
  }

  if (tone === "success") {
    return {
      box: "bg-green-50 border-green-200",
      label: "text-green-700",
      value: "text-green-800",
    };
  }

  return {
    box: "bg-blue-50 border-blue-200",
    label: "text-blue-700",
    value: "text-blue-800",
  };
}

export function buildErpAlerts({
  selectedDate,
  canViewFinance,
  totalTeachersMarked,
  absentTodayCount,
  absentPercentage,
  totalFeesCollected,
  totalExpenditure,
  pendingStudentsCount,
  totalOutstanding,
  overdueStudentsCount,
  partialStudentsCount,
  isLoadingAttendance,
  isLoadingFees,
  isLoadingExpenses,
  isLoadingOutstanding,
}) {
  const alerts = [];

  if (!isLoadingAttendance && totalTeachersMarked === 0) {
    alerts.push({
      id: "attendance-not-marked",
      title: "Attendance not marked",
      message: `No teacher attendance has been marked for ${selectedDate}.`,
      severity: "high",
      category: "attendance",
    });
  }

  if (!isLoadingAttendance && totalTeachersMarked > 0 && absentTodayCount > 0) {
    alerts.push({
      id: "absent-teachers",
      title: "Absent teachers today",
      message: `${absentTodayCount} teacher(s) are marked as absent, leave, or half day today.`,
      severity: absentPercentage >= 50 ? "high" : "medium",
      category: "attendance",
    });
  }

  if (!isLoadingAttendance && totalTeachersMarked > 0 && absentPercentage >= 50) {
    alerts.push({
      id: "low-attendance",
      title: "Low teacher attendance",
      message: `Teacher absence level is ${absentPercentage}% today, which needs attention.`,
      severity: "high",
      category: "attendance",
    });
  }

  if (canViewFinance) {
    if (!isLoadingFees && totalFeesCollected === 0) {
      alerts.push({
        id: "no-fee-collection",
        title: "No fee collection today",
        message: `No fee payment has been recorded for ${selectedDate}.`,
        severity: "medium",
        category: "fees",
      });
    }

    if (!isLoadingExpenses && totalExpenditure > totalFeesCollected) {
      alerts.push({
        id: "expense-higher-than-fees",
        title: "Expense is higher than collection",
        message: `Today's expenditure is ${formatCurrency(
          totalExpenditure
        )}, which is more than today's fees collection of ${formatCurrency(
          totalFeesCollected
        )}.`,
        severity: "high",
        category: "finance",
      });
    }

    if (!isLoadingOutstanding && pendingStudentsCount > 0) {
      alerts.push({
        id: "pending-outstanding",
        title: "Pending fee dues",
        message: `${pendingStudentsCount} student(s) still have outstanding fees totaling ${formatCurrency(
          totalOutstanding
        )}.`,
        severity: totalOutstanding >= 10000 ? "high" : "medium",
        category: "dues",
      });
    }

    if (!isLoadingOutstanding && overdueStudentsCount > 0) {
      alerts.push({
        id: "overdue-fees",
        title: "Overdue fee accounts",
        message: `${overdueStudentsCount} student account(s) are marked overdue.`,
        severity: "high",
        category: "dues",
      });
    }

    if (!isLoadingOutstanding && partialStudentsCount > 0) {
      alerts.push({
        id: "partial-fees",
        title: "Partial fee payments",
        message: `${partialStudentsCount} student account(s) are marked as partial payment.`,
        severity: "normal",
        category: "dues",
      });
    }
  }

  if (alerts.length === 0) {
    alerts.push({
      id: "all-good",
      title: "All clear",
      message: "No important alerts for the selected date.",
      severity: "success",
      category: "system",
    });
  }

  return alerts;
}

export function getAlertSummary(alerts = []) {
  const highAlertsCount = alerts.filter((a) => a.severity === "high").length;
  const mediumAlertsCount = alerts.filter((a) => a.severity === "medium").length;
  const normalAlertsCount = alerts.filter(
    (a) => a.severity === "normal" || a.severity === "success"
  ).length;

  return {
    highAlertsCount,
    mediumAlertsCount,
    normalAlertsCount,
  };
}

export function getAttendanceRisk({
  isLoadingAttendance,
  totalTeachersMarked,
  absentPercentage,
  absentTodayCount,
}) {
  if (isLoadingAttendance) return { label: "Loading", tone: "normal" };
  if (totalTeachersMarked === 0) return { label: "High Risk", tone: "high" };
  if (absentPercentage >= 50) return { label: "High Risk", tone: "high" };
  if (absentTodayCount > 0) return { label: "Moderate Risk", tone: "medium" };
  return { label: "Stable", tone: "success" };
}

export function getFinanceRisk({
  canViewFinance,
  isLoadingFees,
  isLoadingExpenses,
  totalExpenditure,
  totalFeesCollected,
}) {
  if (!canViewFinance) return { label: "Restricted", tone: "normal" };
  if (isLoadingFees || isLoadingExpenses) {
    return { label: "Loading", tone: "normal" };
  }
  if (totalExpenditure > totalFeesCollected) {
    return { label: "High Risk", tone: "high" };
  }
  if (totalFeesCollected === 0) {
    return { label: "Watch", tone: "medium" };
  }
  return { label: "Healthy", tone: "success" };
}

export function getDuesRisk({
  canViewFinance,
  isLoadingOutstanding,
  overdueStudentsCount,
  pendingStudentsCount,
}) {
  if (!canViewFinance) return { label: "Restricted", tone: "normal" };
  if (isLoadingOutstanding) return { label: "Loading", tone: "normal" };
  if (overdueStudentsCount > 0) return { label: "High Risk", tone: "high" };
  if (pendingStudentsCount > 0) return { label: "Moderate Risk", tone: "medium" };
  return { label: "Clear", tone: "success" };
}

export function getOverallRisk({ highAlertsCount, mediumAlertsCount }) {
  if (highAlertsCount > 0) return { label: "High Risk", tone: "high" };
  if (mediumAlertsCount > 0) return { label: "Moderate Risk", tone: "medium" };
  return { label: "Stable", tone: "success" };
}

export function getSmartRecommendation({
  highAlertsCount,
  mediumAlertsCount,
  absentTodayCount,
  pendingStudentsCount,
  totalExpenditure,
  totalFeesCollected,
}) {
  if (highAlertsCount > 0 && absentTodayCount > 0) {
    return "Immediate action needed: review teacher attendance and resolve today’s absence issue.";
  }

  if (highAlertsCount > 0 && totalExpenditure > totalFeesCollected) {
    return "Immediate action needed: today’s spending is higher than collection. Review expenses first.";
  }

  if (pendingStudentsCount > 0) {
    return "Recommended action: follow up with pending fee students and update payment records.";
  }

  if (mediumAlertsCount > 0) {
    return "Recommended action: monitor today’s alerts and keep records updated before end of day.";
  }

  return "School operations look stable today. Continue routine monitoring.";
}