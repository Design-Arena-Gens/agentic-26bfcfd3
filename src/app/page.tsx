"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./page.module.css";

type FocusArea =
  | "Strength"
  | "Cardio"
  | "Mobility"
  | "HIIT"
  | "Core"
  | "Recovery";

type IntensityLevel = "Light" | "Moderate" | "High";

type WorkoutTemplate = {
  id: string;
  name: string;
  focus: FocusArea;
  duration: number;
  intensity: IntensityLevel;
  equipment: string;
  description: string;
};

type ScheduledWorkout = {
  id: string;
  templateId: string;
  name: string;
  focus: FocusArea;
  duration: number;
  intensity: IntensityLevel;
  equipment: string;
  notes: string;
  completed: boolean;
};

type Day = (typeof WEEK_DAYS)[number];

type PlannerSchedule = Record<Day, ScheduledWorkout[]>;

type FormState = {
  templateId: string;
  name: string;
  focus: FocusArea;
  duration: number;
  intensity: IntensityLevel;
  equipment: string;
  notes: string;
};

const STORAGE_KEY = "agentic-workout-planner-v1";

const WEEK_DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

const workoutTemplates: WorkoutTemplate[] = [
  {
    id: "strength-fullbody",
    name: "Full-Body Strength",
    focus: "Strength",
    duration: 45,
    intensity: "Moderate",
    equipment: "Dumbbells + Bench",
    description: "Compound lifts paired with accessory work to build strength.",
  },
  {
    id: "cardio-intervals",
    name: "Interval Run",
    focus: "Cardio",
    duration: 30,
    intensity: "High",
    equipment: "Running Shoes",
    description: "5 rounds of 4-minute tempo runs with 1-minute recovery jogs.",
  },
  {
    id: "mobility-flow",
    name: "Mobility Flow",
    focus: "Mobility",
    duration: 25,
    intensity: "Light",
    equipment: "Yoga Mat",
    description: "Active mobility drills focused on hips, shoulders, and spine.",
  },
  {
    id: "hiit-circuit",
    name: "HIIT Circuit",
    focus: "HIIT",
    duration: 20,
    intensity: "High",
    equipment: "Bodyweight",
    description:
      "Seven-move circuit: 40 seconds on, 20 seconds off. Complete three rounds.",
  },
  {
    id: "core-stability",
    name: "Core Stability",
    focus: "Core",
    duration: 18,
    intensity: "Moderate",
    equipment: "Stability Ball",
    description:
      "Anti-rotation planks, dead bug progressions, and controlled leg lowers.",
  },
  {
    id: "recovery-reset",
    name: "Recovery Reset",
    focus: "Recovery",
    duration: 30,
    intensity: "Light",
    equipment: "Foam Roller",
    description:
      "Guided breathing, rolling, and light stretching to promote recovery.",
  },
];

const defaultSchedule: PlannerSchedule = WEEK_DAYS.reduce(
  (schedule, day, index) => {
    const template =
      index < 5
        ? workoutTemplates[index % workoutTemplates.length]
        : index === 5
        ? workoutTemplates.find((item) => item.focus === "Mobility")
        : workoutTemplates.find((item) => item.focus === "Recovery");

    const entry: ScheduledWorkout | null = template
      ? {
          id: `${template.id}-${day}`,
          templateId: template.id,
          name: template.name,
          focus: template.focus,
          duration: template.duration,
          intensity: template.intensity,
          equipment: template.equipment,
          notes: "",
          completed: false,
        }
      : null;

    return {
      ...schedule,
      [day]: entry ? [entry] : [],
    };
  },
  {} as PlannerSchedule,
);

const intensityPalette: Record<IntensityLevel, string> = {
  Light: styles.intensityLight,
  Moderate: styles.intensityModerate,
  High: styles.intensityHigh,
};

export default function Home() {
  const [selectedDay, setSelectedDay] = useState<Day>(WEEK_DAYS[0]);
  const [schedule, setSchedule] = useState<PlannerSchedule>(() => {
    if (typeof window === "undefined") {
      return defaultSchedule;
    }

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultSchedule;
      const parsed = JSON.parse(raw) as Partial<PlannerSchedule>;
      const hydrated: PlannerSchedule = { ...defaultSchedule };
      WEEK_DAYS.forEach((day) => {
        hydrated[day] = parsed?.[day]?.length ? parsed[day]! : [];
      });
      return hydrated;
    } catch {
      return defaultSchedule;
    }
  });

  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState<FormState>(() =>
    createFormFromTemplate(workoutTemplates[0]),
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(schedule));
  }, [schedule]);

  const stats = useMemo(() => {
    const totals = WEEK_DAYS.reduce(
      (acc, day) => {
        schedule[day]?.forEach((session) => {
          acc.totalWorkouts += 1;
          acc.totalMinutes += session.duration;
          if (session.completed) acc.completed += 1;
          acc.focusBreakdown[session.focus] =
            (acc.focusBreakdown[session.focus] ?? 0) + session.duration;
        });
        return acc;
      },
      {
        totalWorkouts: 0,
        totalMinutes: 0,
        completed: 0,
        focusBreakdown: {} as Record<FocusArea, number>,
      },
    );

    const completionRate =
      totals.totalWorkouts === 0
        ? 0
        : Math.round((totals.completed / totals.totalWorkouts) * 100);

    const dominantFocus =
      Object.entries(totals.focusBreakdown).sort((a, b) => b[1] - a[1])[0]?.[0];

    return { ...totals, completionRate, dominantFocus };
  }, [schedule]);

  const weeklyPlan = schedule[selectedDay] ?? [];

  const handleTemplateChange = (templateId: string) => {
    const template = workoutTemplates.find((item) => item.id === templateId);
    if (!template) return;
    setForm(createFormFromTemplate(template));
  };

  const handleAddWorkout = () => {
    const template = workoutTemplates.find(
      (item) => item.id === form.templateId,
    );
    if (!template) return;

    const workout: ScheduledWorkout = {
      id: `${form.templateId}-${Date.now()}`,
      templateId: form.templateId,
      name: form.name.trim() || template.name,
      focus: form.focus,
      duration: Number(form.duration),
      intensity: form.intensity,
      equipment: form.equipment.trim() || template.equipment,
      notes: form.notes.trim(),
      completed: false,
    };

    setSchedule((prev) => ({
      ...prev,
      [selectedDay]: [...prev[selectedDay], workout],
    }));
    setIsAdding(false);
  };

  const handleToggleComplete = (day: Day, workoutId: string) => {
    setSchedule((prev) => ({
      ...prev,
      [day]: prev[day].map((session) =>
        session.id === workoutId
          ? { ...session, completed: !session.completed }
          : session,
      ),
    }));
  };

  const handleDeleteWorkout = (day: Day, workoutId: string) => {
    setSchedule((prev) => ({
      ...prev,
      [day]: prev[day].filter((session) => session.id !== workoutId),
    }));
  };

  const handleClearDay = (day: Day) => {
    setSchedule((prev) => ({
      ...prev,
      [day]: [],
    }));
  };

  return (
    <div className={styles.page}>
      <main className={styles.layout}>
        <header className={styles.hero}>
          <div>
            <p className={styles.eyebrow}>Weekly Training Planner</p>
            <h1>Design your week of workouts.</h1>
            <p className={styles.subtitle}>
              Stay consistent with a focused routine, track your completion, and
              keep every session intentional.
            </p>
          </div>

          <section className={styles.metrics}>
            <MetricCard label="Total Workouts" value={stats.totalWorkouts} />
            <MetricCard label="Planned Minutes" value={stats.totalMinutes} />
            <MetricCard label="Completion" value={`${stats.completionRate}%`} />
          </section>

          {stats.dominantFocus ? (
            <p className={styles.focusCallout}>
              Dominant focus this week:{" "}
              <strong>{stats.dominantFocus}</strong>
            </p>
          ) : null}
        </header>

        <nav className={styles.weekSwitcher} aria-label="Select training day">
          {WEEK_DAYS.map((day) => (
            <button
              key={day}
              type="button"
              className={`${styles.dayChip} ${
                day === selectedDay ? styles.dayChipActive : ""
              }`}
              onClick={() => setSelectedDay(day)}
            >
              <span>{day.slice(0, 3)}</span>
              <small>{schedule[day]?.length ?? 0} sessions</small>
            </button>
          ))}
        </nav>

        <section className={styles.scheduleBoard}>
          <header className={styles.boardHeader}>
            <div>
              <h2>{selectedDay}</h2>
              <p>
                {weeklyPlan.length
                  ? "Swipe through the day and stay on track."
                  : "Nothing scheduled yet. Add a session to build momentum."}
              </p>
            </div>

            <div className={styles.boardActions}>
              {weeklyPlan.length ? (
                <button
                  type="button"
                  className={styles.clearButton}
                  onClick={() => handleClearDay(selectedDay)}
                >
                  Clear Day
                </button>
              ) : null}
              <button
                type="button"
                className={styles.addButton}
                onClick={() => {
                  setForm(createFormFromTemplate(workoutTemplates[0]));
                  setIsAdding(true);
                }}
              >
                + Add Session
              </button>
            </div>
          </header>

          <div className={styles.workoutList}>
            {weeklyPlan.length === 0 ? (
              <div className={styles.emptyState}>
                <p>Tap “Add Session” to schedule your next workout.</p>
              </div>
            ) : (
              weeklyPlan.map((workout) => (
                <article
                  key={workout.id}
                  className={`${styles.workoutCard} ${
                    workout.completed ? styles.workoutCompleted : ""
                  }`}
                >
                  <header className={styles.workoutHeader}>
                    <div>
                      <h3>{workout.name}</h3>
                      <p>{getTemplateDescription(workout.templateId)}</p>
                    </div>
                    <span
                      className={`${styles.intensityBadge} ${
                        intensityPalette[workout.intensity]
                      }`}
                    >
                      {workout.intensity}
                    </span>
                  </header>

                  <ul className={styles.workoutMeta}>
                    <li>
                      <strong>{workout.duration}</strong> min
                    </li>
                    <li>{workout.focus}</li>
                    <li>{workout.equipment}</li>
                  </ul>

                  {workout.notes ? (
                    <p className={styles.note}>{workout.notes}</p>
                  ) : null}

                  <footer className={styles.cardActions}>
                    <button
                      type="button"
                      className={styles.secondaryAction}
                      onClick={() => handleDeleteWorkout(selectedDay, workout.id)}
                    >
                      Remove
                    </button>
                    <button
                      type="button"
                      className={styles.primaryAction}
                      onClick={() =>
                        handleToggleComplete(selectedDay, workout.id)
                      }
                    >
                      {workout.completed ? "Mark Incomplete" : "Mark Complete"}
                    </button>
                  </footer>
                </article>
              ))
            )}
          </div>
        </section>
      </main>

      {isAdding ? (
        <div className={styles.dialogOverlay} role="presentation">
          <div className={styles.dialog} role="dialog" aria-modal="true">
            <header className={styles.dialogHeader}>
              <h2>Schedule a session</h2>
              <p>Create or customize a workout for {selectedDay}.</p>
            </header>

            <div className={styles.dialogBody}>
              <label className={styles.field}>
                <span>Template</span>
                <select
                  value={form.templateId}
                  onChange={(event) => handleTemplateChange(event.target.value)}
                >
                  {workoutTemplates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name} · {template.focus}
                    </option>
                  ))}
                </select>
              </label>

              <label className={styles.field}>
                <span>Session name</span>
                <input
                  type="text"
                  placeholder="Use template name or create your own"
                  value={form.name}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, name: event.target.value }))
                  }
                />
              </label>

              <div className={styles.fieldRow}>
                <label className={styles.field}>
                  <span>Focus</span>
                  <select
                    value={form.focus}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        focus: event.target.value as FocusArea,
                      }))
                    }
                  >
                    <option value="Strength">Strength</option>
                    <option value="Cardio">Cardio</option>
                    <option value="Mobility">Mobility</option>
                    <option value="HIIT">HIIT</option>
                    <option value="Core">Core</option>
                    <option value="Recovery">Recovery</option>
                  </select>
                </label>

                <label className={styles.field}>
                  <span>Intensity</span>
                  <select
                    value={form.intensity}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        intensity: event.target.value as IntensityLevel,
                      }))
                    }
                  >
                    <option value="Light">Light</option>
                    <option value="Moderate">Moderate</option>
                    <option value="High">High</option>
                  </select>
                </label>
              </div>

              <label className={styles.field}>
                <span>Duration (minutes)</span>
                <input
                  type="number"
                  min={5}
                  max={120}
                  step={5}
                  value={form.duration}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      duration: Number(event.target.value),
                    }))
                  }
                />
              </label>

              <label className={styles.field}>
                <span>Equipment</span>
                <input
                  type="text"
                  placeholder="Bodyweight, dumbbells, bike..."
                  value={form.equipment}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      equipment: event.target.value,
                    }))
                  }
                />
              </label>

              <label className={styles.field}>
                <span>Notes (optional)</span>
                <textarea
                  placeholder="Add cues, goals, or reminders."
                  value={form.notes}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, notes: event.target.value }))
                  }
                />
              </label>
            </div>

            <footer className={styles.dialogFooter}>
              <button
                type="button"
                className={styles.secondaryAction}
                onClick={() => setIsAdding(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.primaryAction}
                onClick={handleAddWorkout}
              >
                Add to {selectedDay}
              </button>
            </footer>
          </div>
        </div>
      ) : null}
    </div>
  );
}

type MetricCardProps = {
  label: string;
  value: number | string;
};

function MetricCard({ label, value }: MetricCardProps) {
  return (
    <article className={styles.metricCard}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function createFormFromTemplate(template: WorkoutTemplate): FormState {
  return {
    templateId: template.id,
    name: template.name,
    focus: template.focus,
    duration: template.duration,
    intensity: template.intensity,
    equipment: template.equipment,
    notes: "",
  };
}

function getTemplateDescription(templateId: string): string {
  const template = workoutTemplates.find((item) => item.id === templateId);
  return template?.description ?? "Custom session created for your plan.";
}
